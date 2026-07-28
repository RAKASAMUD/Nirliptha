"use client";

import { useState } from "react";
import { Card } from "./Card";
import { EncryptedValue } from "./EncryptedValue";
import { ConfirmModal } from "./ConfirmModal";
import { LockOpenIcon } from "./icons";

type Props = {
  reservePrice: number; // human-readable, e.g. 1.0
  balance?: number | null; // null/undefined = not yet decrypted
  onDecryptBalance?: () => void;
  onSubmit?: (quantity: number, price: number) => void;
  bidStep?: string | null;
  bidError?: string | null;
};

export function BidForm({ reservePrice, balance, onDecryptBalance, onSubmit, bidStep, bidError }: Props) {
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const q = Number(quantity) || 0;
  const p = Number(price) || 0;
  const deposit = q * p;

  const belowReserve = p > 0 && p < reservePrice;
  const exceedsBalance = balance != null && deposit > balance;
  const canReview = q > 0 && p > 0;
  const isSubmitting = !!bidStep;

  // Determine progress percentage from bidStep text
  const progressPercent = bidStep?.includes("1/2") ? 50 : bidStep?.includes("2/2") ? 90 : 10;

  return (
    <div className="flex flex-col gap-6 font-body">
      {/* MAIN BIDDING FORM CARD */}
      <Card className="p-6 md:p-10 bg-white/95 border border-oxblood/15 shadow-[0_10px_35px_rgba(132,0,22,0.08)] rounded-[24px]">
        <div className="mb-8 border-b border-oxblood/10 pb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 font-body text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              100% Encrypted Offer
            </span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl text-charcoal mb-2">
            Submit Confidential Bid
          </h2>
          <p className="max-w-lg font-body text-xs md:text-sm text-charcoal/70 leading-relaxed">
            Your quantity and maximum price are encrypted in your browser before hitting the blockchain. Only hardware TEE enclaves read your offer during settlement.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-charcoal/70">
              Quantity to Buy
            </span>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="0"
                placeholder="e.g. 100"
                value={quantity}
                disabled={isSubmitting}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-[14px] border border-oxblood/20 bg-rose-50/30 p-4 pr-20 font-body font-semibold text-charcoal placeholder:text-charcoal/40 focus:border-oxblood focus:ring-1 focus:ring-oxblood focus:bg-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all shadow-xs disabled:opacity-50"
              />
              <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 font-body text-xs font-bold text-charcoal/60 uppercase">
                cASSET
              </span>
            </div>
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-charcoal/70">
              Max Price per Token
            </span>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 1.00"
                value={price}
                disabled={isSubmitting}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-[14px] border border-oxblood/20 bg-rose-50/30 p-4 pr-16 font-body font-semibold text-charcoal placeholder:text-charcoal/40 focus:border-oxblood focus:ring-1 focus:ring-oxblood focus:bg-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all shadow-xs disabled:opacity-50"
              />
              <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 font-body text-xs font-bold text-charcoal/60 uppercase">
                cUSD
              </span>
            </div>
          </label>
        </div>

        {belowReserve ? (
          <div className="mt-4 rounded-[12px] border border-amber-500/30 bg-amber-50 p-3 font-body text-xs font-medium text-amber-800 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Price is below the minimum price of {reservePrice} cUSD. Bids below the min price will not qualify.
          </div>
        ) : null}
        {exceedsBalance ? (
          <div className="mt-4 rounded-[12px] border border-oxblood/30 bg-rose-50 p-3 font-body text-xs font-medium text-oxblood flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-oxblood" />
            Required deposit exceeds your cUSD balance.
          </div>
        ) : null}

        {/* DEPOSIT SUMMARY BOX */}
        <div className="mt-8 flex items-center justify-between rounded-[16px] border border-oxblood/15 bg-rose-50/40 p-5">
          <div>
            <span className="block font-body text-[11px] font-bold uppercase tracking-wider text-charcoal/60">
              Total Deposit Required
            </span>
            <p className="mt-0.5 font-body text-xs text-charcoal/70">Calculated as: Quantity × Max Price</p>
          </div>
          <div className="text-right">
            <span className="font-display text-3xl font-bold text-oxblood tracking-tight">
              {deposit.toLocaleString("en-US")}
            </span>
            <span className="ml-2 font-body font-bold text-charcoal">cUSD</span>
          </div>
        </div>

        {/* EMBEDDED STEP PROGRESS BAR CARD */}
        {bidStep && (
          <div className="mt-6 rounded-2xl border border-oxblood/20 bg-rose-50/70 p-4 font-body animate-in fade-in transition-all">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-oxblood animate-pulse" />
                <span className="text-xs font-bold text-oxblood">{bidStep}</span>
              </div>
              <span className="font-mono text-[11px] font-bold text-oxblood/80">
                {progressPercent}%
              </span>
            </div>

            {/* Small Sleek Progress Bar */}
            <div className="h-1.5 w-full rounded-full bg-oxblood/15 overflow-hidden">
              <div
                className="h-full bg-oxblood transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* ERROR MESSAGE ALERT INSIDE CARD */}
        {bidError && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 flex items-center gap-2 animate-in fade-in">
            <span>{bidError}</span>
          </div>
        )}

        <button
          type="button"
          disabled={!canReview || isSubmitting}
          onClick={() => setConfirmOpen(true)}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-oxblood py-4 px-6 font-body text-sm font-semibold text-white shadow-md transition-all duration-300 hover:bg-oxblood/90 hover:shadow-[0_6px_20px_rgba(132,0,22,0.3)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <LockOpenIcon className="h-4 w-4" />
          <span>{isSubmitting ? "Processing Encrypted Bid..." : "Review & Encrypt Bid →"}</span>
        </button>
      </Card>

      <ConfirmModal
        open={confirmOpen}
        quantity={quantity}
        price={price}
        deposit={deposit.toLocaleString("en-US")}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          onSubmit?.(q, p);
        }}
      />
    </div>
  );
}
