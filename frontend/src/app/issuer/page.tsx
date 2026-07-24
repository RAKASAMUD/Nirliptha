import { StatusBar } from "@/components/StatusBar";
import { LiveAuctionInfoCard } from "@/components/LiveAuctionInfoCard";
import { AllocationTable } from "@/components/AllocationTable";
import { Button } from "@/components/Button";
import { OpenInNewIcon } from "@/components/icons";
import { shortAddress } from "@/lib/format";
import { CONTRACTS } from "@/lib/config";
import { DEMO_AUCTION, DEMO_ALLOCATION_ROWS } from "@/lib/demo-data";

// Composition only. AuctionInfoCard now reads LIVE data from Sepolia via
// useAuction() (PLAN-FE-frontend.md Task 3) through the LiveAuctionInfoCard
// client boundary. StatusBar and AllocationTable still use demo data —
// their real wiring (grantAuditView/rotateHandles/decrypt calls, and status
// driving which action buttons render) is Task 4, not Task 3's scope. The
// real demo auction is independently confirmed Settled on Sepolia
// (.agents/laporan.md), so these should agree in practice; they're not
// contractually linked yet.
export default function IssuerPage() {
  const status = DEMO_AUCTION.status;
  const auctionAddress = CONTRACTS.demoAuction as `0x${string}`;

  return (
    <main className="mx-auto max-w-(--container-max-width) px-margin-mobile py-section-gap md:px-margin-desktop">
      <header className="mb-12">
        <p className="mb-4 font-mono text-xs tracking-widest text-muted uppercase">
          Issuer Dashboard
        </p>
        <h1 className="mb-4 font-display text-4xl text-parchment md:text-6xl">Auction #1</h1>
        <a
          href={`https://sepolia.etherscan.io/address/${auctionAddress}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 font-mono text-muted hover:text-oxblood"
        >
          {shortAddress(auctionAddress)}
          <OpenInNewIcon className="h-4 w-4" />
        </a>
      </header>

      <section className="mb-16">
        <StatusBar current={status} />
      </section>

      <section className="mb-section-gap">
        <LiveAuctionInfoCard address={auctionAddress} layout="issuer" />
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
