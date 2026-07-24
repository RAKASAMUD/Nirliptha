import Link from "next/link";
import { Card } from "./Card";
import { formatScaled, shortAddress } from "@/lib/format";
import type { AuctionSummary } from "@/hooks/useAuctionList";

const STATUS_LABEL = ["Awaiting escrow", "Open", "Pending reveal", "Settled"] as const;
const STATUS_CLASS = [
  "text-muted",
  "text-emerald-500",
  "text-yellow-500",
  "text-oxblood",
] as const;

type Props = {
  auction: AuctionSummary;
  href: string;
  showIssuer?: boolean;
};

// The "article preview card" for the listing pages — no hooks, so it stays
// a Server subtree leaf even though the pages that render it (issuer/
// investor listings) are 'use client'. Deliberately compact: full detail
// (bidders, countdown, decrypt actions) is AuctionInfoCard's job on the
// per-auction detail page this links into.
export function AuctionCard({ auction, href, showIssuer = false }: Props) {
  return (
    <Link href={href}>
      <Card className="flex h-full flex-col gap-4 p-6 transition-colors hover:bg-white/5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs tracking-widest text-muted uppercase">
            {shortAddress(auction.address)}
          </span>
          <span className={`font-mono text-xs tracking-widest uppercase ${STATUS_CLASS[auction.status]}`}>
            {STATUS_LABEL[auction.status]}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-display text-2xl text-parchment">
            {auction.quantity.toLocaleString("en-US")} cASSET
          </span>
          <span className="font-mono text-sm text-muted">
            Reserve {formatScaled(auction.reservePrice, auction.scale)} cUSD
          </span>
        </div>
        {showIssuer ? (
          <span className="mt-auto font-mono text-[11px] text-muted">
            Issuer {shortAddress(auction.issuer)}
          </span>
        ) : null}
      </Card>
    </Link>
  );
}
