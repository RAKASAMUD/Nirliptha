import { Card } from "./Card";
import { DataRow } from "./DataRow";
import { StatusPill } from "./StatusPill";
import { EncryptedValue } from "./EncryptedValue";
import { Countdown } from "./Countdown";
import { formatScaled, shortAddress } from "@/lib/format";
import type { useAuction } from "@/hooks/useAuction";

type Props = {
  auction: ReturnType<typeof useAuction>;
  auctionAddress?: `0x${string}`;
  layout?: "issuer" | "investor";
  action?: React.ReactNode;
  isIssuer?: boolean;
};

const STATUS_LABEL: Record<0 | 1 | 2 | 3, string> = {
  0: "Awaiting escrow",
  1: "Open for bids",
  2: "Revealing clearing price",
  3: "Settled",
};

// The one shared info card used by both the issuer dashboard and the
// investor sidebar (PLAN-FE-frontend.md Task 3: "shared:
// quantity/reserve/deadline/bidders"). Content shifts by `status`, not by a
// separate component per state — action buttons (Finalize, BidForm, etc.)
// are composed by the calling page around this card, not inside it.
// quantity/reservePrice/clearingPrice are Auction.sol's own public fields,
// scaled by the contract's SCALE constant — NOT by cUSD/cAsset's decimals()
// (which turned out to be 18, the unmodified ERC7984Base default; see the
// long comment in hooks/useAuction.ts for how this was discovered).
export function AuctionInfoCard({ auction, auctionAddress, layout = "issuer", action }: Props) {
  const isSettled = auction.status === 3;

  const renderStatusBadge = () => {
    switch (auction.status) {
      case 1:
        return (
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 font-body text-xs font-semibold tracking-wider text-emerald-400 uppercase shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Open for Bids
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 font-body text-xs font-semibold tracking-wider text-amber-400 uppercase">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Revealing Clearing Price
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center gap-2 rounded-full border border-oxblood/40 bg-oxblood/20 px-4 py-1.5 font-body text-xs font-semibold tracking-wider text-parchment uppercase">
            Settled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-2 rounded-full border border-hairline-strong bg-white/5 px-4 py-1.5 font-body text-xs font-semibold tracking-wider text-muted uppercase">
            Awaiting Escrow
          </span>
        );
    }
  };

  return (
    <Card className={layout === "investor" ? "p-8 shadow-xl" : "p-8 md:p-10 shadow-2xl"}>
      <div className="mb-8 flex items-center justify-between border-b border-hairline pb-6">
        <div>
          <span className="font-body text-xs font-medium tracking-widest text-muted uppercase">
            Auction Details
          </span>
          {auctionAddress ? (
            <p className="font-mono text-xs text-parchment mt-0.5">{shortAddress(auctionAddress)}</p>
          ) : null}
        </div>
        {renderStatusBadge()}
      </div>

      <div className="mb-8">
        <span className="font-body text-xs font-medium uppercase tracking-[0.1em] text-muted">
          Quantity For Sale
        </span>
        <p className="font-display text-4xl text-parchment md:text-5xl mt-1">
          {auction.quantity.toLocaleString("en-US")}{" "}
          <span className="font-sans text-xl font-normal text-muted">cASSET</span>
        </p>
      </div>

      {isSettled ? (
        <div className="mb-8 rounded-[14px] border border-oxblood/30 bg-oxblood/10 p-6">
          <p className="mb-1 font-body text-xs font-medium uppercase tracking-[0.1em] text-muted">
            Clearing Price
          </p>
          <p className="font-display text-4xl text-parchment">
            {auction.clearingPrice >= BigInt("340282366920938463463374607431768211455") || auction.clearingPrice === BigInt(0)
              ? formatScaled(auction.reservePrice, auction.scale)
              : formatScaled(auction.clearingPrice, auction.scale)}{" "}
            <span className="text-xl text-muted">cUSD</span>
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-0 border-t border-hairline pt-4">
        <DataRow
          label="Min Price"
          value={`${formatScaled(auction.reservePrice, auction.scale)} cUSD`}
        />
        <DataRow label="Bids submitted" value={`${auction.bidCount} / 5`} border={!isSettled} />
        {isSettled ? (
          <DataRow label="Settled to treasury" value={shortAddress(auction.safeAddress)} border={false} />
        ) : null}
      </div>

      {auction.status === 1 ? (
        <div className="mt-8 rounded-[16px] border border-hairline-strong bg-black/40 p-6 text-center shadow-inner">
          <p className="mb-3 font-body text-xs font-medium uppercase tracking-[0.1em] text-muted">
            {layout === "investor" ? "Closes in" : "Time remaining"}
          </p>
          <Countdown
            deadlineTs={Number(auction.deadline)}
            className="font-body text-4xl font-bold tracking-tight text-parchment"
          />
        </div>
      ) : null}

      {auction.status === 3 ? (
        <div className="mt-8 border-t border-hairline pt-6">
          <p className="mb-2 font-body text-xs font-medium uppercase tracking-[0.1em] text-muted">Unsold Balance</p>
          <EncryptedValue />
        </div>
      ) : null}

      {action ? <div className="mt-8 border-t border-hairline pt-6">{action}</div> : null}
    </Card>
  );
}
