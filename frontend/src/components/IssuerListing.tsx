"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { useAuctionList } from "@/hooks/useAuctionList";
import { AuctionCard } from "./AuctionCard";
import { CreateAuctionForm } from "./CreateAuctionForm";
import { Button } from "./Button";
import { Card } from "./Card";
import { AuthHero } from "./AuthHero";
import { IssuerWalletPanel } from "./IssuerWalletPanel";
import { getOfferingTitle } from "@/lib/offeringTitles";

// /issuer landing: "your auctions" (filtered by AuctionFactory being
// permissionless — issuer = whoever's connected, not a fixed address) +
// create-new-auction entry point. Detail/management for a single auction
// lives at /issuer/[address] (IssuerDashboard), navigated to after creation
// or by clicking a card.
export function IssuerListing() {
  const { address, isConnected } = useAccount();
  const { auctions, isLoading, refetch } = useAuctionList();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [resumeAddress, setResumeAddress] = useState<`0x${string}` | undefined>(undefined);
  const [filter, setFilter] = useState<"all" | "active" | "pending" | "settled" | "wallet">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("tab=wallet")) {
      setFilter("wallet");
    }
    // Auto-open form in resume mode if ?resume=0x... is in the URL
    const resume = searchParams.get("resume");
    if (resume && /^0x[a-fA-F0-9]{40}$/.test(resume)) {
      setResumeAddress(resume as `0x${string}`);
      setShowCreateForm(true);
      // Clean URL without reload
      router.replace("/issuer");
    }
  }, [searchParams]);

  if (!isConnected) {
    return <AuthHero role="issuer" />;
  }

  const mine = auctions.filter((a) => a.issuer.toLowerCase() === address?.toLowerCase());

  // Status 0 = incomplete setup (wizard was cancelled mid-way)
  const incompleteSetup = mine.filter((a) => a.status === 0);
  const completed = mine.filter((a) => a.status !== 0);

  const totalCount = completed.length;
  const activeCount = completed.filter((a) => a.status === 1).length;
  const pendingCount = completed.filter((a) => a.status === 2).length;
  const settledCount = completed.filter((a) => a.status === 3).length;

  const filteredAuctions = completed.filter((a) => {
    if (filter === "active") return a.status === 1;
    if (filter === "pending") return a.status === 2;
    if (filter === "settled") return a.status === 3;
    return true;
  });

  return (
    <div className="mx-auto max-w-(--container-max-width) px-margin-mobile py-6 md:px-margin-desktop">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="mb-3 font-body text-xs font-medium tracking-widest text-muted uppercase">
            Issuer &middot; Confidential Primary Issuance
          </p>
          <h1 className="font-display text-4xl text-parchment md:text-6xl">Your auctions</h1>
        </div>
        <Button variant="primary" onClick={() => setShowCreateForm((v) => !v)} className="cursor-pointer">
          {showCreateForm ? "Cancel" : "+ Create new auction"}
        </Button>
      </header>

      {/* Summary Stat Blocks */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex flex-col gap-1 p-6">
          <span className="font-body text-xs font-medium text-muted uppercase tracking-wider">Total Auctions</span>
          <span className="font-display text-4xl text-parchment">{totalCount}</span>
        </Card>
        <Card className="flex flex-col gap-1 p-6">
          <span className="font-body text-xs font-medium text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Active Auctions
          </span>
          <span className="font-display text-4xl text-emerald-400">{activeCount}</span>
        </Card>
        <Card className="flex flex-col gap-1 p-6">
          <span className="font-body text-xs font-medium text-muted uppercase tracking-wider">Settled Deals</span>
          <span className="font-display text-4xl text-parchment">{settledCount}</span>
        </Card>
      </div>

      {showCreateForm ? (
        <div className="mb-section-gap">
          <CreateAuctionForm
            resumeAddress={resumeAddress}
            onCancel={() => { setShowCreateForm(false); setResumeAddress(undefined); }}
            onCreated={(addr) => {
              setShowCreateForm(false);
              setResumeAddress(undefined);
              refetch();
              router.push(`/issuer/${addr}`);
            }}
          />
        </div>
      ) : null}

      {/* Incomplete Setup Banner — status 0 auctions (wizard cancelled mid-way) */}
      {incompleteSetup.length > 0 && !showCreateForm && (
        <div className="mb-8 flex flex-col gap-3">
          <p className="font-body text-xs font-semibold uppercase tracking-widest text-amber-400 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            Incomplete Setup ({incompleteSetup.length})
          </p>
          {incompleteSetup.map((a) => (
            <div
              key={a.address}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-[16px] border border-amber-500/30 bg-amber-500/5 px-5 py-4 font-body"
            >
              <div>
                <p className="text-sm font-semibold text-parchment">
                  {getOfferingTitle(a.address)}{" "}
                  <span className="font-mono text-xs text-muted">#{a.address.slice(-4)}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-amber-300/80">
                  Setup dibatalkan sebelum selesai — escrow belum dikonfirmasi.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => router.push(`/issuer/${a.address}`)}
                  className="rounded-full bg-amber-500/20 border border-amber-500/40 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer"
                >
                  ▶ Resume Setup
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-8 flex flex-wrap gap-2 border-b border-hairline-strong pb-4">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-4 py-1.5 font-body text-xs font-medium transition-all cursor-pointer ${
            filter === "all"
              ? "bg-white text-charcoal font-medium"
              : "text-muted hover:bg-white/5 hover:text-parchment"
          }`}
        >
          All ({totalCount})
        </button>
        <button
          onClick={() => setFilter("active")}
          className={`rounded-full px-4 py-1.5 font-body text-xs font-medium transition-all cursor-pointer ${
            filter === "active"
              ? "bg-emerald-500 text-charcoal font-medium"
              : "text-muted hover:bg-white/5 hover:text-parchment"
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`rounded-full px-4 py-1.5 font-body text-xs font-medium transition-all cursor-pointer ${
            filter === "pending"
              ? "bg-amber-500 text-charcoal font-medium"
              : "text-muted hover:bg-white/5 hover:text-parchment"
          }`}
        >
          Pending Reveal ({pendingCount})
        </button>
        <button
          onClick={() => setFilter("settled")}
          className={`rounded-full px-4 py-1.5 font-body text-xs font-medium transition-all cursor-pointer ${
            filter === "settled"
              ? "bg-oxblood text-white font-medium"
              : "text-muted hover:bg-white/5 hover:text-parchment"
          }`}
        >
          Settled ({settledCount})
        </button>
        <button
          onClick={() => setFilter("wallet")}
          className={`rounded-full px-4 py-1.5 font-body text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
            filter === "wallet"
              ? "bg-white text-charcoal font-semibold shadow-md"
              : "text-muted hover:bg-white/5 hover:text-parchment"
          }`}
        >
          <span>💳 Wallet &amp; Balances</span>
        </button>
      </div>

      {filter === "wallet" ? (
        <IssuerWalletPanel />
      ) : isLoading ? (
        <p className="font-mono text-xs text-muted">Loading auctions from Sepolia...</p>
      ) : mine.length === 0 ? (
        <Card className="flex flex-col items-center gap-6 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-oxblood/30 bg-oxblood/10">
            <span className="font-display text-2xl text-oxblood">+</span>
          </div>
          <div>
            <h3 className="mb-2 font-display text-2xl text-parchment">No auctions found</h3>
            <p className="max-w-md font-body text-muted">
              You haven&apos;t created any confidential auctions yet. Create your first RWA auction to get started.
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowCreateForm(true)}>
            Create your first auction
          </Button>
        </Card>
      ) : filteredAuctions.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-body text-muted">No auctions match the selected filter.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {filteredAuctions
              .slice()
              .reverse()
              .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
              .map((a) => (
                <AuctionCard key={a.address} auction={a} href={`/issuer/${a.address}`} layout="issuer" />
              ))}
          </div>

          {/* Pagination Carousel Controls (1, 2, 3...) */}
          {Math.ceil(filteredAuctions.length / ITEMS_PER_PAGE) > 1 && (
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10 font-body text-xs">
              <div className="text-muted">
                Showing <span className="font-bold text-parchment">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>–
                <span className="font-bold text-parchment">{Math.min(currentPage * ITEMS_PER_PAGE, filteredAuctions.length)}</span> of{" "}
                <span className="font-bold text-parchment">{filteredAuctions.length}</span> auctions
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-parchment hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all"
                >
                  &larr; Prev
                </button>

                {Array.from({ length: Math.ceil(filteredAuctions.length / ITEMS_PER_PAGE) }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-8 w-8 rounded-lg border font-mono text-xs font-bold transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? "border-oxblood bg-oxblood text-white shadow-xs"
                        : "border-white/20 bg-white/5 text-parchment hover:bg-white/10"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(Math.ceil(filteredAuctions.length / ITEMS_PER_PAGE), p + 1))}
                  disabled={currentPage === Math.ceil(filteredAuctions.length / ITEMS_PER_PAGE)}
                  className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-parchment hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all"
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
