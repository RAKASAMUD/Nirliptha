"use client";

import { useState } from "react";
import { Card } from "./Card";
import { formatScaled, shortAddress, etherscanTx } from "@/lib/format";

type Props = {
  auctionAddress: `0x${string}`;
  safeAddress: `0x${string}`;
  isIssuer: boolean;
  onWithdraw: () => Promise<`0x${string}` | void>;
  isLoading: boolean;
  error: string | null;
  clearingPrice: bigint;
  reservePrice: bigint;
  quantity: bigint;
  scale: bigint;
};

type PayoutRecord = {
  id: string;
  txHash?: `0x${string}`;
  timestamp: string;
  destination: string;
  status: "completed" | "pending";
};

export function TreasuryPayoutCard({
  auctionAddress,
  safeAddress,
  isIssuer,
  onWithdraw,
  isLoading,
  error,
  clearingPrice,
  reservePrice,
  quantity,
  scale,
}: Props) {
  const storageKey = `withdrawn_${auctionAddress?.toLowerCase()}`;

  const [hasWithdrawn, setHasWithdrawn] = useState<boolean>(() => {
    if (typeof window !== "undefined" && auctionAddress) {
      return localStorage.getItem(storageKey) === "true";
    }
    return false;
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | null>(null);
  const [payoutHistory, setPayoutHistory] = useState<PayoutRecord[]>([]);

  const effectivePrice =
    clearingPrice >= BigInt("340282366920938463463374607431768211455") || clearingPrice === BigInt(0)
      ? reservePrice
      : clearingPrice;

  const totalProceedsRaw = quantity * effectivePrice;
  const estimatedProceeds = formatScaled(totalProceedsRaw, scale);

  async function handleExecuteWithdraw() {
    setShowConfirmModal(false);
    try {
      const realTxHash = await onWithdraw();
      setHasWithdrawn(true);
      if (typeof window !== "undefined" && auctionAddress) {
        localStorage.setItem(storageKey, "true");
      }
      if (realTxHash && realTxHash !== "0x") {
        setLastTxHash(realTxHash);
        setPayoutHistory((prev) => [
          {
            id: String(Date.now()),
            txHash: realTxHash,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            destination: safeAddress,
            status: "completed",
          },
          ...prev,
        ]);
      }
      // Removed local mock balance increment. Users must re-decrypt their on-chain balance.

      setShowSuccessModal(true);
    } catch {
      // Error handled by parent
    }
  }

  return (
    <Card className="p-8 md:p-10 shadow-2xl rounded-[20px] mb-section-gap border border-white/10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6 pb-6 border-b border-hairline-strong">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-muted/70">
              Issuer Treasury &amp; Payouts
            </span>
            {hasWithdrawn ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-0.5 font-body text-[11px] font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Safe Treasury Up-to-Date
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-0.5 font-body text-[11px] font-semibold text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Proceeds Available for Payout
              </span>
            )}
          </div>
          <h3 className="font-display text-2xl md:text-3xl text-parchment">
            Settlement Proceeds Transfer
          </h3>
          <p className="mt-1 font-body text-xs text-muted leading-relaxed max-w-xl">
            Auction proceeds are held in non-custodial smart contract escrow. As investors claim allocations &amp; refunds, funds can be transferred to your Safe treasury.
          </p>
        </div>
      </div>

      {/* Metrics Grid with Withdrawable Balance */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-8">
        <div className="rounded-[14px] border border-emerald-500/30 bg-emerald-500/10 p-4 font-body">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
            Withdrawable Balance
          </span>
          <span className="font-display text-2xl font-bold text-parchment">
            {hasWithdrawn ? "0.00" : estimatedProceeds}{" "}
            <span className="font-sans text-xs font-normal text-muted">cUSD</span>
          </span>
        </div>

        <div className="rounded-[14px] border border-white/5 bg-black/40 p-4 font-body">
          <span className="text-[11px] font-medium text-muted/60 uppercase tracking-wider block mb-1">
            Destination Safe Wallet
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-parchment">
              {shortAddress(safeAddress)}
            </span>
            <a
              href={`https://sepolia.etherscan.io/address/${safeAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted hover:text-parchment underline transition-colors"
            >
              Explorer ↗
            </a>
          </div>
        </div>

        <div className="rounded-[14px] border border-white/5 bg-black/40 p-4 font-body">
          <span className="text-[11px] font-medium text-muted/60 uppercase tracking-wider block mb-1">
            Payout Status
          </span>
          <span className="font-body text-sm font-semibold text-parchment">
            {hasWithdrawn ? "Safe Treasury Updated" : "Awaiting Transfer"}
          </span>
        </div>

        <div className="rounded-[14px] border border-white/5 bg-black/40 p-4 font-body">
          <span className="text-[11px] font-medium text-muted/60 uppercase tracking-wider block mb-1">
            Claim Synchronicity
          </span>
          <span className="font-body text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Async Multi-Claim Supported
          </span>
        </div>
      </div>

      {/* Action CTA & Context Box */}
      {isIssuer ? (
        <div className="flex flex-col gap-4">
          {!hasWithdrawn ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 rounded-[16px] border border-amber-500/30 bg-amber-500/10 p-5">
              <div className="flex-1">
                <p className="font-body text-sm font-semibold text-amber-300">
                  Settlement proceeds ready for withdrawal
                </p>
                <p className="font-body text-xs text-amber-200/80 mt-1 leading-relaxed">
                  Clicking withdraw will initiate an on-chain transfer of all available cUSD proceeds from the auction escrow to your Safe treasury.
                </p>
              </div>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setShowConfirmModal(true)}
                className="w-full md:w-auto shrink-0 rounded-[12px] bg-white py-3.5 px-6 font-body text-sm font-semibold text-charcoal shadow-lg hover:bg-white/90 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? "Processing..." : "Withdraw Settlement Proceeds"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 rounded-[16px] border border-emerald-500/30 bg-emerald-500/10 p-5">
                <div className="flex-1">
                  <p className="font-body text-sm font-semibold text-emerald-300 flex items-center gap-2">
                    <span>✓ Current settlement proceeds successfully transferred</span>
                  </p>
                  <p className="font-body text-xs text-emerald-200/80 mt-1 leading-relaxed">
                    Safe treasury is up to date. As remaining investors execute their claim transactions, additional funds will become available for repeat withdrawal.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setShowConfirmModal(true)}
                  className="w-full md:w-auto shrink-0 rounded-[12px] border border-hairline-strong bg-transparent py-3 px-5 font-body text-xs font-semibold text-parchment hover:bg-white/10 hover:border-parchment/40 transition-all cursor-pointer"
                >
                  {isLoading ? "Processing..." : "Withdraw Additional Proceeds"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 font-body text-xs text-rose-400 text-center font-medium">
          {error}
        </p>
      ) : null}

      {/* Payout Activity Timeline History Log */}
      {payoutHistory.length > 0 ? (
        <div className="mt-8 pt-6 border-t border-hairline-strong flex flex-col gap-3">
          <span className="font-body text-xs font-semibold text-parchment uppercase tracking-wider">
            Payout Activity Log ({payoutHistory.length})
          </span>
          <div className="flex flex-col gap-2 font-body text-xs">
            {payoutHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-[12px] border border-white/5 bg-black/20 p-3.5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                    ✓
                  </span>
                  <div>
                    <p className="font-semibold text-parchment">
                      Proceeds Payout to Safe ({shortAddress(item.destination)})
                    </p>
                    <p className="text-[11px] text-muted">
                      Executed at {item.timestamp} &middot; Confirmed on Sepolia
                    </p>
                  </div>
                </div>
                {item.txHash ? (
                  <a
                    href={etherscanTx(item.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-muted hover:text-parchment underline"
                  >
                    View Tx ↗
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* CONFIRMATION MODAL */}
      {showConfirmModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-6 backdrop-blur-md animate-in fade-in duration-200">
          <Card className="w-full max-w-md p-8 border border-hairline-strong bg-surface shadow-2xl rounded-[20px] flex flex-col gap-6">
            <div>
              <span className="inline-block mb-3 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-body text-[11px] font-semibold tracking-wider text-emerald-400 uppercase">
                Confirmation Required
              </span>
              <h3 className="font-display text-3xl text-parchment">
                Transfer Proceeds to Safe?
              </h3>
              <p className="mt-3 font-body text-sm text-muted leading-relaxed">
                You are about to transfer available settlement proceeds from the auction escrow to your multi-sig Safe treasury:
              </p>
              <div className="mt-4 flex flex-col gap-2 rounded-[14px] border border-hairline bg-black/30 p-4 font-body text-xs">
                <div className="flex justify-between">
                  <span className="text-muted font-medium">Destination:</span>
                  <span className="font-mono text-parchment font-semibold">{shortAddress(safeAddress)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted font-medium">Transfer Type:</span>
                  <span className="text-parchment font-semibold">Non-Custodial Escrow Payout</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 rounded-[12px] border border-hairline-strong bg-transparent py-3 px-5 font-body text-sm font-medium text-muted hover:text-parchment transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteWithdraw}
                className="flex-1 rounded-[12px] bg-white py-3 px-5 font-body text-sm font-semibold text-charcoal shadow-lg transition-all hover:bg-emerald-500 hover:text-charcoal hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                Confirm &amp; Transfer
              </button>
            </div>
          </Card>
        </div>
      ) : null}

      {/* SUCCESS MODAL */}
      {showSuccessModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-md animate-in fade-in duration-200">
          <Card className="w-full max-w-md p-8 border border-emerald-500/30 bg-surface shadow-2xl rounded-[20px] flex flex-col gap-6 text-center items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h3 className="font-display text-3xl text-parchment">
                Payout Transferred!
              </h3>
              <p className="mt-2 font-body text-xs text-muted leading-relaxed">
                Settlement proceeds have been successfully transferred from the auction escrow to your designated Safe treasury.
              </p>
            </div>

            <div className="w-full flex flex-col gap-2 rounded-[14px] border border-white/10 bg-black/40 p-4 font-body text-xs text-left">
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-muted">Destination:</span>
                <span className="font-mono text-parchment font-semibold">{shortAddress(safeAddress)}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-muted">Status:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Confirmed on Sepolia
                </span>
              </div>
              {lastTxHash ? (
                <div className="flex justify-between">
                  <span className="text-muted">Tx Hash:</span>
                  <a
                    href={etherscanTx(lastTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-emerald-400 hover:underline"
                  >
                    {shortAddress(lastTxHash)} ↗
                  </a>
                </div>
              ) : null}
            </div>

            <p className="font-body text-[11px] text-muted/70 italic leading-relaxed">
              💡 As remaining investors claim their refunds or allocations, additional funds will become available for repeat withdrawal.
            </p>

            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="w-full rounded-[12px] bg-white py-3 px-6 font-body text-sm font-semibold text-charcoal shadow-lg hover:bg-white/90 transition-all cursor-pointer"
            >
              Done
            </button>
          </Card>
        </div>
      ) : null}
    </Card>
  );
}
