import { IssuerDashboard } from "@/components/IssuerDashboard";

// Composition only — all real logic (wallet/issuer gate, live status,
// finalize/reveal/settle/withdraw, audit grant/rotate, create+escrow) lives
// in the IssuerDashboard client component per PLAN-FE-frontend.md Task 4.
export default function IssuerPage() {
  return (
    <main className="mx-auto max-w-(--container-max-width) px-margin-mobile py-section-gap md:px-margin-desktop">
      <header className="mb-12">
        <p className="mb-4 font-mono text-xs tracking-widest text-muted uppercase">
          Issuer Dashboard
        </p>
        <h1 className="font-display text-4xl text-parchment md:text-6xl">Auction #1</h1>
      </header>
      <IssuerDashboard />
    </main>
  );
}
