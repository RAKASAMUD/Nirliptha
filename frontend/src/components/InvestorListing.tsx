"use client";

import { useAuctionList } from "@/hooks/useAuctionList";
import { AuctionCard } from "./AuctionCard";

// /investor landing: browsable grid of every auction any issuer has
// created (AuctionFactory is permissionless, so this reads the full
// Factory.auctions() list rather than one hardcoded address). Clicking a
// card goes to /investor/[address] for the bid/claim flow (InvestorDashboard).
export function InvestorListing() {
  const { auctions, isLoading } = useAuctionList();

  return (
    <>
      <header className="mb-12">
        <p className="mb-4 font-mono text-xs tracking-widest text-muted uppercase">Investor</p>
        <h1 className="mb-4 font-display text-4xl text-parchment md:text-6xl">Open auctions</h1>
        <p className="max-w-lg font-body text-muted">
          Your bid is encrypted in your browser before it reaches the chain. No one sees your offer
          — not the issuer, not other bidders.
        </p>
      </header>

      {isLoading ? (
        <p className="font-mono text-xs text-muted">Loading auctions from Sepolia...</p>
      ) : auctions.length === 0 ? (
        <p className="font-body text-muted">No auctions have been created yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {auctions
            .slice()
            .reverse()
            .map((a) => (
              <AuctionCard key={a.address} auction={a} href={`/investor/${a.address}`} showIssuer />
            ))}
        </div>
      )}
    </>
  );
}
