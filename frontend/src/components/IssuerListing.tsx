"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useAuctionList } from "@/hooks/useAuctionList";
import { AuctionCard } from "./AuctionCard";
import { CreateAuctionForm } from "./CreateAuctionForm";
import { Button } from "./Button";
import { Card } from "./Card";
import { ConnectButton } from "./ConnectButton";

// /issuer landing: "your auctions" (filtered by AuctionFactory being
// permissionless — issuer = whoever's connected, not a fixed address) +
// create-new-auction entry point. Detail/management for a single auction
// lives at /issuer/[address] (IssuerDashboard), navigated to after creation
// or by clicking a card.
export function IssuerListing() {
  const { address, isConnected } = useAccount();
  const { auctions, isLoading, refetch } = useAuctionList();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const router = useRouter();

  if (!isConnected) {
    return (
      <div className="py-section-gap text-center">
        <p className="mb-8 font-body text-muted">
          Connect your wallet to create and manage confidential auctions.
        </p>
        <ConnectButton />
      </div>
    );
  }

  const mine = auctions.filter((a) => a.issuer.toLowerCase() === address?.toLowerCase());

  return (
    <>
      <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="mb-4 font-mono text-xs tracking-widest text-muted uppercase">
            Issuer Dashboard
          </p>
          <h1 className="font-display text-4xl text-parchment md:text-6xl">Your auctions</h1>
        </div>
        <Button variant="outline" onClick={() => setShowCreateForm((v) => !v)}>
          {showCreateForm ? "Cancel" : "Create new auction"}
        </Button>
      </header>

      {showCreateForm ? (
        <div className="mb-section-gap">
          <CreateAuctionForm
            onCreated={(addr) => {
              setShowCreateForm(false);
              refetch();
              router.push(`/issuer/${addr}`);
            }}
          />
        </div>
      ) : null}

      {isLoading ? (
        <p className="font-mono text-xs text-muted">Loading auctions from Sepolia...</p>
      ) : mine.length === 0 ? (
        <Card className="p-12">
          <p className="font-body text-muted">You haven&apos;t created an auction yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {mine
            .slice()
            .reverse()
            .map((a) => (
              <AuctionCard key={a.address} auction={a} href={`/issuer/${a.address}`} />
            ))}
        </div>
      )}
    </>
  );
}
