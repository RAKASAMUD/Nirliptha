const STAGES = ["Awaiting escrow", "Open", "Pending reveal", "Settled"] as const;

type Props = {
  current: 0 | 1 | 2 | 3;
};

// The two Issuer mockups (Open vs Settled state) each shipped a DIFFERENT
// status-bar design (big circles+connector-line vs small dots+fill-bar) for
// the same 4-stage concept. Reconciled into one canonical version — the
// circle+connector design, since it reads more clearly — driven entirely by
// the `current` prop per PLAN-FE-frontend.md Task 4's `{ current: 0|1|2|3 }`
// interface.
export function StatusBar({ current }: Props) {
  return (
    <div className="relative flex items-center justify-between">
      <div className="absolute top-5 right-0 left-0 -z-10 h-px bg-hairline" />
      {STAGES.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex flex-col items-center gap-4 bg-charcoal px-4">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                done || active
                  ? "border-oxblood bg-oxblood"
                  : "border-hairline-strong bg-charcoal"
              }`}
            >
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  done || active ? "bg-white" : "bg-hairline-strong"
                }`}
              />
            </div>
            <span
              className={`font-mono text-[10px] tracking-widest uppercase ${
                active ? "font-bold text-oxblood" : done ? "text-parchment" : "text-muted/50"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
