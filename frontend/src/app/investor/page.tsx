import { InvestorDashboard } from "@/components/InvestorDashboard";

// Composition only — split layout + state-driven right panel (connect,
// bid form, submitted, pending reveal, result, claimed) all live in the
// InvestorDashboard client component per PLAN-FE-frontend.md Task 5.
export default function InvestorPage() {
  return (
    <main className="mx-auto max-w-(--container-max-width) px-margin-mobile py-section-gap md:px-margin-desktop">
      <InvestorDashboard />
    </main>
  );
}
