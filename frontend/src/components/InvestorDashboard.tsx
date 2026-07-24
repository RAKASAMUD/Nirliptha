"use client";

import { useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { CUSD_ABI, CASSET_ABI } from "@/lib/abis";
import { CONTRACTS } from "@/lib/config";
import { useAuction } from "@/hooks/useAuction";
import { useBid } from "@/hooks/useBid";
import { useDecrypt } from "@/hooks/useDecrypt";
import { formatScaled } from "@/lib/format";
import { AuctionInfoCard } from "./AuctionInfoCard";
import { Countdown } from "./Countdown";
import { BidForm } from "./BidForm";
import { Card } from "./Card";
import { Button } from "./Button";
import { DataRow } from "./DataRow";
import { ConnectButton } from "./ConnectButton";

// The orchestrating client component for /investor. Consolidated into one
// file for the same reason as IssuerDashboard: the panel that fills the
// right column depends on connection state, bid state, AND auction status
// all at once (PLAN-FE-frontend.md Task 5's "panel kanan per skenario"
// table), which is easier to reason about as one state machine than split
// across several files that would just pass the same handful of values
// back and forth.
export function InvestorDashboard() {
  const { address, isConnected } = useAccount();
  const auctionAddress = CONTRACTS.demoAuction as `0x${string}`;
  const auction = useAuction(auctionAddress);
  const bid = useBid(auctionAddress);
  const { decrypt, isDecrypting, error: decryptError } = useDecrypt();
  const publicClient = usePublicClient();

  const [cUsdBalance, setCUsdBalance] = useState<bigint | null>(null);
  const [cAssetBalance, setCAssetBalance] = useState<bigint | null>(null);
  const [ownBid, setOwnBid] = useState<{ q: bigint; p: bigint; deposit: bigint } | null>(null);
  const [allocQty, setAllocQty] = useState<bigint | null>(null);
  const [bidStep, setBidStep] = useState<string | null>(null);
  const [bidError, setBidError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimedNow, setClaimedNow] = useState(false);

  async function decryptCUsdBalance() {
    if (!publicClient || !address) return;
    const handle = (await publicClient.readContract({
      address: CONTRACTS.cUSD as `0x${string}`,
      abi: CUSD_ABI,
      functionName: "confidentialBalanceOf",
      args: [address],
    })) as `0x${string}`;
    const value = await decrypt(handle);
    if (value !== null) setCUsdBalance(value);
  }

  async function decryptCAssetBalance() {
    if (!publicClient || !address) return;
    const handle = (await publicClient.readContract({
      address: CONTRACTS.cAsset as `0x${string}`,
      abi: CASSET_ABI,
      functionName: "confidentialBalanceOf",
      args: [address],
    })) as `0x${string}`;
    const value = await decrypt(handle);
    if (value !== null) setCAssetBalance(value);
  }

  async function handleViewBid() {
    if (!bid.bidRecord) return;
    const q = await decrypt(bid.bidRecord.handleQ);
    const p = await decrypt(bid.bidRecord.handleP);
    const deposit = await decrypt(bid.bidRecord.handleActualDeposit);
    if (q !== null && p !== null && deposit !== null) setOwnBid({ q, p, deposit });
  }

  async function handleViewResult() {
    await handleViewBid();
    if (!bid.allocation) return;
    const qty = await decrypt(bid.allocation.handleQuantity);
    if (qty !== null) setAllocQty(qty);
  }

  async function handleSubmitBid(quantity: number, price: number) {
    setBidError(null);
    try {
      const quantityRaw = BigInt(Math.round(quantity));
      const priceRaw = BigInt(Math.round(price * 1_000_000));
      await bid.submitBid(quantityRaw, priceRaw, auction.deadline, setBidStep);
      auction.refetch();
    } catch (err) {
      setBidError(err instanceof Error ? err.message : String(err));
    } finally {
      setBidStep(null);
    }
  }

  async function handleClaim() {
    setClaimError(null);
    setClaiming(true);
    try {
      await bid.claim();
      auction.refetch();
      setCUsdBalance(null); // stale post-claim, force re-decrypt
      setCAssetBalance(null);
      setClaimedNow(true);
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : String(err));
    } finally {
      setClaiming(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="grid grid-cols-1 items-start gap-gutter md:grid-cols-[40%_60%]">
        <aside className="md:sticky md:top-32">
          <AuctionInfoCard auction={auction} layout="investor" />
        </aside>
        <section>
          <Card className="p-12">
            <p className="mb-8 max-w-md font-body text-muted">
              Your bid is encrypted in your browser before it reaches the chain. No one sees your
              offer — not the issuer, not other bidders.
            </p>
            <ConnectButton />
          </Card>
        </section>
      </div>
    );
  }

  const belowReserve = ownBid !== null && ownBid.p < auction.reservePrice;
  const owedRaw = allocQty !== null ? allocQty * auction.clearingPrice : null;
  const refundRaw = owedRaw !== null && ownBid !== null ? ownBid.deposit - owedRaw : null;

  return (
    <div className="grid grid-cols-1 items-start gap-gutter md:grid-cols-[40%_60%]">
      <aside className="md:sticky md:top-32">
        <AuctionInfoCard auction={auction} layout="investor" />
      </aside>

      <section className="flex flex-col gap-8">
        {auction.status === 3 ? (
          bid.hasClaimed || claimedNow ? (
            <Card className="p-12">
              <p className="mb-2 font-mono text-xs tracking-widest text-oxblood uppercase">Claimed</p>
              <h2 className="mb-6 font-display text-3xl text-parchment">Claimed ✓</h2>
              <p className="mb-8 font-body text-muted">
                Your allocation and refund have been transferred to your wallet.
              </p>
              <div className="flex flex-col">
                <DataRow
                  label="cUSD balance"
                  value={
                    cUsdBalance !== null ? (
                      `${formatScaled(cUsdBalance, auction.scale)} cUSD`
                    ) : (
                      <button
                        onClick={decryptCUsdBalance}
                        className="font-mono text-xs uppercase tracking-[0.1em] text-oxblood hover:underline"
                      >
                        {isDecrypting ? "Sign to decrypt..." : "Decrypt"}
                      </button>
                    )
                  }
                />
                <DataRow
                  label="cAsset balance"
                  value={
                    cAssetBalance !== null ? (
                      `${cAssetBalance.toLocaleString("en-US")} cASSET`
                    ) : (
                      <button
                        onClick={decryptCAssetBalance}
                        className="font-mono text-xs uppercase tracking-[0.1em] text-oxblood hover:underline"
                      >
                        {isDecrypting ? "Sign to decrypt..." : "Decrypt"}
                      </button>
                    )
                  }
                  border={false}
                />
              </div>
            </Card>
          ) : bid.hasBid ? (
            <Card className="p-12">
              <p className="mb-2 font-mono text-xs tracking-widest text-oxblood uppercase">Your result</p>
              <h2 className="mb-4 font-display text-3xl text-parchment">
                Clearing price: {formatScaled(auction.clearingPrice, auction.scale)} cUSD
              </h2>

              {allocQty === null ? (
                <Button variant="outline" onClick={handleViewResult} disabled={isDecrypting}>
                  {isDecrypting ? "Sign to decrypt..." : "View my result"}
                </Button>
              ) : (
                <div className="flex flex-col">
                  {ownBid ? (
                    <DataRow
                      label="Your bid"
                      value={`${ownBid.q.toLocaleString("en-US")} @ ${formatScaled(ownBid.p, auction.scale)} cUSD`}
                    />
                  ) : null}
                  <DataRow label="Clearing price" value={`${formatScaled(auction.clearingPrice, auction.scale)} cUSD`} />
                  <DataRow
                    label="Your allocation"
                    value={`${allocQty.toLocaleString("en-US")} cASSET`}
                    valueClassName="font-bold text-oxblood"
                  />
                  {ownBid ? (
                    <DataRow label="Deposit locked" value={`${formatScaled(ownBid.deposit, auction.scale)} cUSD`} />
                  ) : null}
                  {owedRaw !== null ? (
                    <DataRow label="Amount owed" value={`${formatScaled(owedRaw, auction.scale)} cUSD`} border={false} />
                  ) : null}
                  {refundRaw !== null ? (
                    <div className="mt-2 flex items-center justify-between border-t-2 border-hairline-strong py-8">
                      <span className="font-mono text-sm text-parchment uppercase">Refund</span>
                      <span className="font-display text-2xl text-parchment">
                        {formatScaled(refundRaw, auction.scale)} cUSD
                      </span>
                    </div>
                  ) : null}
                  {allocQty === BigInt(0) ? (
                    <p className="mt-4 font-body text-sm text-muted">
                      {belowReserve
                        ? "Your price was below the reserve price."
                        : "The auction filled before your bid. Your deposit is fully refunded."}
                    </p>
                  ) : null}
                </div>
              )}

              {decryptError ? <p className="mt-4 font-mono text-xs text-oxblood">{decryptError}</p> : null}

              <Button variant="primary" className="mt-8 w-full" onClick={handleClaim} disabled={claiming}>
                {claiming ? "Claiming..." : "Claim tokens and refund"}
              </Button>
              {claimError ? <p className="mt-4 font-mono text-xs text-oxblood">{claimError}</p> : null}
              <p className="mt-4 text-center font-body text-[13px] text-muted">
                Claiming looks identical on-chain whether you won or lost
              </p>
            </Card>
          ) : (
            <Card className="p-12">
              <p className="font-body text-muted">You did not submit a bid in this auction.</p>
            </Card>
          )
        ) : auction.status === 2 ? (
          <Card className="p-12">
            <p className="mb-2 font-mono text-xs tracking-widest text-oxblood uppercase">Pending reveal</p>
            <h2 className="mb-6 font-display text-3xl text-parchment">
              The auction has ended. The clearing price is being revealed.
            </h2>
            {bid.hasBid ? (
              <Button variant="outline" onClick={handleViewBid} disabled={isDecrypting}>
                {isDecrypting ? "Sign to decrypt..." : "View my bid"}
              </Button>
            ) : null}
            {ownBid ? (
              <div className="mt-6 flex flex-col">
                <DataRow
                  label="Your bid"
                  value={`${ownBid.q.toLocaleString("en-US")} @ ${formatScaled(ownBid.p, auction.scale)} cUSD`}
                />
                <DataRow
                  label="Deposit locked"
                  value={`${formatScaled(ownBid.deposit, auction.scale)} cUSD`}
                  border={false}
                />
              </div>
            ) : null}
            {decryptError ? <p className="mt-4 font-mono text-xs text-oxblood">{decryptError}</p> : null}
          </Card>
        ) : bid.hasBid ? (
          <Card className="p-12">
            <p className="mb-2 font-mono text-xs tracking-widest text-oxblood uppercase">Submitted</p>
            <h2 className="mb-4 font-display text-3xl text-parchment">Your bid is submitted ✓</h2>
            <p className="mb-6 font-body text-muted">
              {auction.bidCount} bid{auction.bidCount === 1 ? "" : "s"} submitted so far
            </p>
            <Countdown deadlineTs={Number(auction.deadline)} className="mb-6 font-mono text-2xl text-parchment" />
            <Button variant="outline" onClick={handleViewBid} disabled={isDecrypting}>
              {isDecrypting ? "Sign to decrypt..." : "View my bid"}
            </Button>
            {ownBid ? (
              <div className="mt-6 flex flex-col">
                <DataRow
                  label="Your bid"
                  value={`${ownBid.q.toLocaleString("en-US")} @ ${formatScaled(ownBid.p, auction.scale)} cUSD`}
                />
                <DataRow
                  label="Deposit locked"
                  value={`${formatScaled(ownBid.deposit, auction.scale)} cUSD`}
                  border={false}
                />
              </div>
            ) : null}
            {decryptError ? <p className="mt-4 font-mono text-xs text-oxblood">{decryptError}</p> : null}
          </Card>
        ) : auction.bidCount >= 5 ? (
          <Card className="p-12">
            <p className="font-body text-muted">This auction has reached its bid limit.</p>
          </Card>
        ) : (
          <>
            <BidForm
              reservePrice={Number(auction.reservePrice) / Number(auction.scale)}
              balance={cUsdBalance !== null ? Number(cUsdBalance) / Number(auction.scale) : null}
              onDecryptBalance={decryptCUsdBalance}
              onSubmit={handleSubmitBid}
            />
            {bidStep ? <p className="font-mono text-xs text-muted">{bidStep}</p> : null}
            {bidError ? <p className="font-mono text-xs text-oxblood">{bidError}</p> : null}
          </>
        )}
      </section>
    </div>
  );
}
