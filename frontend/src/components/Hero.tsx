import { Button } from "./Button";
import { ArrowForwardIcon } from "./icons";

const TECH_BADGES = ["NOX PROTOCOL", "ERC-7984", "GNOSIS SAFE", "SEPOLIA"];

// Copy locked verbatim by PLAN-FE-frontend.md Task 2. Pure Server Component —
// both CTAs are next/link navigation, no client interactivity needed.
export function Hero() {
  return (
    <main className="relative flex min-h-[calc(100vh-80px)] flex-col items-center justify-center overflow-hidden">
      <section className="relative z-10 mx-auto flex max-w-(--container-max-width) flex-col items-center gap-unit px-margin-mobile text-center md:px-margin-desktop">
        <div className="mb-8 inline-flex items-center rounded-full border border-oxblood/30 px-4 py-1.5">
          <span className="font-mono text-xs tracking-[0.2em] text-oxblood uppercase">
            Sealed-Bid Auction Protocol
          </span>
        </div>
        <h1 className="max-w-5xl font-display text-4xl leading-none text-parchment md:text-6xl">
          Sealed bids. <span className="text-oxblood italic">Private</span> ownership.{" "}
          <br className="hidden md:block" /> Public trust.
        </h1>
        <p className="mt-8 max-w-[600px] font-body text-lg leading-relaxed text-muted">
          Bids are encrypted in your browser and computed inside a trusted execution environment.
          No operator ever sees an offer. Ownership stays confidential after settlement.
        </p>
        <div className="mt-12 flex flex-col items-center gap-gutter md:flex-row">
          <Button href="/issuer" variant="primary" icon={<ArrowForwardIcon className="h-[18px] w-[18px]" />}>
            Enter as Issuer
          </Button>
          <Button href="/investor" variant="outline">
            Enter as Investor
          </Button>
        </div>
        <div className="mt-24 flex flex-wrap items-center justify-center gap-6 opacity-40">
          {TECH_BADGES.map((badge, i) => (
            <div key={badge} className="flex items-center gap-6">
              <span className="font-mono text-xs tracking-widest">{badge}</span>
              {i < TECH_BADGES.length - 1 ? <div className="h-3 w-px bg-hairline-strong" /> : null}
            </div>
          ))}
        </div>
      </section>
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[409px] w-full max-w-(--container-max-width) -translate-x-1/2 overflow-hidden opacity-20">
        <div className="absolute -bottom-24 left-1/2 flex h-[600px] w-[600px] -translate-x-1/2 items-center justify-center rounded-full border border-oxblood/40">
          <div className="flex h-[450px] w-[450px] items-center justify-center rounded-full border border-oxblood/20">
            <div className="h-[300px] w-[300px] rounded-full border border-oxblood/10" />
          </div>
        </div>
      </div>
    </main>
  );
}
