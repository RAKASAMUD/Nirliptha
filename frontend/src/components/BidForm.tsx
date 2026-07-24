"use client";

import { useState } from "react";
import { Card } from "./Card";
import { Button } from "./Button";
import { EncryptedValue } from "./EncryptedValue";
import { ConfirmModal } from "./ConfirmModal";
import { LockOpenIcon } from "./icons";

type Props = {
  reservePrice: number; // human-readable, e.g. 1.0
  balance?: number | null; // null/undefined = not yet decrypted
  onDecryptBalance?: () => void;
  onSubmit?: (quantity: number, price: number) => void;
};

// Client component: controlled inputs + a live Q×P preview need local state,
// which is why this (and not the whole /investor page) carries 'use client'
// per the task's Server-Components-by-default rule. Owns its own
// confirm-modal open/close state internally so PLAN-FE's BidForm.tsx +
// ConfirmModal.tsx stay two separate files without needing a third wrapper
// component — investor/page.tsx just renders <BidForm /> as a leaf.
export function BidForm({ reservePrice, balance, onDecryptBalance, onSubmit }: Props) {
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const q = Number(quantity) || 0;
  const p = Number(price) || 0;
  const deposit = q * p;

  const belowReserve = p > 0 && p < reservePrice;
  const exceedsBalance = balance != null && deposit > balance;
  const canReview = q > 0 && p > 0;

  return (
    <div className="flex flex-col gap-8">
      <Card className="flex flex-col items-center justify-between gap-4 p-6 md:flex-row">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
            <LockOpenIcon className="h-5 w-5 text-muted" />
          </div>
          <div>
            <span className="block font-mono text-xs uppercase tracking-[0.1em] text-muted">
              Available balance
            </span>
            {balance == null ? (
              <EncryptedValue onDecrypt={onDecryptBalance} />
            ) : (
              <span className="font-mono text-parchment">{balance.toLocaleString("en-US")} cUSD</span>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-8 md:p-12">
        <div className="mb-10">
          <h2 className="mb-4 font-display text-2xl text-parchment italic">
            Place an encrypted bid
          </h2>
          <p className="max-w-lg font-body text-muted">
            Your quantity and price are encrypted in this browser. Only the TEE (Trusted
            Execution Environment) reads them during the resolution phase.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <label className="flex flex-col gap-3">
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted">
              Quantity
            </span>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="0"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-[4px] bg-charcoal p-4 pr-20 font-mono text-parchment focus:ring-1 focus:ring-oxblood focus:outline-none"
              />
              <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 font-mono text-muted uppercase">
                cASSET
              </span>
            </div>
          </label>
          <label className="flex flex-col gap-3">
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted">
              Price per token
            </span>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="1.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-[4px] bg-charcoal p-4 pr-16 font-mono text-parchment focus:ring-1 focus:ring-oxblood focus:outline-none"
              />
              <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 font-mono text-muted uppercase">
                cUSD
              </span>
            </div>
          </label>
        </div>

        {belowReserve ? (
          <p className="mt-4 font-body text-sm text-yellow-500">
            Below the reserve price of {reservePrice}. This bid will not win.
          </p>
        ) : null}
        {exceedsBalance ? (
          <p className="mt-4 font-body text-sm text-oxblood">
            Deposit exceeds your balance. The bid will be recorded with a zero deposit and cannot
            win.
          </p>
        ) : null}

        <div className="mt-12 flex items-center justify-between border-t border-hairline pt-8">
          <div>
            <span className="block font-mono text-xs uppercase tracking-[0.1em] text-muted">
              Deposit to lock
            </span>
            <p className="mt-1 text-[12px] text-muted">Calculated as: Price × Quantity</p>
          </div>
          <div className="text-right">
            <span className="font-display text-2xl text-oxblood tracking-tight">
              {deposit.toLocaleString("en-US")}
            </span>
            <span className="ml-2 font-mono text-parchment">cUSD</span>
          </div>
        </div>

        <Button
          variant="primary"
          disabled={!canReview}
          onClick={() => setConfirmOpen(true)}
          className="mt-8 w-full"
          icon={<LockOpenIcon className="h-5 w-5" />}
        >
          Review bid
        </Button>
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
