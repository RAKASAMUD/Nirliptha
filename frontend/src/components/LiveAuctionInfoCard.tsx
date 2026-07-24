"use client";

import { useAuction } from "@/hooks/useAuction";
import { AuctionInfoCard } from "./AuctionInfoCard";

type Props = {
  address: `0x${string}`;
  layout?: "issuer" | "investor";
};

// Thin client boundary so issuer/page.tsx and investor/page.tsx can stay
// Server Components (principle: 'use client' only on the leaf that actually
// needs the hook) while still rendering real, live-polled Sepolia data
// through the same presentational AuctionInfoCard used everywhere else.
export function LiveAuctionInfoCard({ address, layout }: Props) {
  const auction = useAuction(address);

  if (auction.isLoading) {
    return (
      <div className="hairline-border bg-surface p-8 font-mono text-sm text-muted md:p-10">
        Loading auction from Sepolia...
      </div>
    );
  }

  return <AuctionInfoCard auction={auction} layout={layout} />;
}
