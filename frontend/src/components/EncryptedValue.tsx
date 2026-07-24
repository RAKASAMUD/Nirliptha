"use client";

import { LockIcon } from "./icons";

type Props = {
  onDecrypt?: () => void;
  label?: string;
  className?: string;
};

// Lock glyph + "Encrypted" + optional decrypt trigger — the recurring stand-in
// for any handle a viewer isn't (yet) authorized to read: balances,
// allocations, unsold quantity. No hooks here; `onDecrypt` is only ever
// supplied by an already-client ancestor once the data-wiring task adds it.
export function EncryptedValue({ onDecrypt, label = "Encrypted", className = "" }: Props) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LockIcon className="h-4 w-4 text-muted" />
      <span className="font-body italic text-muted">{label}</span>
      {onDecrypt ? (
        <button
          onClick={onDecrypt}
          className="ml-auto font-mono text-xs uppercase tracking-[0.1em] text-oxblood hover:underline"
        >
          Decrypt
        </button>
      ) : null}
    </div>
  );
}
