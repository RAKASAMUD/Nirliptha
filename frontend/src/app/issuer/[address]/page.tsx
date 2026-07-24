import { IssuerDashboard } from "@/components/IssuerDashboard";

// Server Component wrapper — params is a Promise per Next.js's App Router
// dynamic-segment convention. All real logic (wallet/issuer gate, live
// status, finalize/reveal/settle/withdraw, audit grant/rotate) lives in the
// IssuerDashboard client component per PLAN-FE-frontend.md Task 4.
export default async function IssuerAuctionPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;

  return (
    <main className="mx-auto max-w-(--container-max-width) px-margin-mobile py-section-gap md:px-margin-desktop">
      <IssuerDashboard auctionAddress={address as `0x${string}`} />
    </main>
  );
}
