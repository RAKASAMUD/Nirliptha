"use client";

import { useEffect, useState } from "react";
import { useAccount, useWriteContract, usePublicClient, useWalletClient } from "wagmi";
import { AUCTION_ABI } from "@/lib/abis";
import { useAuction } from "@/hooks/useAuction";
import { publicDecryptHandle } from "@/lib/nox";
import { StatusBar } from "./StatusBar";
import { AuctionInfoCard } from "./AuctionInfoCard";
import { LiveAllocationTable } from "./LiveAllocationTable";
import { Button } from "./Button";
import { ConnectButton } from "./ConnectButton";
import { Card } from "./Card";

type Props = {
  auctionAddress: `0x${string}`;
};

// The orchestrating client component for a single /issuer/[address] page.
// Consolidated into one file rather than split across many micro-hooks —
// the 5 write flows (finalize, reveal, settle, withdraw, grant/rotate via
// LiveAllocationTable) all share the same wallet state, and
// PLAN-FE-frontend.md doesn't allocate a dedicated hook file for issuer
// write-actions the way it does for useAuction/useDecrypt/useBid.
// Create-auction now lives one level up on the /issuer listing page — this
// component only manages an auction that already exists.
export function IssuerDashboard({ auctionAddress }: Props) {
  const { address, isConnected } = useAccount();
  const [actionStep, setActionStep] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const auction = useAuction(auctionAddress);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Date.now() can't be called during render (react-hooks/purity) — mirrors
  // the ticking-clock pattern already used inside Countdown.tsx. Declared
  // above the early return below so hook order stays stable regardless of
  // connection state (rules-of-hooks).
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  if (!isConnected) {
    return (
      <div className="py-section-gap text-center">
        <p className="mb-8 font-body text-muted">Manage your confidential auctions.</p>
        <ConnectButton />
      </div>
    );
  }

  // AuctionFactory is permissionless — "issuer" is per-auction (auction.issuer),
  // not a single global address anymore.
  const isIssuer = address?.toLowerCase() === auction.issuer.toLowerCase();

  async function runAction(label: string, fn: () => Promise<void>) {
    setActionError(null);
    setActionStep(label);
    try {
      await fn();
      auction.refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionStep(null);
    }
  }

  async function handleFinalize() {
    await runAction("Finalizing...", async () => {
      const hash = await writeContractAsync({
        address: auctionAddress,
        abi: AUCTION_ABI,
        functionName: "finalize",
      });
      await publicClient?.waitForTransactionReceipt({ hash });
    });
  }

  async function handleReveal() {
    await runAction("Revealing clearing price...", async () => {
      if (!walletClient) throw new Error("Connect your wallet first.");
      const clearingPriceHandle = (await publicClient?.readContract({
        address: auctionAddress,
        abi: AUCTION_ABI,
        functionName: "getClearingPriceHandle",
      })) as `0x${string}`;
      // The Nox gateway can take a few seconds to index the handle marked
      // publicly-decryptable by finalize() — retry a few times rather than
      // failing on the first attempt (matches
      // smart-contracts/scripts/e2e-full-sepolia.ts's polling pattern).
      let proof: `0x${string}` | null = null;
      for (let attempt = 0; attempt < 6 && !proof; attempt++) {
        try {
          const result = await publicDecryptHandle(walletClient, clearingPriceHandle);
          proof = result.proof as `0x${string}`;
        } catch {
          await new Promise((r) => setTimeout(r, 10_000));
        }
      }
      if (!proof) throw new Error("Gateway did not index the handle in time — try again.");
      const hash = await writeContractAsync({
        address: auctionAddress,
        abi: AUCTION_ABI,
        functionName: "completeSettlement",
        args: [proof],
      });
      await publicClient?.waitForTransactionReceipt({ hash });
    });
  }

  async function handleWithdraw() {
    await runAction("Withdrawing to Safe...", async () => {
      const hash = await writeContractAsync({
        address: auctionAddress,
        abi: AUCTION_ABI,
        functionName: "withdrawToSafe",
      });
      await publicClient?.waitForTransactionReceipt({ hash });
    });
  }

  const deadlinePassed = Number(auction.deadline) > 0 && now > Number(auction.deadline);

  return (
    <>
      {!isIssuer ? (
        <Card className="mb-8 border-oxblood/40 p-6">
          <p className="font-body text-sm text-oxblood">
            This wallet is not this auction&apos;s issuer. Connect with the wallet that created it to
            manage it.
          </p>
        </Card>
      ) : null}

      <section className="mb-16">
        <StatusBar current={auction.status} />
      </section>

      <section className="mb-section-gap">
        <AuctionInfoCard auction={auction} layout="issuer" />

        {isIssuer && auction.status === 1 ? (
          <div className="mt-8 flex justify-end">
            <Button
              variant="primary"
              disabled={!deadlinePassed || actionStep !== null}
              onClick={handleFinalize}
            >
              {actionStep ?? (deadlinePassed ? "Finalize" : "Available after the deadline")}
            </Button>
          </div>
        ) : null}

        {isIssuer && auction.status === 2 ? (
          <div className="mt-8 flex justify-end">
            <Button variant="primary" disabled={actionStep !== null} onClick={handleReveal}>
              {actionStep ?? "Reveal and complete settlement"}
            </Button>
          </div>
        ) : null}

        {isIssuer && auction.status === 3 ? (
          <div className="mt-8 flex justify-end">
            <Button variant="primary" disabled={actionStep !== null} onClick={handleWithdraw}>
              {actionStep ?? "Withdraw to Safe"}
            </Button>
          </div>
        ) : null}

        {actionError ? <p className="mt-4 font-mono text-xs text-oxblood">{actionError}</p> : null}
      </section>

      {auction.status === 3 ? (
        <section>
          <LiveAllocationTable auctionAddress={auctionAddress} bidders={auction.bidders} />
        </section>
      ) : null}
    </>
  );
}
