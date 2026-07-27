"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuctionList } from "@/hooks/useAuctionList";
import { AuctionCard } from "./AuctionCard";

export function InvestorListing() {
  const { auctions, isLoading } = useAuctionList();
  const [activeTab, setActiveTab] = useState<"all" | "live" | "pending" | "settled">("all");

  const liveAuctions = auctions.filter((a) => a.status === 1);
  const pendingAuctions = auctions.filter((a) => a.status === 2);
  const settledAuctions = auctions.filter((a) => a.status === 3);

  const filteredAuctions = auctions.filter((a) => {
    if (activeTab === "live") return a.status === 1;
    if (activeTab === "pending") return a.status === 2;
    if (activeTab === "settled") return a.status === 3;
    return true;
  });

  return (
    <div className="mx-auto max-w-(--container-max-width) px-margin-mobile md:px-margin-desktop">
      {/* 1. HERO SECTION: FRAMELESS EDITORIAL HEADER + LIVE METRICS STRIP */}
      <header className="mb-20 pt-4 pb-16 border-b border-oxblood/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-8">
            <span className="inline-flex items-center gap-2 font-body text-xs font-semibold text-oxblood uppercase tracking-widest mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-oxblood animate-pulse" />
              Private Primary Marketplace
            </span>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-charcoal tracking-tight leading-[1.1]">
              Private Asset Offerings
            </h1>
            <p className="mt-4 max-w-2xl font-body text-base text-charcoal/80 leading-relaxed">
              Discover real-world asset offerings with complete bid privacy. Submit your offer confidentially without revealing your investment strategy or risking price manipulation.
            </p>
          </div>

          {/* Right Column: Key Marketplace Trust Metrics */}
          <div className="lg:col-span-4 flex flex-col gap-3 font-body">
            <div className="rounded-[16px] border border-oxblood/10 bg-white/70 p-4 backdrop-blur-md shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-charcoal/60 uppercase tracking-wider block">
                  Active Offerings
                </span>
                <span className="font-display text-xl font-bold text-charcoal">
                  {isLoading ? "..." : `${liveAuctions.length} Live`}
                </span>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            </div>

            <div className="rounded-[16px] border border-oxblood/10 bg-white/70 p-4 backdrop-blur-md shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-charcoal/60 uppercase tracking-wider block">
                  Privacy Guarantee
                </span>
                <span className="font-body text-xs font-semibold text-oxblood">
                  Hardware Enclave Encrypted
                </span>
              </div>
              <svg className="h-5 w-5 text-oxblood" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <Link
              href="/investor/wallet"
              className="rounded-[16px] border border-oxblood/20 bg-oxblood text-white p-3.5 backdrop-blur-md shadow-sm flex items-center justify-between font-body text-xs font-semibold hover:bg-oxblood/90 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white">
                  💳
                </div>
                <span>My Wallet & Balances</span>
              </div>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. ONBOARDING PROCESS TRACK: FRAMELESS HORIZONTAL CONNECTOR (NO OUTER CARD) */}
      <section className="mb-24">
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="font-body text-xs font-semibold text-oxblood uppercase tracking-wider block mb-1">
              Investor Guide
            </span>
            <h2 className="font-display text-2xl md:text-4xl text-charcoal">
              How it works
            </h2>
          </div>
          <p className="font-body text-xs text-charcoal/70 max-w-sm leading-relaxed">
            A simple, transparent 4-step process to participate in private asset offerings.
          </p>
        </div>

        {/* Horizontal Connected Process Track */}
        <div className="relative grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Connector Line for Desktop */}
          <div className="hidden lg:block absolute top-6 left-12 right-12 h-0.5 bg-oxblood/15 -z-0" />

          {/* Step 1 */}
          <div className="relative z-10 flex flex-col gap-3 font-body">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-oxblood bg-white font-mono text-sm font-bold text-oxblood shadow-sm">
              01
            </div>
            <h4 className="font-semibold text-base text-charcoal">Explore offerings</h4>
            <p className="text-xs text-charcoal/70 leading-relaxed">
              Browse available asset offerings, total quantities, and minimum starting prices.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative z-10 flex flex-col gap-3 font-body">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-oxblood bg-white font-mono text-sm font-bold text-oxblood shadow-sm">
              02
            </div>
            <h4 className="font-semibold text-sm text-charcoal">Place your bid</h4>
            <p className="text-xs text-charcoal/70 leading-relaxed">
              Choose how much you want to buy and the highest price you are willing to pay. Your offer stays private.
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative z-10 flex flex-col gap-3 font-body">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-oxblood bg-white font-mono text-sm font-bold text-oxblood shadow-sm">
              03
            </div>
            <h4 className="font-semibold text-sm text-charcoal">Fair price discovery</h4>
            <p className="text-xs text-charcoal/70 leading-relaxed">
              Once the offering closes, a single fair clearing price is calculated. Everyone pays the exact same final price.
            </p>
          </div>

          {/* Step 4 */}
          <div className="relative z-10 flex flex-col gap-3 font-body">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-oxblood bg-white font-mono text-sm font-bold text-oxblood shadow-sm">
              04
            </div>
            <h4 className="font-semibold text-sm text-charcoal">Instant settlement</h4>
            <p className="text-xs text-charcoal/70 leading-relaxed">
              Receive your allocated assets if your bid succeeds, or get an immediate automatic refund if outbid.
            </p>
          </div>
        </div>

        {/* 3. ASYMMETRIC HIGHLIGHT STRIP: FAIR PRICING GUARANTEE */}
        <div className="mt-12 rounded-[20px] border border-emerald-500/20 bg-emerald-50/60 p-6 md:p-8 backdrop-blur-md shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-5 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <span className="font-body text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                  Uniform Price Mechanics
                </span>
                <h4 className="font-display text-xl text-emerald-950 font-semibold">
                  Fair Pricing Protection Guarantee
                </h4>
              </div>
            </div>

            <div className="lg:col-span-7 font-body text-xs text-emerald-900/85 leading-relaxed border-t lg:border-t-0 lg:border-l border-emerald-500/20 pt-4 lg:pt-0 lg:pl-6">
              Even if you bid a higher price (e.g. $1.50/token), you only pay the final uniform clearing price (e.g. $1.10). 100% of the price difference ($0.40) is automatically refunded to your wallet upon settlement.
            </div>
          </div>
        </div>
      </section>

      {/* 4. MARKETPLACE GRID SECTION: HIGH-CONTRAST ELEVATED CARDS WITH TAB FILTER */}
      <section className="pt-8 pb-16 border-t border-oxblood/10">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-2xl md:text-4xl text-charcoal">
              Asset Offerings
            </h2>
          </div>

          {/* Filter Tab Bar */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-oxblood/15 bg-white/80 p-1.5 backdrop-blur-md shadow-xs font-body text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`rounded-full px-4 py-1.5 transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-oxblood text-white shadow-xs"
                  : "text-charcoal/70 hover:text-charcoal hover:bg-rose-50/50"
              }`}
            >
              All ({auctions.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("live")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-all cursor-pointer ${
                activeTab === "live"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-charcoal/70 hover:text-emerald-700 hover:bg-emerald-50/60"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Bidding ({liveAuctions.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-all cursor-pointer ${
                activeTab === "pending"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-charcoal/70 hover:text-amber-700 hover:bg-amber-50/60"
              }`}
            >
              Resolution Pending ({pendingAuctions.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("settled")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-all cursor-pointer ${
                activeTab === "settled"
                  ? "bg-indigo-900 text-white shadow-xs"
                  : "text-charcoal/70 hover:text-indigo-700 hover:bg-indigo-50/60"
              }`}
            >
              ✓ Settled ({settledAuctions.length})
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <p className="font-mono text-xs text-oxblood/70 animate-pulse">
              Loading active offerings...
            </p>
          </div>
        ) : filteredAuctions.length === 0 ? (
          <div className="rounded-[20px] border border-oxblood/10 bg-white/80 p-12 text-center font-body shadow-sm">
            <p className="text-base font-medium text-charcoal">No offerings found for this status.</p>
            <p className="text-xs text-charcoal/70 mt-1">Try switching to another tab filter above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {filteredAuctions
              .slice()
              .reverse()
              .map((a) => (
                <AuctionCard key={a.address} auction={a} href={`/investor/${a.address}`} showIssuer />
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
