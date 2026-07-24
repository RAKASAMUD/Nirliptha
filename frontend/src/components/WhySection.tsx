const POINTS = [
  {
    n: "01",
    title: "Bid privacy",
    body: "No one sees your offer, not even the issuer.",
  },
  {
    n: "02",
    title: "Lifetime ownership privacy",
    body: "Your holdings stay encrypted after settlement, forever.",
  },
  {
    n: "03",
    title: "Auditable by design",
    body: "Grant access when needed, revoke it by rotating handles.",
  },
];

// Copy locked verbatim by PLAN-FE-frontend.md Task 2 ("Why Nirlipta").
export function WhySection() {
  return (
    <section className="mx-auto max-w-(--container-max-width) border-y border-hairline bg-charcoal/50 px-margin-mobile py-section-gap md:px-margin-desktop">
      <div className="mb-12">
        <span className="mb-4 block font-mono text-xs tracking-widest text-oxblood uppercase">
          (01) The difference
        </span>
        <h2 className="max-w-2xl text-left font-display text-3xl text-parchment md:text-4xl">
          Privacy that outlives the auction
        </h2>
      </div>
      <div className="mb-12 h-px w-full bg-hairline" />
      <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
        {POINTS.map((point) => (
          <div key={point.n} className="flex flex-col gap-4">
            <span className="font-mono text-xs font-medium text-oxblood/60">{point.n}</span>
            <h4 className="font-display text-2xl text-parchment">{point.title}</h4>
            <p className="font-body text-muted">{point.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
