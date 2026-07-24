import { InvestorListing } from "@/components/InvestorListing";

// Composition only — the browsable grid of every auction lives in the
// InvestorListing client component. A specific auction's bid/claim flow is
// /investor/[address].
export default function InvestorPage() {
  return (
    <main className="mx-auto max-w-(--container-max-width) px-margin-mobile py-section-gap md:px-margin-desktop">
      <InvestorListing />
    </main>
  );
}
