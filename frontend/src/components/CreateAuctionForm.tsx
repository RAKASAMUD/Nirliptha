"use client";

import { useState } from "react";
import { useWriteContract, usePublicClient, useWalletClient } from "wagmi";
import { AUCTIONFACTORY_ABI, CASSET_ABI, AUCTION_ABI } from "@/lib/abis";
import { CONTRACTS } from "@/lib/config";
import { encryptUint } from "@/lib/nox";
import { Card } from "./Card";
import { Button } from "./Button";

type Props = {
  onCreated: (auctionAddress: `0x${string}`) => void;
};

const DURATIONS = [
  { label: "30 min", seconds: 30 * 60 },
  { label: "1 hour", seconds: 60 * 60 },
  { label: "2 hours", seconds: 2 * 60 * 60 },
];

// Create + escrow flow per PLAN-FE-frontend.md Task 4 Steps 3-4, mirroring
// the exact sequence proven in smart-contracts/scripts/e2e-full-sepolia.ts:
// createAuction() -> read the new instance address back off the Factory ->
// encrypt quantity again for the escrow transfer -> confidentialTransfer ->
// confirmEscrow(). Two separate encryptInput calls for the same quantity
// are intentional (matching the reference script) — the value is the same,
// but each encrypted handle is scoped to a different applicationContract
// (the Factory doesn't need the escrow handle, the Auction instance does).
export function CreateAuctionForm({ onCreated }: Props) {
  const [quantity, setQuantity] = useState("100000");
  const [reservePrice, setReservePrice] = useState("1.00");
  const [duration, setDuration] = useState(DURATIONS[0].seconds);
  const [safeAddress, setSafeAddress] = useState<string>(CONTRACTS.safe);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const canSubmit = Number(quantity) > 0 && Number(reservePrice) > 0 && /^0x[a-fA-F0-9]{40}$/.test(safeAddress);

  async function handleSubmit() {
    if (!walletClient || !publicClient) {
      setError("Connect your wallet first.");
      return;
    }
    setError(null);
    try {
      const quantityRaw = BigInt(Math.round(Number(quantity)));
      // Auction.sol's reservePrice is in SCALE=1_000_000 fixed-point units,
      // not token decimals — see hooks/useAuction.ts for why.
      const reservePriceRaw = BigInt(Math.round(Number(reservePrice) * 1_000_000));
      const block = await publicClient.getBlock();
      const deadline = block.timestamp + BigInt(duration);

      setStep("Creating auction...");
      const createTx = await writeContractAsync({
        address: CONTRACTS.factory as `0x${string}`,
        abi: AUCTIONFACTORY_ABI,
        functionName: "createAuction",
        args: [quantityRaw, reservePriceRaw, deadline, safeAddress as `0x${string}`],
      });
      await publicClient.waitForTransactionReceipt({ hash: createTx });

      const count = (await publicClient.readContract({
        address: CONTRACTS.factory as `0x${string}`,
        abi: AUCTIONFACTORY_ABI,
        functionName: "auctionCount",
      })) as bigint;
      const auctionAddress = (await publicClient.readContract({
        address: CONTRACTS.factory as `0x${string}`,
        abi: AUCTIONFACTORY_ABI,
        functionName: "auctions",
        args: [count - BigInt(1)],
      })) as `0x${string}`;

      setStep("Encrypting escrow amount...");
      const { handle, handleProof } = await encryptUint(walletClient, quantityRaw, CONTRACTS.cAsset as `0x${string}`);

      setStep("Transferring cAsset to escrow...");
      const transferTx = await writeContractAsync({
        address: CONTRACTS.cAsset as `0x${string}`,
        abi: CASSET_ABI,
        functionName: "confidentialTransfer",
        args: [auctionAddress, handle, handleProof],
      });
      await publicClient.waitForTransactionReceipt({ hash: transferTx });

      setStep("Confirming escrow...");
      const confirmTx = await writeContractAsync({
        address: auctionAddress,
        abi: AUCTION_ABI,
        functionName: "confirmEscrow",
      });
      await publicClient.waitForTransactionReceipt({ hash: confirmTx });

      setStep(null);
      onCreated(auctionAddress);
    } catch (err) {
      setStep(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Card className="p-8 md:p-10">
      <h3 className="mb-6 font-display text-2xl text-parchment">Create auction</h3>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted">Quantity (cASSET)</span>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="rounded-[4px] bg-charcoal p-4 font-mono text-parchment focus:ring-1 focus:ring-oxblood focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted">Reserve price (cUSD)</span>
          <input
            type="number"
            step="0.01"
            value={reservePrice}
            onChange={(e) => setReservePrice(e.target.value)}
            className="rounded-[4px] bg-charcoal p-4 font-mono text-parchment focus:ring-1 focus:ring-oxblood focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted">Duration</span>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="rounded-[4px] bg-charcoal p-4 font-mono text-parchment focus:ring-1 focus:ring-oxblood focus:outline-none"
          >
            {DURATIONS.map((d) => (
              <option key={d.seconds} value={d.seconds}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted">Safe address</span>
          <input
            value={safeAddress}
            onChange={(e) => setSafeAddress(e.target.value)}
            className="rounded-[4px] bg-charcoal p-4 font-mono text-sm text-parchment focus:ring-1 focus:ring-oxblood focus:outline-none"
          />
        </label>
      </div>

      <Button
        variant="primary"
        disabled={!canSubmit || step !== null}
        onClick={handleSubmit}
        className="mt-8 w-full"
      >
        {step ?? "Create auction"}
      </Button>
      {error ? <p className="mt-4 font-mono text-xs text-oxblood">{error}</p> : null}
    </Card>
  );
}
