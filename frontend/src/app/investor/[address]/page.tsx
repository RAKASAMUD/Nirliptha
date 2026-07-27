import { InvestorDashboard } from "@/components/InvestorDashboard";

export default async function InvestorAuctionPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-4 md:py-6 font-body">
      <InvestorDashboard auctionAddress={address as `0x${string}`} />
    </div>
  );
}
