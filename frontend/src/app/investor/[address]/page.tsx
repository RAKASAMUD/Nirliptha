import { InvestorDashboard } from "@/components/InvestorDashboard";

// Server Component wrapper — params is a Promise per Next.js's App Router
// dynamic-segment convention. All real logic (split layout, state-driven
// right panel: connect, bid form, submitted, pending reveal, result,
// claimed) lives in the InvestorDashboard client component per
// PLAN-FE-frontend.md Task 5.
export default async function InvestorAuctionPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;

  return (
    <main className="mx-auto max-w-(--container-max-width) px-margin-mobile py-section-gap md:px-margin-desktop">
      <InvestorDashboard auctionAddress={address as `0x${string}`} />
    </main>
  );
}
