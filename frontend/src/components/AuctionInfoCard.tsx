import { Card } from "./Card";
import { DataRow } from "./DataRow";
import { StatusPill } from "./StatusPill";
import { EncryptedValue } from "./EncryptedValue";
import { Countdown } from "./Countdown";
import { formatScaled, shortAddress } from "@/lib/format";
import type { useAuction } from "@/hooks/useAuction";

type Props = {
  auction: ReturnType<typeof useAuction>;
  layout?: "issuer" | "investor";
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
export function AuctionInfoCard({ auction, layout = "issuer" }: Props) {
  const isSettled = auction.status === 3;

  return (
    <Card className={layout === "investor" ? "p-8" : "p-8 md:p-10"}>
      <div className="mb-8 flex items-start justify-between">
        <StatusPill tone={isSettled ? "success" : "outline"}>
          {STATUS_LABEL[auction.status]}
        </StatusPill>
      </div>

      {isSettled ? (
        <div className="mb-8">
          <p className="mb-1 font-mono text-xs uppercase tracking-[0.1em] text-muted">
            Clearing price
          </p>
          <p className="font-display text-5xl text-parchment">
            {formatScaled(auction.clearingPrice, auction.scale)}{" "}
            <span className="text-2xl text-muted">cUSD</span>
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-0 border-t border-hairline pt-6">
        <DataRow label="Quantity" value={`${auction.quantity.toLocaleString("en-US")} cASSET`} />
        <DataRow
          label="Reserve price"
          value={`${formatScaled(auction.reservePrice, auction.scale)} cUSD`}
        />
        <DataRow label="Bids so far" value={auction.bidCount} border={!isSettled} />
        {isSettled ? (
          <DataRow label="Settled to treasury" value={shortAddress(auction.safeAddress)} border={false} />
        ) : null}
      </div>

      {auction.status === 1 ? (
        <div className="mt-8 border-t border-hairline pt-8 text-center">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.1em] text-muted">
            {layout === "investor" ? "Closes in" : "Time remaining"}
          </p>
          <Countdown
            deadlineTs={Number(auction.deadline)}
            className="font-mono text-4xl tracking-tighter text-parchment"
          />
        </div>
      ) : null}

      {auction.status === 3 ? (
        <div className="mt-8 border-t border-hairline pt-6">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.1em] text-muted">Unsold</p>
          <EncryptedValue />
        </div>
      ) : null}
    </Card>
  );
}
