import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "./Card";
import { formatScaled, shortAddress } from "@/lib/format";
import { getOfferingTitle } from "@/lib/offeringTitles";
import { Countdown } from "./Countdown";
import type { AuctionSummary } from "@/hooks/useAuctionList";

type Props = {
  auction: AuctionSummary;
  href: string;
  showIssuer?: boolean;
  layout?: "issuer" | "investor";
};

export function AuctionCard({ auction, href, showIssuer = false, layout = "investor" }: Props) {
  const isSettled = auction.status === 3;
  const isIssuerLayout = layout === "issuer";

  const [offeringTitle, setOfferingTitle] = useState("Asset Offering");

  useEffect(() => {
    setOfferingTitle(getOfferingTitle(auction.address));
  }, [auction.address]);

  const getStatusBadge = () => {
    switch (auction.status) {
      case 1:
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-body text-[11px] font-bold tracking-wider uppercase ${
              isIssuerLayout
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-emerald-500/30 bg-emerald-50 text-emerald-700 shadow-xs"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Bidding Live
          </span>
        );
      case 2:
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-body text-[11px] font-bold tracking-wider uppercase ${
              isIssuerLayout
                ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                : "border-amber-500/30 bg-amber-50 text-amber-700 shadow-xs"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Resolution Pending
          </span>
        );
      case 3:
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-body text-[11px] font-bold tracking-wider uppercase ${
              isIssuerLayout
                ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300"
                : "border-indigo-500/30 bg-indigo-50 text-indigo-700 shadow-xs"
            }`}
          >
            Auction Settled
          </span>
        );
      default:
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-body text-[11px] font-semibold tracking-wider uppercase ${
              isIssuerLayout
                ? "border-hairline-strong bg-white/5 text-muted"
                : "border-gray-300 bg-gray-100 text-gray-600"
            }`}
          >
            Awaiting Escrow
          </span>
        );
    }
  };

  const getActionButtonLabel = () => {
    switch (auction.status) {
      case 1:
        return isIssuerLayout ? "Manage Offering" : "Place Confidential Bid";
      case 2:
        return isIssuerLayout ? "Finalize & Reveal" : "Awaiting Resolution";
      case 3:
        return isIssuerLayout ? "Withdraw Revenue" : "View Results & Claim";
      default:
        return "View Offering";
    }
  };

  return (
    <Link href={href} className="group block h-full">
      <Card
        className={`flex h-full flex-col justify-between gap-6 p-6 md:p-8 transition-all duration-300 rounded-[20px] ${
          isIssuerLayout
            ? "bg-surface border border-hairline-strong shadow-xl hover:border-oxblood/40 hover:bg-surface-elevated"
            : isSettled
            ? "bg-white border border-indigo-500/20 shadow-[0_8px_30px_rgba(79,70,229,0.08)] group-hover:border-indigo-500/40 group-hover:shadow-[0_14px_45px_rgba(79,70,229,0.15)]"
            : "bg-white/90 border border-oxblood/15 shadow-[0_8px_30px_rgba(132,0,22,0.06)] group-hover:border-oxblood/40 group-hover:bg-white group-hover:shadow-[0_14px_45px_rgba(132,0,22,0.15)]"
        }`}
      >
        <div>
          {/* Header Row: Status Badge & Tag */}
          <div className="mb-4 flex items-center justify-between gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 font-body text-[10px] font-bold tracking-wider uppercase ${
                isIssuerLayout
                  ? "border-oxblood/40 bg-oxblood/20 text-parchment"
                  : isSettled
                  ? "border-indigo-500/30 bg-indigo-50 text-indigo-700"
                  : "border-oxblood/30 bg-oxblood/10 text-oxblood"
              }`}
            >
              Private Offering
            </span>
            {getStatusBadge()}
          </div>

          {/* Primary Identifier */}
          <div className="mb-5">
            <h3
              className={`font-display text-2xl md:text-3xl transition-colors ${
                isIssuerLayout
                  ? "text-parchment group-hover:text-oxblood-light"
                  : isSettled
                  ? "text-charcoal group-hover:text-indigo-700"
                  : "text-charcoal group-hover:text-oxblood"
              }`}
            >
              {offeringTitle}{" "}
              <span className={`font-mono text-sm font-normal ${isIssuerLayout ? "text-muted" : "text-charcoal/60"}`}>
                #{shortAddress(auction.address).slice(-4)}
              </span>
            </h3>
            <p className={`mt-1 font-body text-xs ${isIssuerLayout ? "text-muted" : "text-charcoal/70"}`}>
              Private sealed-bid auction &middot; Uniform price discovery
            </p>
          </div>

          {/* Key Performance Indicators (KPIs) */}
          <div
            className={`grid grid-cols-2 gap-3 rounded-[14px] border p-4 font-body ${
              isIssuerLayout
                ? "border-hairline-strong bg-black/40"
                : isSettled
                ? "border-indigo-500/15 bg-indigo-50/40"
                : "border-oxblood/10 bg-rose-50/50"
            }`}
          >
            <div>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider block mb-0.5 ${
                  isIssuerLayout ? "text-muted" : "text-charcoal/60"
                }`}
              >
                Total Quantity
              </span>
              <span className={`font-display text-lg font-bold ${isIssuerLayout ? "text-parchment" : "text-charcoal"}`}>
                {auction.quantity.toLocaleString("en-US")}{" "}
                <span className={`font-sans text-xs font-normal ${isIssuerLayout ? "text-muted" : "text-charcoal/60"}`}>
                  cASSET
                </span>
              </span>
            </div>
            <div>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider block mb-0.5 ${
                  isIssuerLayout ? "text-muted" : "text-charcoal/60"
                }`}
              >
                {isSettled ? "Clearing Price" : "Min Price"}
              </span>
              <span
                className={`font-display text-lg font-bold ${
                  isIssuerLayout
                    ? "text-parchment"
                    : isSettled
                    ? "text-indigo-700"
                    : "text-oxblood"
                }`}
              >
                {isSettled && auction.clearingPrice > BigInt(0) && auction.clearingPrice < BigInt("340282366920938463463374607431768211455")
                  ? formatScaled(auction.clearingPrice, auction.scale)
                  : formatScaled(auction.reservePrice, auction.scale)}{" "}
                <span className={`font-sans text-xs font-normal ${isIssuerLayout ? "text-muted" : "text-charcoal/60"}`}>
                  cUSD
                </span>
              </span>
            </div>
          </div>

          {/* Time Remaining / Settled Status Strip */}
          {isSettled ? (
            <div
              className={`mt-3 flex items-center justify-between rounded-[12px] border p-3 font-body text-xs ${
                isIssuerLayout
                  ? "border-indigo-500/30 bg-indigo-950/40 text-indigo-200"
                  : "border-indigo-200 bg-indigo-50/80 text-indigo-950"
              }`}
            >
              <span className="font-medium flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-400" />
                Settlement Completed
              </span>
              <span className="font-semibold text-indigo-400">Details ↗</span>
            </div>
          ) : auction.status === 1 && auction.deadline ? (
            <div
              className={`mt-3 flex items-center justify-between rounded-[12px] border p-3 font-body text-xs ${
                isIssuerLayout
                  ? "border-hairline-strong bg-black/40 text-parchment"
                  : "border-oxblood/10 bg-white text-charcoal/70"
              }`}
            >
              <span className="font-medium flex items-center gap-1.5">
                <svg className={`h-3.5 w-3.5 ${isIssuerLayout ? "text-oxblood-light" : "text-oxblood"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Time remaining:
              </span>
              <Countdown deadline={auction.deadline} />
            </div>
          ) : null}
        </div>

        {/* Secondary Blockchain Metadata & Dynamic CTA */}
        <div className={`flex flex-col gap-3 pt-4 border-t font-body ${isIssuerLayout ? "border-hairline-strong" : isSettled ? "border-indigo-500/15" : "border-oxblood/10"}`}>
          {showIssuer ? (
            <div className={`flex items-center justify-between text-[11px] ${isIssuerLayout ? "text-muted" : "text-charcoal/70"}`}>
              <span>Issuer:</span>
              <span className={`font-mono font-medium ${isIssuerLayout ? "text-parchment" : "text-charcoal"}`}>
                {shortAddress(auction.issuer)}
              </span>
            </div>
          ) : null}

          <div className={`flex items-center justify-between text-[11px] ${isIssuerLayout ? "text-muted" : "text-charcoal/60"}`}>
            <span>Contract:</span>
            <span className={`font-mono ${isIssuerLayout ? "text-parchment/80" : "text-charcoal/70"}`}>
              {shortAddress(auction.address)}
            </span>
          </div>

          <div className="mt-1">
            <span
              className={`flex w-full items-center justify-center gap-2 rounded-full py-3 px-5 font-body text-xs font-semibold shadow-md transition-all duration-300 group-hover:scale-[1.02] ${
                isIssuerLayout
                  ? "bg-oxblood text-white group-hover:bg-oxblood/90 group-hover:shadow-[0_4px_15px_rgba(132,0,22,0.4)]"
                  : isSettled
                  ? "bg-indigo-900 text-white group-hover:bg-indigo-950 group-hover:shadow-[0_4px_15px_rgba(79,70,229,0.3)]"
                  : "bg-oxblood text-white group-hover:bg-oxblood/90 group-hover:shadow-[0_4px_15px_rgba(132,0,22,0.3)]"
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
