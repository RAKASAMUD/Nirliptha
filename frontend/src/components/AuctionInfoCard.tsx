import { Card } from "./Card";
import { DataRow } from "./DataRow";
import { StatusPill } from "./StatusPill";
import { EncryptedValue } from "./EncryptedValue";
import { Countdown } from "./Countdown";

// Mirrors the shape `useAuction()` will return once PLAN-FE-frontend.md
// Task 3 wires up the real data layer (`hooks/useAuction.ts`). Kept as an
// explicit local type for this presentational pass — swapping it for
// `ReturnType<typeof useAuction>` later is a one-line change since the field
// names already match the plan's locked interface.
export type AuctionData = {
  status: 0 | 1 | 2 | 3;
  quantity: bigint;
  reservePrice: bigint;
  deadline: bigint; // unix seconds
  safeAddress: string;
  clearingPrice: bigint;
  bidCount: number;
  decimals?: number; // read from contract in the data-layer task; defaults to 6 for the demo
};

type Props = {
  auction: AuctionData;
  layout?: "issuer" | "investor";
};

const STATUS_LABEL: Record<AuctionData["status"], string> = {
  0: "Awaiting escrow",
  1: "Open for bids",
  2: "Revealing clearing price",
  3: "Settled",
};

function formatToken(raw: bigint, decimals: number) {
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = raw / divisor;
  return whole.toLocaleString("en-US");
}

// The one shared info card used by both the issuer dashboard and the
// investor sidebar (PLAN-FE-frontend.md Task 3: "shared:
// quantity/reserve/deadline/bidders"). Content shifts by `status`, not by a
// separate component per state — action buttons (Finalize, BidForm, etc.)
// are composed by the calling page around this card, not inside it.
export function AuctionInfoCard({ auction, layout = "issuer" }: Props) {
  const decimals = auction.decimals ?? 6;
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
            {formatToken(auction.clearingPrice, decimals)}{" "}
            <span className="text-2xl text-muted">cUSD</span>
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-0 border-t border-hairline pt-6">
        <DataRow label="Quantity" value={`${formatToken(auction.quantity, decimals)} cASSET`} />
        <DataRow
          label="Reserve price"
          value={`${formatToken(auction.reservePrice, decimals)} cUSD`}
        />
        <DataRow label="Bids so far" value={auction.bidCount} border={!isSettled} />
        {isSettled ? (
          <DataRow
            label="Settled to treasury"
            value={
              <span className="flex items-center gap-2">{shortAddress(auction.safeAddress)}</span>
            }
            border={false}
          />
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

function shortAddress(addr: string) {
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
