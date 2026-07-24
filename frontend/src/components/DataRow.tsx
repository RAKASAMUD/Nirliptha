import type { ReactNode } from "react";

type Props = {
  label: string;
  value: ReactNode;
  border?: boolean;
  valueClassName?: string;
};

// Label-left (mono caps) + value-right (mono) row — the pattern used for
// "QUANTITY / RESERVE PRICE / BIDS SO FAR" style lists on the investor
// sidebar and settlement breakdown.
export function DataRow({ label, value, border = true, valueClassName = "" }: Props) {
  return (
    <div
      className={`flex items-center justify-between py-4 ${
        border ? "border-b border-hairline" : ""
      }`}
    >
      <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted">
        {label}
      </span>
      <span className={`font-mono text-sm text-parchment ${valueClassName}`}>{value}</span>
    </div>
  );
}
