"use client";

import { Card } from "./Card";
import { Button } from "./Button";

type Props = {
  open: boolean;
  quantity: string;
  price: string;
  deposit: string;
  onCancel: () => void;
  onConfirm: () => void;
};

// No Stitch mockup included a modal screen — the 5 HTML files only show the
// "Review bid" button, not what it opens. Built fresh to match the design
// system (Card look, Button variants, mono/serif type scale) and PLAN-FE
// Task 5's specified copy ("You are about to lock X cUSD...", "Only the TEE
// reads them", Cancel / Confirm and sign).
export function ConfirmModal({ open, quantity, price, deposit, onCancel, onConfirm }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-charcoal/80 p-6 backdrop-blur-sm">
      <Card className="w-full max-w-md p-8">
        <p className="mb-2 font-mono text-xs tracking-[0.1em] text-oxblood uppercase">
          Confirm bid
        </p>
        <h3 className="mb-6 font-display text-2xl text-parchment">
          You are about to lock <span className="text-oxblood">{deposit} cUSD</span> as a deposit.
        </h3>
        <p className="mb-6 font-mono text-sm text-muted">
          Quantity: {quantity} &middot; Price: {price}
        </p>
        <p className="mb-8 font-body text-sm text-muted">
          Your bid values are encrypted in your browser. Only the TEE reads them.
        </p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} className="flex-1">
            Confirm and sign
          </Button>
        </div>
      </Card>
    </div>
  );
}
