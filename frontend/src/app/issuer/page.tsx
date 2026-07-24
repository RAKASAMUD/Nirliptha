import { StatusBar } from "@/components/StatusBar";
import { AuctionInfoCard } from "@/components/AuctionInfoCard";
import { AllocationTable } from "@/components/AllocationTable";
import { Button } from "@/components/Button";
import { OpenInNewIcon } from "@/components/icons";
import { DEMO_AUCTION, DEMO_AUCTION_ADDRESS, DEMO_ALLOCATION_ROWS } from "@/lib/demo-data";

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// Composition only — default demo state is Settled (the scenario already
// proven end-to-end on Sepolia). The Open-state branch below (StatusBar +
// AuctionInfoCard alone, no AllocationTable) stays wired for when real
// status comes from useAuction() in the data-wiring task; it isn't the
// default render path today since there's no live "in-progress" auction to
// demo against right now.
export default function IssuerPage() {
  const status = DEMO_AUCTION.status;

  return (
    <main className="mx-auto max-w-(--container-max-width) px-margin-mobile py-section-gap md:px-margin-desktop">
      <header className="mb-12">
        <p className="mb-4 font-mono text-xs tracking-widest text-muted uppercase">
          Issuer Dashboard
        </p>
        <h1 className="mb-4 font-display text-4xl text-parchment md:text-6xl">Auction #1</h1>
        <a
          href={`https://sepolia.etherscan.io/address/${DEMO_AUCTION_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 font-mono text-muted hover:text-oxblood"
        >
          {shortAddress(DEMO_AUCTION_ADDRESS)}
          <OpenInNewIcon className="h-4 w-4" />
        </a>
      </header>

      <section className="mb-16">
        <StatusBar current={status} />
      </section>

      <section className="mb-section-gap">
        <AuctionInfoCard auction={DEMO_AUCTION} layout="issuer" />
        {status === 3 ? (
          <div className="mt-8 flex justify-end">
            <Button variant="primary">Withdraw to Safe</Button>
          </div>
        ) : null}
      </section>

      {status === 3 ? (
        <section>
          <AllocationTable rows={DEMO_ALLOCATION_ROWS} decimals={DEMO_AUCTION.decimals} />
        </section>
      ) : null}
    </main>
  );
}
