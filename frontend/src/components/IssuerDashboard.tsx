"use client";

import { useEffect, useState } from "react";
import { useAccount, useWriteContract, usePublicClient, useWalletClient } from "wagmi";
import { AUCTION_ABI } from "@/lib/abis";
import { CONTRACTS, ISSUER_ADDRESS } from "@/lib/config";
import { useAuction } from "@/hooks/useAuction";
import { publicDecryptHandle } from "@/lib/nox";
import { StatusBar } from "./StatusBar";
import { AuctionInfoCard } from "./AuctionInfoCard";
import { LiveAllocationTable } from "./LiveAllocationTable";
import { CreateAuctionForm } from "./CreateAuctionForm";
import { Button } from "./Button";
import { ConnectButton } from "./ConnectButton";
import { Card } from "./Card";

// The orchestrating client component for /issuer. Consolidated into one
// file rather than split across many micro-hooks — the 6+ write flows
// (create, escrow, finalize, reveal, settle, withdraw, grant, rotate) all
// share the same `auctionAddress`/wallet state, and PLAN-FE-frontend.md
// doesn't allocate a dedicated hook file for issuer write-actions the way
// it does for useAuction/useDecrypt/useBid.
export function IssuerDashboard() {
  const { address, isConnected } = useAccount();
  const [auctionAddress, setAuctionAddress] = useState<`0x${string}`>(
    CONTRACTS.demoAuction as `0x${string}`
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
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

  const isIssuer = address?.toLowerCase() === ISSUER_ADDRESS.toLowerCase();

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
            This wallet is not the issuer. Connect with the issuer wallet to manage auctions.
          </p>
        </Card>
      ) : null}

      <div className="mb-8 flex justify-end">
        <Button variant="outline" onClick={() => setShowCreateForm((v) => !v)}>
          {showCreateForm ? "Cancel" : "Create new auction"}
        </Button>
      </div>

      {showCreateForm ? (
        <div className="mb-section-gap">
          <CreateAuctionForm
            onCreated={(addr) => {
              setAuctionAddress(addr);
              setShowCreateForm(false);
            }}
          />
        </div>
      ) : (
        <>
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
      )}
    </>
  );
}
