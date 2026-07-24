import type { ReactNode } from "react";

type Props = {
  label: string;
  value: ReactNode;
  unit?: string;
  className?: string;
};

// Label-above (mono caps) + big value-below (serif) block — the pattern used
// for the Issuer info grid (Quantity/Reserve/Bids/Treasury) and the
// Settlement summary (Sold/Unsold/Settled to Treasury). Not in the task's
// suggested ui/ list, but repeats often enough across screens to earn its
// own primitive rather than duplicating the label+value markup everywhere.
export function StatBlock({ label, value, unit, className = "" }: Props) {
  return (
    <div className={className}>
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="font-display text-3xl text-parchment">
        {value}
        {unit ? <span className="ml-2 font-body text-lg text-muted">{unit}</span> : null}
      </p>
    </div>
  );
}
