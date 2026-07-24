const STEPS = [
  {
    n: "01",
    title: "Create",
    body: "The issuer opens an auction. Quantity, reserve price, and deadline are public by design.",
  },
  {
    n: "02",
    title: "Bid",
    body: "Investors submit encrypted quantity and price. Deposits lock confidentially.",
  },
  {
    n: "03",
    title: "Compute",
    body: "After the deadline, winners and the clearing price are computed inside a TEE.",
  },
  {
    n: "04",
    title: "Settle",
    body: "Winners claim tokens, losers get refunds. Ownership stays encrypted.",
  },
];

// Copy locked verbatim by PLAN-FE-frontend.md Task 2 ("How It Works", 4 steps).
export function HowItWorks() {
  return (
    <section className="mx-auto max-w-(--container-max-width) px-margin-mobile py-section-gap md:px-margin-desktop">
      <div className="mb-12">
        <span className="mb-4 block font-mono text-xs tracking-widest text-oxblood uppercase">
          (02) Lifecycle
        </span>
        <h2 className="font-display text-3xl text-parchment md:text-4xl">
          Four steps, one transaction each
        </h2>
      </div>
      <div className="relative grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="absolute top-1/2 left-0 -z-10 hidden h-px w-full -translate-y-1/2 bg-oxblood/10 md:block" />
        {STEPS.map((step) => (
          <div
            key={step.n}
            className="hairline-border flex flex-col gap-6 bg-surface p-8 transition-colors hover:border-oxblood/30"
          >
            <span className="font-mono text-xs text-oxblood/60">{step.n}</span>
            <div>
              <h5 className="mb-4 font-display text-xl text-parchment">{step.title}</h5>
              <p className="font-body text-sm leading-relaxed text-muted">{step.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
