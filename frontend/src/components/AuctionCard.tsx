import Link from "next/link";
import { Card } from "./Card";
import { formatScaled, shortAddress } from "@/lib/format";
import { Countdown } from "./Countdown";
import type { AuctionSummary } from "@/hooks/useAuctionList";

type Props = {
  auction: AuctionSummary;
  href: string;
  showIssuer?: boolean;
};

export function AuctionCard({ auction, href, showIssuer = false }: Props) {
  const isSettled = auction.status === 3;
  const isPending = auction.status === 2;

  const getStatusBadge = () => {
    switch (auction.status) {
      case 1:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50 px-3 py-1 font-body text-[11px] font-bold tracking-wider text-emerald-700 uppercase shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Bidding Live
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-50 px-3 py-1 font-body text-[11px] font-bold tracking-wider text-amber-700 uppercase shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Resolution Pending
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-50 px-3 py-1 font-body text-[11px] font-bold tracking-wider text-indigo-700 uppercase shadow-xs">
            ✓ Auction Settled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-100 px-3 py-1 font-body text-[11px] font-semibold tracking-wider text-gray-600 uppercase">
            Awaiting Escrow
          </span>
        );
    }
  };

  const getActionButtonLabel = () => {
    switch (auction.status) {
      case 1:
        return "Place Confidential Bid";
      case 2:
        return "Awaiting Resolution";
      case 3:
        return "View Results & Claim";
      default:
        return "View Offering";
    }
  };

  return (
    <Link href={href} className="group block h-full">
      <Card
        className={`flex h-full flex-col justify-between gap-6 p-6 md:p-8 transition-all duration-300 rounded-[20px] ${
          isSettled
            ? "bg-white border border-indigo-500/20 shadow-[0_8px_30px_rgba(79,70,229,0.08)] group-hover:border-indigo-500/40 group-hover:shadow-[0_14px_45px_rgba(79,70,229,0.15)]"
            : "bg-white/90 border border-oxblood/15 shadow-[0_8px_30px_rgba(132,0,22,0.06)] group-hover:border-oxblood/40 group-hover:bg-white group-hover:shadow-[0_14px_45px_rgba(132,0,22,0.15)]"
        }`}
      >
        <div>
          {/* Header Row: Status Badge & Category Tag */}
          <div className="mb-4 flex items-center justify-between gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 font-body text-[10px] font-bold tracking-wider uppercase ${
                isSettled
                  ? "border-indigo-500/30 bg-indigo-50 text-indigo-700"
                  : "border-oxblood/30 bg-oxblood/10 text-oxblood"
              }`}
            >
              Private Offering
            </span>
            {getStatusBadge()}
          </div>

          {/* Primary Identifier: Human Readable Asset Offering Title */}
          <div className="mb-5">
            <h3
              className={`font-display text-2xl md:text-3xl text-charcoal transition-colors ${
                isSettled ? "group-hover:text-indigo-700" : "group-hover:text-oxblood"
              }`}
            >
              Asset Offering{" "}
              <span className="font-mono text-sm text-charcoal/60 font-normal">
                #{shortAddress(auction.address).slice(-4)}
              </span>
            </h3>
            <p className="mt-1 font-body text-xs text-charcoal/70">
              Private sealed-bid auction
            </p>
          </div>

          {/* Key Performance Indicators (KPIs) */}
          <div
            className={`grid grid-cols-2 gap-3 rounded-[14px] border p-4 font-body ${
              isSettled
                ? "border-indigo-500/15 bg-indigo-50/40"
                : "border-oxblood/10 bg-rose-50/50"
            }`}
          >
            <div>
              <span className="text-[10px] font-semibold text-charcoal/60 uppercase tracking-wider block mb-0.5">
                Total Quantity
              </span>
              <span className="font-display text-lg font-bold text-charcoal">
                {auction.quantity.toLocaleString("en-US")}{" "}
                <span className="font-sans text-xs font-normal text-charcoal/60">cASSET</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-charcoal/60 uppercase tracking-wider block mb-0.5">
                {isSettled ? "Clearing Price" : "Min Price"}
              </span>
              <span
                className={`font-display text-lg font-bold ${
                  isSettled ? "text-indigo-700" : "text-oxblood"
                }`}
              >
                {isSettled && auction.clearingPrice > BigInt(0) && auction.clearingPrice < BigInt("340282366920938463463374607431768211455")
                  ? formatScaled(auction.clearingPrice, auction.scale)
                  : formatScaled(auction.reservePrice, auction.scale)}{" "}
                <span className="font-sans text-xs font-normal text-charcoal/60">cUSD</span>
              </span>
            </div>
          </div>

          {/* Time Remaining / Settled Status Strip */}
          {isSettled ? (
            <div className="mt-3 flex items-center justify-between rounded-[12px] border border-indigo-200 bg-indigo-50/80 p-3 font-body text-xs text-indigo-950">
              <span className="font-medium flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-600" />
                Settlement Completed
              </span>
              <span className="font-semibold text-indigo-700">Results Ready ↗</span>
            </div>
          ) : auction.status === 1 && auction.deadline ? (
            <div className="mt-3 flex items-center justify-between rounded-[12px] border border-oxblood/10 bg-white p-3 font-body text-xs">
              <span className="text-charcoal/70 font-medium flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-oxblood" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Time remaining:
              </span>
              <Countdown deadline={auction.deadline} />
            </div>
          ) : null}
        </div>

        {/* Secondary Blockchain Metadata & Dynamic CTA */}
        <div className={`flex flex-col gap-3 pt-4 border-t font-body ${isSettled ? "border-indigo-500/15" : "border-oxblood/10"}`}>
          {showIssuer ? (
            <div className="flex items-center justify-between text-[11px] text-charcoal/70">
              <span>Issuer:</span>
              <span className="font-mono text-charcoal font-medium">
                {shortAddress(auction.issuer)}
              </span>
            </div>
          ) : null}

          <div className="flex items-center justify-between text-[11px] text-charcoal/60">
            <span>Contract:</span>
            <span className="font-mono text-charcoal/70">
              {shortAddress(auction.address)}
            </span>
          </div>

          <div className="mt-1">
            <span
              className={`flex w-full items-center justify-center gap-2 rounded-full py-3 px-5 font-body text-xs font-semibold text-white shadow-md transition-all duration-300 group-hover:scale-[1.02] ${
                isSettled
                  ? "bg-indigo-900 group-hover:bg-indigo-950 group-hover:shadow-[0_4px_15px_rgba(79,70,229,0.3)]"
                  : "bg-oxblood group-hover:bg-oxblood/90 group-hover:shadow-[0_4px_15px_rgba(132,0,22,0.3)]"
              }`}
            >
              <span>{getActionButtonLabel()}</span>
              <svg className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
