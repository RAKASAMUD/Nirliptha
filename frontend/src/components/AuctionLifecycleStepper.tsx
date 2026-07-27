type Props = {
  status: 0 | 1 | 2 | 3;
  layout?: "issuer" | "investor";
};

export function AuctionLifecycleStepper({ status, layout = "issuer" }: Props) {
  const isIssuerLayout = layout === "issuer";

  const stages = [
    {
      id: 0,
      stepNumber: "01",
      title: "Escrow Collateral",
      subtitle: "Assets Locked",
    },
    {
      id: 1,
      stepNumber: "02",
      title: "Live Bidding",
      subtitle: "Encrypted Sealed Bids",
    },
    {
      id: 2,
      stepNumber: "03",
      title: "TEE Discovery",
      subtitle: "Hardware Enclave",
    },
    {
      id: 3,
      stepNumber: "04",
      title: "Settlement",
      subtitle: "Payout & Claims",
    },
  ];

  return (
    <div className={`my-6 rounded-[20px] border p-5 md:p-6 ${
      isIssuerLayout
        ? "border-hairline-strong bg-black/40"
        : "border-oxblood/10 bg-rose-50/30"
    }`}>
      <div className="flex items-center justify-between mb-4">
        <span className={`font-body text-xs font-semibold uppercase tracking-wider ${
          isIssuerLayout ? "text-muted" : "text-oxblood"
        }`}>
          Auction Lifecycle & Stage Progress
        </span>
        <span className={`font-mono text-xs font-bold ${
          status === 3
            ? "text-indigo-400"
            : status === 1
            ? "text-emerald-400"
            : status === 2
            ? "text-amber-400"
            : "text-muted"
        }`}>
          Stage {status + 1} of 4: {stages[status]?.title}
        </span>
      </div>

      {/* Horizontal Connected Stepper Track */}
      <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {stages.map((stage) => {
          const isCompleted = status > stage.id;
          const isActive = status === stage.id;
          const isUpcoming = status < stage.id;

          return (
            <div
              key={stage.id}
              className={`relative flex flex-col gap-2 rounded-[14px] border p-3.5 transition-all duration-300 ${
                isActive
                  ? isIssuerLayout
                    ? "border-oxblood bg-oxblood/20 shadow-[0_0_15px_rgba(132,0,22,0.3)]"
                    : "border-oxblood/40 bg-white shadow-md"
                  : isCompleted
                  ? isIssuerLayout
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-emerald-500/30 bg-emerald-50 text-emerald-800"
                  : isIssuerLayout
                  ? "border-hairline-strong/40 bg-white/5 opacity-50"
                  : "border-gray-200 bg-gray-50/50 opacity-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-mono text-xs font-bold ${
                  isActive
                    ? "text-oxblood"
                    : isCompleted
                    ? "text-emerald-500"
                    : "text-muted"
                }`}>
                  {stage.stepNumber}
                </span>

                {isCompleted ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-[10px]">
                    ✓
                  </span>
                ) : isActive ? (
                  <span className="flex h-2.5 w-2.5 rounded-full bg-oxblood animate-ping" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-gray-400/40" />
                )}
              </div>

              <div>
                <h4 className={`font-body text-xs font-bold leading-tight ${
                  isActive
                    ? isIssuerLayout ? "text-parchment" : "text-charcoal"
                    : isCompleted
                    ? isIssuerLayout ? "text-emerald-300" : "text-emerald-900"
                    : isIssuerLayout ? "text-muted" : "text-charcoal/50"
                }`}>
                  {stage.title}
                </h4>
                <p className={`font-body text-[10px] mt-0.5 ${
                  isActive
                    ? isIssuerLayout ? "text-oxblood-light" : "text-oxblood"
                    : isCompleted
                    ? "text-emerald-500/80"
                    : "text-muted/60"
                }`}>
                  {stage.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
