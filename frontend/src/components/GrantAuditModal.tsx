"use client";

import { useState } from "react";
import { Card } from "./Card";
import { Button } from "./Button";

type Props = {
  open: boolean;
  defaultAuditor?: string;
  onCancel: () => void;
  onConfirm: (auditor: `0x${string}`) => void;
};

// Auditor-address prompt per PLAN-FE-frontend.md Task 4: "modal input alamat
// auditor (prefill: alamat wallet issuer sendiri sebagai demo shortcut,
// editable)". No Stitch mockup covers this screen either — same situation
// as ConfirmModal, built fresh from the plan's description.
export function GrantAuditModal({ open, defaultAuditor, onCancel, onConfirm }: Props) {
  const [auditor, setAuditor] = useState(defaultAuditor ?? "");
  // React's documented "adjust state during render" pattern for resetting
  // state when a prop changes — NOT a useEffect, which the newer
  // react-hooks/set-state-in-effect rule flags as an avoidable cascading
  // render. Only fires the one render `open` actually flips.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setAuditor(defaultAuditor ?? "");
  }

  if (!open) return null;

  const isValid = /^0x[a-fA-F0-9]{40}$/.test(auditor);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-charcoal/80 p-6 backdrop-blur-sm">
      <Card className="w-full max-w-md p-8">
        <p className="mb-2 font-mono text-xs tracking-[0.1em] text-oxblood uppercase">
          Grant audit view
        </p>
        <h3 className="mb-6 font-display text-2xl text-parchment">
          Let an auditor decrypt this bidder&apos;s allocation.
        </h3>
        <label className="mb-8 flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted">
            Auditor address
          </span>
          <input
            value={auditor}
            onChange={(e) => setAuditor(e.target.value)}
            placeholder="0x..."
            className="w-full rounded-[4px] bg-charcoal p-4 font-mono text-sm text-parchment focus:ring-1 focus:ring-oxblood focus:outline-none"
          />
          <span className="text-[12px] text-muted">
            Prefilled with your own wallet — edit to grant a different auditor.
          </span>
        </label>
        <div className="flex gap-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!isValid}
            onClick={() => onConfirm(auditor as `0x${string}`)}
            className="flex-1"
          >
            Grant access
          </Button>
        </div>
      </Card>
    </div>
  );
}
