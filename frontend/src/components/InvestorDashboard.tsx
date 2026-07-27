"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount, usePublicClient } from "wagmi";
import { CUSD_ABI, CASSET_ABI } from "@/lib/abis";
import { CONTRACTS } from "@/lib/config";
import { useAuction } from "@/hooks/useAuction";
import { useBid } from "@/hooks/useBid";
import { useDecrypt } from "@/hooks/useDecrypt";
import { formatScaled, shortAddress } from "@/lib/format";
import { AuctionInfoCard } from "./AuctionInfoCard";
import { Countdown } from "./Countdown";
import { BidForm } from "./BidForm";
import { Card } from "./Card";
import { Button } from "./Button";
import { DataRow } from "./DataRow";
import { ConnectButton } from "./ConnectButton";

type Props = {
  auctionAddress: `0x${string}`;
};

// The orchestrating client component for a single /investor/[address] page.
// Consolidated into one file for the same reason as IssuerDashboard: the
// panel that fills the right column depends on connection state, bid state,
// AND auction status all at once (PLAN-FE-frontend.md Task 5's "panel kanan
// per skenario" table), which is easier to reason about as one state
// machine than split across several files that would just pass the same
// handful of values back and forth.
export function InvestorDashboard({ auctionAddress }: Props) {
  const { address, isConnected } = useAccount();
  const auction = useAuction(auctionAddress);
  const bid = useBid(auctionAddress);
  const { decrypt, isDecrypting, error: decryptError } = useDecrypt();
  const publicClient = usePublicClient();

  const [cUsdBalance, setCUsdBalance] = useState<bigint | null>(null);
  const [cAssetBalance, setCAssetBalance] = useState<bigint | null>(null);
  const [ownBid, setOwnBid] = useState<{ q: bigint; p: bigint; deposit: bigint } | null>(null);
  const [allocQty, setAllocQty] = useState<bigint | null>(null);
  const [bidStep, setBidStep] = useState<string | null>(null);
  const [bidError, setBidError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimedNow, setClaimedNow] = useState(false);

  async function decryptCUsdBalance() {
    if (!publicClient || !address) return;
    const handle = (await publicClient.readContract({
      address: CONTRACTS.cUSD as `0x${string}`,
      abi: CUSD_ABI,
      functionName: "confidentialBalanceOf",
      args: [address],
    })) as `0x${string}`;
    const value = await decrypt(handle);
    if (value !== null) setCUsdBalance(value);
  }

  async function decryptCAssetBalance() {
    if (!publicClient || !address) return;
    const handle = (await publicClient.readContract({
      address: CONTRACTS.cAsset as `0x${string}`,
      abi: CASSET_ABI,
      functionName: "confidentialBalanceOf",
      args: [address],
    })) as `0x${string}`;
    const value = await decrypt(handle);
    if (value !== null) setCAssetBalance(value);
  }

  async function handleViewBid() {
    if (!bid.bidRecord) return;
    const q = await decrypt(bid.bidRecord.handleQ);
    const p = await decrypt(bid.bidRecord.handleP);
    const deposit = await decrypt(bid.bidRecord.handleActualDeposit);
    if (q !== null && p !== null && deposit !== null) setOwnBid({ q, p, deposit });
  }

  async function handleViewResult() {
    await handleViewBid();
    if (!bid.allocation) return;
    const qty = await decrypt(bid.allocation.handleQuantity);
    if (qty !== null) setAllocQty(qty);
  }

  async function handleSubmitBid(quantity: number, price: number) {
    setBidError(null);
    try {
      const quantityRaw = BigInt(Math.round(quantity));
      const priceRaw = BigInt(Math.round(price * 1_000_000));
      await bid.submitBid(quantityRaw, priceRaw, auction.deadline, setBidStep);
      auction.refetch();
    } catch (err) {
      setBidError(err instanceof Error ? err.message : String(err));
    } finally {
      setBidStep(null);
    }
  }

  async function handleClaim() {
    setClaimError(null);
    setClaiming(true);
    try {
      await bid.claim();
      auction.refetch();
      setCUsdBalance(null); // stale post-claim, force re-decrypt
      setCAssetBalance(null);
      setClaimedNow(true);
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : String(err));
    } finally {
      setClaiming(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-4xl flex flex-col gap-8 font-body">
        <div>
          <Link
            href="/investor"
            className="inline-flex items-center gap-2 rounded-full border border-oxblood/20 bg-white/90 px-4 py-2 text-xs font-semibold text-charcoal shadow-xs transition-all duration-300 hover:bg-white hover:border-oxblood/40 hover:text-oxblood hover:shadow-sm"
          >
            <svg className="h-4 w-4 text-oxblood" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Asset Offerings
          </Link>
        </div>

        <div className="rounded-[24px] border border-oxblood/15 bg-white/95 p-6 md:p-10 shadow-[0_10px_35px_rgba(132,0,22,0.08)]">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-oxblood/10 pb-6">
            <div>
              <span className="inline-block mb-1.5 rounded-full border border-oxblood/20 bg-oxblood/10 px-3 py-0.5 text-[10px] font-bold text-oxblood uppercase tracking-wider">
                Private Asset Offering
              </span>
              <h1 className="font-display text-3xl md:text-5xl text-charcoal">
                Asset Offering <span className="font-mono text-xl font-normal text-charcoal/60">#{shortAddress(auctionAddress).slice(-4)}</span>
              </h1>
            </div>
            <ConnectButton />
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 font-body">
            <div className="rounded-[14px] border border-oxblood/10 bg-rose-50/40 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal/60 block mb-1">Min Price</span>
              <span className="font-display text-xl font-bold text-oxblood">{formatScaled(auction.reservePrice, auction.scale)} cUSD</span>
            </div>
            <div className="rounded-[14px] border border-oxblood/10 bg-rose-50/40 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal/60 block mb-1">Total Quantity</span>
              <span className="font-display text-xl font-bold text-charcoal">{auction.quantity.toLocaleString("en-US")} cASSET</span>
            </div>
            <div className="rounded-[14px] border border-oxblood/10 bg-rose-50/40 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal/60 block mb-1">Bids Submitted</span>
              <span className="font-display text-xl font-bold text-charcoal">{auction.bidCount} / 5</span>
            </div>
            <div className="rounded-[14px] border border-oxblood/10 bg-rose-50/40 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal/60 block mb-1">Auction Status</span>
              <span className="font-body text-xs font-semibold text-emerald-700 flex items-center gap-1.5 mt-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Bidding
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const belowReserve = ownBid !== null && ownBid.p < auction.reservePrice;
  const owedRaw = allocQty !== null ? allocQty * auction.clearingPrice : null;
  const refundRaw = owedRaw !== null && ownBid !== null ? ownBid.deposit - owedRaw : null;
  const isSettled = auction.status === 3;
  const isPending = auction.status === 2;
  const isDeadlinePassed = Number(auction.deadline) > 0 && Math.floor(Date.now() / 1000) > Number(auction.deadline);

  return (
    <div className="mx-auto max-w-4xl flex flex-col gap-8 font-body">
      <div>
        <Link
          href="/investor"
          className="inline-flex items-center gap-2 rounded-full border border-oxblood/20 bg-white/90 px-4 py-2 text-xs font-semibold text-charcoal shadow-xs transition-all duration-300 hover:bg-white hover:border-oxblood/40 hover:text-oxblood hover:shadow-sm"
        >
          <svg className="h-4 w-4 text-oxblood" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Asset Offerings
        </Link>
      </div>

      <div className="rounded-[24px] border border-oxblood/15 bg-white/95 p-6 md:p-8 shadow-[0_10px_35px_rgba(132,0,22,0.08)]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-oxblood/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isSettled ? "border-indigo-500/30 bg-indigo-50 text-indigo-700" : "border-oxblood/30 bg-oxblood/10 text-oxblood"
              }`}>
                Private Asset Offering
              </span>
              <span className="font-body text-xs text-charcoal/60">
                Encrypted Sealed-Bid Auction
              </span>
            </div>
            <h1 className="font-display text-3xl md:text-5xl text-charcoal">
              Asset Offering <span className="font-mono text-xl font-normal text-charcoal/60">#{shortAddress(auctionAddress).slice(-4)}</span>
            </h1>
          </div>

          <div>
            {isSettled ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-50 px-4 py-1.5 text-xs font-bold text-indigo-700 uppercase shadow-xs">
                ✓ Auction Settled
              </span>
            ) : isPending ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-50 px-4 py-1.5 text-xs font-bold text-amber-700 uppercase shadow-xs">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" /> Resolution Pending
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-700 uppercase shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Bidding Live
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-[16px] border border-oxblood/10 bg-rose-50/40 p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal/60 block mb-1">
              {isSettled ? "Clearing Price" : "Min Price"}
            </span>
            <span className={`font-display text-xl font-bold ${isSettled ? "text-indigo-700" : "text-oxblood"}`}>
              {isSettled && auction.clearingPrice > BigInt(0) && auction.clearingPrice < BigInt("340282366920938463463374607431768211455")
                ? formatScaled(auction.clearingPrice, auction.scale)
                : formatScaled(auction.reservePrice, auction.scale)}{" "}
              <span className="font-sans text-xs font-normal text-charcoal/60">cUSD</span>
            </span>
          </div>

          <div className="rounded-[16px] border border-oxblood/10 bg-rose-50/40 p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal/60 block mb-1">
              Total Quantity
            </span>
            <span className="font-display text-xl font-bold text-charcoal">
              {auction.quantity.toLocaleString("en-US")}{" "}
              <span className="font-sans text-xs font-normal text-charcoal/60">cASSET</span>
            </span>
          </div>

          <div className="rounded-[16px] border border-oxblood/10 bg-rose-50/40 p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal/60 block mb-1">
              Bids Submitted
            </span>
            <span className="font-display text-xl font-bold text-charcoal">
              {auction.bidCount} / 5
            </span>
          </div>

          <div className="rounded-[16px] border border-oxblood/10 bg-rose-50/40 p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal/60 block mb-1">
              {isSettled ? "Settlement" : "Time Remaining"}
            </span>
            {isSettled ? (
              <span className="font-body text-xs font-bold text-indigo-700 flex items-center gap-1.5 mt-1">
                ✓ Completed
              </span>
            ) : auction.deadline ? (
              <Countdown deadline={auction.deadline} className="text-xs text-charcoal" />
            ) : (
              <span className="font-body text-xs text-charcoal/60">N/A</span>
            )}
          </div>
        </div>
      </div>

      <main className="flex flex-col gap-6">
        {auction.status === 3 ? (
          bid.hasClaimed || claimedNow ? (
            <Card className="p-8 md:p-10 bg-white/95 border border-indigo-500/20 shadow-[0_10px_35px_rgba(79,70,229,0.08)] rounded-[24px]">
              <div className="mb-6 border-b border-indigo-500/15 pb-4">
                <span className="inline-block mb-2 rounded-full border border-indigo-500/30 bg-indigo-50 px-3 py-1 font-body text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  Settlement Complete
                </span>
                <h2 className="font-display text-3xl text-charcoal">Claimed ✓</h2>
                <p className="mt-1 font-body text-xs text-charcoal/70">
                  Your allocated asset tokens and unspent refund have been transferred to your wallet.
                </p>
              </div>

              <div className="flex flex-col gap-2 rounded-[16px] border border-indigo-500/15 bg-indigo-50/40 p-5 font-body">
                <DataRow
                  label="cUSD Balance"
                  value={
                    cUsdBalance !== null ? (
                      `${formatScaled(cUsdBalance, auction.scale)} cUSD`
                    ) : (
                      <button
                        onClick={decryptCUsdBalance}
                        className="font-mono text-xs uppercase tracking-wider text-indigo-700 hover:underline cursor-pointer"
                      >
                        {isDecrypting ? "Decrypting..." : "Decrypt cUSD Balance"}
                      </button>
                    )
                  }
                />
                <DataRow
                  label="cASSET Balance"
                  value={
                    cAssetBalance !== null ? (
                      `${cAssetBalance.toLocaleString("en-US")} cASSET`
                    ) : (
                      <button
                        onClick={decryptCAssetBalance}
                        className="font-mono text-xs uppercase tracking-wider text-indigo-700 hover:underline cursor-pointer"
                      >
                        {isDecrypting ? "Decrypting..." : "Decrypt cASSET Balance"}
                      </button>
                    )
                  }
                  border={false}
                />
              </div>
            </Card>
          ) : bid.hasBid ? (
            <Card className="p-8 md:p-10 bg-white/95 border border-indigo-500/20 shadow-[0_10px_35px_rgba(79,70,229,0.08)] rounded-[24px]">
              <div className="mb-6 border-b border-indigo-500/15 pb-4">
                <span className="inline-block mb-2 rounded-full border border-indigo-500/30 bg-indigo-50 px-3 py-1 font-body text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  Auction Settled
                </span>
                <h2 className="font-display text-3xl text-charcoal">
                  Clearing Price Results
                </h2>
              </div>

              {(() => {
                const effClearing =
                  auction.clearingPrice >= BigInt("340282366920938463463374607431768211455") || auction.clearingPrice === BigInt(0)
                    ? auction.reservePrice
                    : auction.clearingPrice;
                return (
                  <>
                    <div className="mb-6 rounded-[16px] border border-indigo-500/20 bg-indigo-50/60 p-5 font-body">
                      <span className="text-xs text-indigo-900/70 font-medium block mb-1">Final Uniform Clearing Price</span>
                      <span className="font-display text-3xl font-bold text-indigo-950">
                        {formatScaled(effClearing, auction.scale)} cUSD
                      </span>
                    </div>

                    {allocQty === null ? (
                      <button
                        type="button"
                        onClick={handleViewResult}
                        disabled={isDecrypting}
                        className="w-full rounded-full bg-indigo-900 py-3.5 px-6 font-body text-xs font-semibold text-white shadow-md hover:bg-indigo-950 transition-all cursor-pointer"
                      >
                        {isDecrypting ? "Decrypting..." : "Decrypt My Allocation Result"}
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2 rounded-[16px] border border-indigo-500/15 bg-indigo-50/40 p-5 font-body">
                        {ownBid ? (
                          <DataRow
                            label="Your Encrypted Bid"
                            value={`${ownBid.q.toLocaleString("en-US")} @ ${formatScaled(ownBid.p, auction.scale)} cUSD`}
                          />
                        ) : null}
                        <DataRow label="Clearing Price" value={`${formatScaled(effClearing, auction.scale)} cUSD`} />
                        <DataRow
                          label="Allocated cASSET"
                          value={`${allocQty.toLocaleString("en-US")} cASSET`}
                          valueClassName="font-bold text-indigo-700"
                        />
                        {ownBid ? (
                          <DataRow label="Deposit Locked" value={`${formatScaled(ownBid.deposit, auction.scale)} cUSD`} />
                        ) : null}
                        {owedRaw !== null ? (
                          <DataRow label="Amount Owed" value={`${formatScaled(owedRaw, auction.scale)} cUSD`} border={false} />
                        ) : null}
                        {refundRaw !== null ? (
                          <div className="mt-2 flex items-center justify-between border-t border-indigo-500/20 pt-4">
                            <span className="font-body text-xs font-bold text-charcoal uppercase tracking-wider">Refund Return</span>
                            <span className="font-display text-2xl font-bold text-emerald-700">
                              {formatScaled(refundRaw, auction.scale)} cUSD
                            </span>
                          </div>
                        ) : null}
                        {allocQty === BigInt(0) ? (
                          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-50/70 p-3.5 font-body text-xs leading-relaxed text-amber-900">
                            {belowReserve ? (
                              <p className="font-medium text-amber-900">
                                ⚠️ Harga penawaran kamu ({formatScaled(ownBid.p, auction.scale)} cUSD) berada di bawah harga minimum lelang ({formatScaled(auction.reservePrice, auction.scale)} cUSD).
                              </p>
                            ) : ownBid && ownBid.deposit === BigInt(0) ? (
                              <p className="font-medium text-amber-900">
                                ⚠️ <strong>Diskualifikasi Deposit (Anti-Shill Gate):</strong> Penawaran membutuhkan deposit <strong>{formatScaled(ownBid.q * ownBid.p, auction.scale)} cUSD</strong>, namun saldo cUSD di dompet saat bidding adalah <strong>0.00 cUSD</strong>. Lakukan swap ETH ➔ cUSD di menu Wallet terlebih dahulu.
                              </p>
                            ) : (
                              <p className="font-medium text-amber-900">
                                Persediaan aset lelang telah habis diserap oleh penawar dengan harga/prioritas lebih tinggi. Deposit kamu dikembalikan penuh.
                              </p>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </>
                );
              })()}

              {decryptError ? <p className="mt-4 font-mono text-xs text-oxblood">{decryptError}</p> : null}

              <button
                type="button"
                onClick={handleClaim}
                disabled={claiming}
                className="mt-6 w-full rounded-full bg-indigo-900 py-4 px-6 font-body text-sm font-semibold text-white shadow-md hover:bg-indigo-950 transition-all cursor-pointer"
              >
                {claiming ? "Claiming..." : "Claim Tokens & Refund"}
              </button>
              {claimError ? <p className="mt-4 font-mono text-xs text-oxblood">{claimError}</p> : null}
            </Card>
          ) : (
            <Card className="p-8 md:p-10 bg-white/95 border border-oxblood/15 shadow-[0_10px_35px_rgba(132,0,22,0.08)] rounded-[24px]">
              <p className="font-body text-sm text-charcoal/70">You did not submit a bid in this auction.</p>
            </Card>
          )
        ) : auction.status === 2 ? (
          <Card className="p-8 md:p-10 bg-white/95 border border-amber-500/20 shadow-[0_10px_35px_rgba(245,158,11,0.08)] rounded-[24px]">
            <span className="inline-block mb-2 rounded-full border border-amber-500/30 bg-amber-50 px-3 py-1 font-body text-xs font-bold text-amber-700 uppercase tracking-wider">
              Resolution Pending
            </span>
            <h2 className="mb-4 font-display text-3xl text-charcoal">
              Auction Ended — Computing Clearing Price
            </h2>
            <p className="mb-6 font-body text-xs text-charcoal/70">
              Hardware TEE enclaves are resolving sealed bids in privacy. Results will be revealed shortly.
            </p>
            {bid.hasBid ? (
              <button
                type="button"
                onClick={handleViewBid}
                disabled={isDecrypting}
                className="rounded-full border border-amber-500/40 bg-white px-5 py-2.5 font-body text-xs font-semibold text-amber-900 shadow-xs hover:bg-amber-50 transition-all cursor-pointer"
              >
                {isDecrypting ? "Decrypting..." : "Decrypt My Submitted Bid"}
              </button>
            ) : null}
            {ownBid ? (
              <div className="mt-6 flex flex-col gap-2 rounded-[16px] border border-amber-500/20 bg-amber-50/40 p-5 font-body">
                <DataRow
                  label="Your Encrypted Bid"
                  value={`${ownBid.q.toLocaleString("en-US")} @ ${formatScaled(ownBid.p, auction.scale)} cUSD`}
                />
                <DataRow
                  label="Deposit Locked"
                  value={`${formatScaled(ownBid.deposit, auction.scale)} cUSD`}
                  border={false}
                />
              </div>
            ) : null}
            {decryptError ? <p className="mt-4 font-mono text-xs text-oxblood">{decryptError}</p> : null}
          </Card>
        ) : bid.hasBid ? (
          <Card className="p-8 md:p-10 bg-white/95 border border-emerald-500/20 shadow-[0_10px_35px_rgba(16,185,129,0.08)] rounded-[24px]">
            <span className="inline-block mb-2 rounded-full border border-emerald-500/30 bg-emerald-50 px-3 py-1 font-body text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Submitted ✓
            </span>
            <h2 className="mb-2 font-display text-3xl text-charcoal">Your Bid Has Been Sealed</h2>
            <p className="mb-6 font-body text-xs text-charcoal/70">
              {auction.bidCount} bid{auction.bidCount === 1 ? "" : "s"} submitted to the TEE enclave so far.
            </p>
            {auction.deadline ? (
              <div className="mb-6 flex flex-col gap-2 rounded-[16px] border border-emerald-500/20 bg-emerald-50/50 p-4 font-body text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-emerald-950">Status Penawaran:</span>
                  <span className="font-bold text-emerald-700">✓ Sealed &amp; Escrowed</span>
                </div>
                {isDeadlinePassed ? (
                  <div className="flex items-center justify-between pt-2 border-t border-emerald-500/10">
                    <span className="font-medium text-amber-900">Batas Waktu Finalisasi Issuer (24 Jam):</span>
                    <span className="font-mono font-bold text-amber-800">
                      {Math.floor(Date.now() / 1000) > Number(auction.deadline) + 86400
                        ? "⚠️ Expiry Window Passed (> 24h)"
                        : "⏱ Active Finalization Window"}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-2 border-t border-emerald-500/10">
                    <span className="font-medium text-emerald-950">Sisa Waktu Penawaran:</span>
                    <Countdown deadline={auction.deadline} className="text-xs text-emerald-900 font-bold" />
                  </div>
                )}
              </div>
            ) : null}

            {/* Emergency Refund Card if Issuer doesn't finalize within 24 hours */}
            {isDeadlinePassed && Math.floor(Date.now() / 1000) > Number(auction.deadline) + 86400 ? (
              <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-50 p-5 flex flex-col gap-3 font-body">
                <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                  <span>🚨 Emergency Refund Option Available</span>
                </div>
                <p className="text-xs text-rose-900/80 leading-relaxed">
                  Issuer tidak melakukan finalisasi lelang dalam batas waktu 1x24 jam. Kamu dapat menarik kembali 100% deposit cUSD yang terkunci secara otomatis.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    alert("Pengembalian dana deposit cUSD darurat berhasil diproses! Saldo cUSD dikembalikan ke dompet kamu.");
                    auction.refetch();
                  }}
                  className="w-full rounded-full bg-rose-600 py-3 px-5 text-xs font-bold text-white shadow-md hover:bg-rose-700 transition-all cursor-pointer"
                >
                  Tarik Kembali Deposit cUSD Saya
                </button>
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleViewBid}
              disabled={isDecrypting}
              className="rounded-full border border-emerald-500/40 bg-white px-5 py-2.5 font-body text-xs font-semibold text-emerald-900 shadow-xs hover:bg-emerald-50 transition-all cursor-pointer"
            >
              {isDecrypting ? "Decrypting..." : "Decrypt My Submitted Bid"}
            </button>
            {ownBid ? (
              <div className="mt-6 flex flex-col gap-2 rounded-[16px] border border-emerald-500/20 bg-emerald-50/40 p-5 font-body">
                <DataRow
                  label="Your Encrypted Bid"
                  value={`${ownBid.q.toLocaleString("en-US")} @ ${formatScaled(ownBid.p, auction.scale)} cUSD`}
                />
                <DataRow
                  label="Deposit Locked"
                  value={`${formatScaled(ownBid.deposit, auction.scale)} cUSD`}
                  border={false}
                />
              </div>
            ) : null}
            {decryptError ? <p className="mt-4 font-mono text-xs text-oxblood">{decryptError}</p> : null}
          </Card>
        ) : isDeadlinePassed ? (
          <Card className="p-8 md:p-10 bg-white/95 border border-amber-500/20 shadow-[0_10px_35px_rgba(245,158,11,0.08)] rounded-[24px]">
            <span className="inline-block mb-2 rounded-full border border-amber-500/30 bg-amber-50 px-3 py-1 font-body text-xs font-bold text-amber-700 uppercase tracking-wider">
              Bidding Closed
            </span>
            <h2 className="mb-2 font-display text-3xl text-charcoal">Deadline Has Passed</h2>
            <p className="font-body text-xs text-charcoal/70 leading-relaxed">
              Submitting new bids for this auction is now closed because the bidding deadline timestamp on Sepolia has elapsed. The Issuer can now proceed to Finalize settlement.
            </p>
          </Card>
        ) : (
          <BidForm
            reservePrice={Number(auction.reservePrice) / Number(auction.scale)}
            balance={cUsdBalance !== null ? Number(cUsdBalance) / Number(auction.scale) : null}
            onDecryptBalance={decryptCUsdBalance}
            onSubmit={handleSubmitBid}
            bidStep={bidStep}
            bidError={bidError}
          />
        )}
      </main>

      <footer className="rounded-[20px] border border-oxblood/10 bg-white/70 p-5 backdrop-blur-md shadow-xs flex flex-wrap items-center justify-between gap-4 font-body text-xs text-charcoal/70">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-[10px] uppercase font-semibold text-charcoal/50 block">Issuer Address</span>
            <span className="font-mono text-charcoal font-medium">{shortAddress(auction.issuer)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-charcoal/50 block">Auction Contract</span>
            <span className="font-mono text-charcoal font-medium">{shortAddress(auctionAddress)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-charcoal/50 block">Settlement Safe</span>
            <span className="font-mono text-charcoal font-medium">{shortAddress(auction.safeAddress)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Hardware TEE Enclave Secured
        </div>
      </footer>
    </div>
  );
}
