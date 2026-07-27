"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useAuctionList } from "@/hooks/useAuctionList";
import { AuctionCard } from "./AuctionCard";
import { CreateAuctionForm } from "./CreateAuctionForm";
import { Button } from "./Button";
import { Card } from "./Card";
import { AuthHero } from "./AuthHero";
import { IssuerWalletPanel } from "./IssuerWalletPanel";

// /issuer landing: "your auctions" (filtered by AuctionFactory being
// permissionless — issuer = whoever's connected, not a fixed address) +
// create-new-auction entry point. Detail/management for a single auction
// lives at /issuer/[address] (IssuerDashboard), navigated to after creation
// or by clicking a card.
export function IssuerListing() {
  const { address, isConnected } = useAccount();
  const { auctions, isLoading, refetch } = useAuctionList();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "pending" | "settled" | "wallet">("all");
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("tab=wallet")) {
      setFilter("wallet");
    }
  }, []);

  if (!isConnected) {
    return <AuthHero role="issuer" />;
  }

  const mine = auctions.filter((a) => a.issuer.toLowerCase() === address?.toLowerCase());

  const totalCount = mine.length;
  const activeCount = mine.filter((a) => a.status === 1).length;
  const pendingCount = mine.filter((a) => a.status === 2).length;
  const settledCount = mine.filter((a) => a.status === 3).length;

  const filteredAuctions = mine.filter((a) => {
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
            onCancel={() => setShowCreateForm(false)}
            onCreated={(addr) => {
              setShowCreateForm(false);
              refetch();
              router.push(`/issuer/${addr}`);
            }}
          />
        </div>
      ) : null}

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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {filteredAuctions
            .slice()
            .reverse()
            .map((a) => (
              <AuctionCard key={a.address} auction={a} href={`/issuer/${a.address}`} />
            ))}
        </div>
      )}
    </div>
  );
}
