import { LiveAuctionInfoCard } from "@/components/LiveAuctionInfoCard";
import { BidForm } from "@/components/BidForm";
import { Card } from "@/components/Card";
import { DataRow } from "@/components/DataRow";
import { Button } from "@/components/Button";
import { CONTRACTS } from "@/lib/config";
import { DEMO_AUCTION, DEMO_BIDDERS } from "@/lib/demo-data";

// Composition only, split layout per PLAN-FE-frontend.md Task 5. AuctionInfoCard
// (left column) now reads LIVE Sepolia data via useAuction() (Task 3). The
// right-column result breakdown still uses demo data — real per-investor
// bid/allocation reads (bidderIndex, allocations mapping, decrypt calls)
// are Task 5's useBid hook, not built yet. Default demo scenario: viewing
// bidder #3 (0x3AcE...), the "partial fill" investor from the real Sepolia
// run (40,000 @ 1.05 -> 20,000 cASSET, 21,000 cUSD refund).
export default function InvestorPage() {
  const demo = DEMO_BIDDERS[2]; // partial-fill investor
  const owed = demo.allocation * Number(DEMO_AUCTION.clearingPrice) / 10 ** DEMO_AUCTION.decimals;
  const deposit = demo.q * demo.p;
  const refund = deposit - owed;

  return (
    <main className="mx-auto max-w-(--container-max-width) px-margin-mobile py-section-gap md:px-margin-desktop">
      <div className="grid grid-cols-1 items-start gap-gutter md:grid-cols-[40%_60%]">
        <aside className="md:sticky md:top-32">
          <LiveAuctionInfoCard address={CONTRACTS.demoAuction as `0x${string}`} layout="investor" />
        </aside>

        {DEMO_AUCTION.status === 3 ? (
          <section>
            <Card className="p-12">
              <p className="mb-2 font-mono text-xs tracking-widest text-oxblood uppercase">
                Your result
              </p>
              <h2 className="mb-4 font-display text-4xl text-parchment">Partial fill</h2>
              <p className="mb-8 max-w-lg font-body text-muted">
                Your price matched the clearing price. The remaining quantity was allocated
                first-come, first-served.
              </p>
              <div className="flex flex-col">
                <DataRow label="Your bid" value={`${demo.q.toLocaleString()} @ ${demo.p} cUSD`} />
                <DataRow label="Clearing price" value="1.05 cUSD" />
                <DataRow
                  label="Your allocation"
                  value={`${demo.allocation.toLocaleString()} cASSET`}
                  valueClassName="font-bold text-oxblood"
                />
                <DataRow label="Deposit locked" value={`${deposit.toLocaleString()} cUSD`} />
                <DataRow label="Amount owed" value={`${owed.toLocaleString()} cUSD`} border={false} />
                <div className="mt-2 flex items-center justify-between border-t-2 border-hairline-strong py-8">
                  <span className="font-mono text-sm text-parchment uppercase">Refund</span>
                  <span className="font-display text-2xl text-parchment">
                    {refund.toLocaleString()} cUSD
                  </span>
                </div>
              </div>
              <Button variant="primary" className="mt-4 w-full">
                Claim tokens and refund
              </Button>
              <p className="mt-4 text-center font-body text-[13px] text-muted">
                Claiming looks identical on-chain whether you won or lost
              </p>
            </Card>
          </section>
        ) : (
          <section>
            <BidForm reservePrice={1} balance={null} />
          </section>
        )}
      </div>
    </main>
  );
}
