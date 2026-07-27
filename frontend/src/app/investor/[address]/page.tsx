import { InvestorDashboard } from "@/components/InvestorDashboard";

export default async function InvestorAuctionPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;

  return (
    <div className="mx-auto max-w-(--container-max-width) px-margin-mobile md:px-margin-desktop">
      <InvestorDashboard auctionAddress={address as `0x${string}`} />
    </div>
  );
}
