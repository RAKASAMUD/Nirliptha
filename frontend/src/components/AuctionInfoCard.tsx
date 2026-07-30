import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "./Card";
import { EncryptedValue } from "./EncryptedValue";
import { Countdown } from "./Countdown";
import { StatusBar } from "./StatusBar";
import { formatScaled, shortAddress, etherscanTx } from "@/lib/format";
import { getOfferingTitle } from "@/lib/offeringTitles";
import type { useAuction } from "@/hooks/useAuction";

type Props = {
  auction: ReturnType<typeof useAuction>;
  auctionAddress?: `0x${string}`;
  layout?: "issuer" | "investor";
  action?: React.ReactNode;
  isIssuer?: boolean;
};

export function AuctionInfoCard({ auction, auctionAddress, layout = "issuer", action }: Props) {
  const isSettled = auction.status === 3;
  const isIssuerLayout = layout === "issuer";
  const displayAddress = auctionAddress || auction.safeAddress;

  const [offeringTitle, setOfferingTitle] = useState(() => getOfferingTitle(displayAddress));

  useEffect(() => {
    if (!displayAddress) return;
    setOfferingTitle(getOfferingTitle(displayAddress));

    const handleUpdate = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail?.address === displayAddress.toLowerCase()) {
        setOfferingTitle(customEvt.detail.title);
      }
    };
    window.addEventListener("offeringTitleUpdated", handleUpdate);
    return () => window.removeEventListener("offeringTitleUpdated", handleUpdate);
  }, [displayAddress]);

  const renderStatusBadge = () => {
    switch (auction.status) {
      case 1:
        return (
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 font-body text-xs font-semibold tracking-wider text-emerald-400 uppercase shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Bidding Live
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 font-body text-xs font-semibold tracking-wider text-amber-400 uppercase">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            Resolution Pending
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-4 py-1.5 font-body text-xs font-semibold tracking-wider text-indigo-300 uppercase">
            Auction Settled
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
    <Card
      className={
        isIssuerLayout
          ? "p-8 md:p-10 shadow-2xl bg-surface/85 backdrop-blur-2xl border border-white/15 rounded-[24px] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] transition-all"
          : "p-8 md:p-10 shadow-2xl bg-white/75 backdrop-blur-2xl border border-oxblood/20 rounded-[24px] shadow-[0_8px_32px_0_rgba(132,0,22,0.12)] transition-all"
      }
    >
      {/* Back Button */}
      <div className="mb-6">
        <Link
          href={isIssuerLayout ? "/issuer" : "/investor"}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-body text-xs font-semibold transition-all duration-300 ${
            isIssuerLayout
              ? "border-white/15 bg-white/10 text-parchment backdrop-blur-md hover:bg-white/20 hover:border-oxblood/40 hover:text-oxblood-light"
              : "border-oxblood/20 bg-white/80 text-charcoal backdrop-blur-md hover:bg-white hover:border-oxblood/40 hover:text-oxblood"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to {isIssuerLayout ? "Issuer Dashboard" : "Asset Offerings"}
        </Link>
      </div>

      {/* Top Header Row */}
      <div
        className={`mb-6 flex flex-wrap items-center justify-between gap-4 border-b pb-6 ${
          isIssuerLayout ? "border-hairline-strong" : "border-oxblood/10"
        }`}
      >
        <div>
          <h2 className={`font-display text-3xl md:text-4xl ${isIssuerLayout ? "text-parchment" : "text-charcoal"}`}>
            {offeringTitle}
          </h2>
          {displayAddress ? (
            <a
              href={etherscanTx(displayAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs text-muted hover:text-oxblood transition-colors"
            >
              <span>Contract: {shortAddress(displayAddress)}</span>
              <span>↗</span>
            </a>
          ) : null}
        </div>
        {renderStatusBadge()}
      </div>

      {/* GSAP Animated 4-Stage Circle & Connector Status Bar */}
      <div className="my-6">
        <StatusBar current={auction.status} />
      </div>

      {/* Main KPI Highlight Blocks (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div
          className={`rounded-[18px] border p-6 backdrop-blur-md transition-all ${
            isIssuerLayout
              ? "border-white/10 bg-black/40 shadow-inner hover:border-white/25 hover:bg-black/50"
              : "border-oxblood/15 bg-white/60 shadow-xs hover:border-oxblood/30 hover:bg-white/80"
          }`}
        >
          <span
            className={`font-body text-xs font-semibold uppercase tracking-wider block mb-1 ${
              isIssuerLayout ? "text-muted" : "text-charcoal/60"
            }`}
          >
            Quantity For Sale
          </span>
          <p className={`font-display text-2xl md:text-3xl ${isIssuerLayout ? "text-parchment" : "text-charcoal"}`}>
            {auction.quantity.toLocaleString("en-US")}{" "}
            <span className="font-sans text-base font-normal opacity-70">cASSET</span>
          </p>
        </div>

        <div
          className={`rounded-[18px] border p-6 backdrop-blur-md transition-all ${
            isIssuerLayout
              ? "border-white/10 bg-black/40 shadow-inner hover:border-white/25 hover:bg-black/50"
              : "border-oxblood/15 bg-white/60 shadow-xs hover:border-oxblood/30 hover:bg-white/80"
          }`}
        >
          <span
            className={`font-body text-xs font-semibold uppercase tracking-wider block mb-1 ${
              isIssuerLayout ? "text-muted" : "text-charcoal/60"
            }`}
          >
            {isSettled ? "Clearing Price" : "Minimum Starting Price"}
          </span>
          <p
            className={`font-display text-2xl md:text-3xl ${
              isSettled ? "text-indigo-400" : isIssuerLayout ? "text-parchment" : "text-oxblood"
            }`}
          >
            {isSettled &&
            auction.clearingPrice > BigInt(0) &&
            auction.clearingPrice < BigInt("340282366920938463463374607431768211455")
              ? formatScaled(auction.clearingPrice, auction.scale)
              : formatScaled(auction.reservePrice, auction.scale)}{" "}
            <span className="font-sans text-base font-normal opacity-70">cUSD</span>
          </p>
        </div>

        <div
          className={`rounded-[18px] border p-6 backdrop-blur-md transition-all ${
            isIssuerLayout
              ? "border-white/10 bg-black/40 shadow-inner hover:border-white/25 hover:bg-black/50"
              : "border-oxblood/15 bg-white/60 shadow-xs hover:border-oxblood/30 hover:bg-white/80"
          }`}
        >
          <span
            className={`font-body text-xs font-semibold uppercase tracking-wider block mb-1 ${
              isIssuerLayout ? "text-muted" : "text-charcoal/60"
            }`}
          >
            Bids Submitted
          </span>
          <p className={`font-display text-2xl md:text-3xl ${isIssuerLayout ? "text-parchment" : "text-charcoal"}`}>
            {auction.bidCount} <span className="font-sans text-base font-normal opacity-70">/ 5 Bidders</span>
          </p>
        </div>
      </div>

      {/* Countdown Strip for Active Auction */}
      {auction.status === 1 ? (
        <div
          className={`mt-8 rounded-[18px] border p-6 text-center shadow-inner backdrop-blur-md ${
            isIssuerLayout ? "border-white/10 bg-black/50" : "border-oxblood/20 bg-white/80"
          }`}
        >
          <p
            className={`mb-3 font-body text-xs font-semibold uppercase tracking-widest ${
              isIssuerLayout ? "text-muted" : "text-oxblood"
            }`}
          >
            {isIssuerLayout ? "Offering Closes In" : "Bidding Period Closes In"}
          </p>
          <Countdown
            deadline={auction.deadline}
            className={`font-body text-4xl font-bold tracking-tight ${
              isIssuerLayout ? "text-parchment" : "text-charcoal"
            }`}
          />
        </div>
      ) : null}

      {/* Unsold Balance for Settled Auction */}
      {isSettled ? (
        <div
          className={`mt-8 border-t pt-6 ${
            isIssuerLayout ? "border-hairline-strong" : "border-oxblood/10"
          }`}
        >
          <p
            className={`mb-2 font-body text-xs font-semibold uppercase tracking-widest ${
              isIssuerLayout ? "text-muted" : "text-charcoal/70"
            }`}
          >
            Unsold Asset Balance
          </p>
          <EncryptedValue />
        </div>
      ) : null}

      {/* Embedded Action Panel */}
      {action ? (
        <div
          className={`mt-8 border-t pt-6 ${
            isIssuerLayout ? "border-hairline-strong" : "border-oxblood/10"
          }`}
        >
          {action}
        </div>
      ) : null}
    </Card>
  );
}
