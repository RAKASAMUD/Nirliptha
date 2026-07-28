"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, usePublicClient, useWalletClient } from "wagmi";
import { AUCTION_ABI } from "@/lib/abis";
import { useAuction } from "@/hooks/useAuction";
import { publicDecryptHandle } from "@/lib/nox";
import { AuctionInfoCard } from "./AuctionInfoCard";
import { LiveAllocationTable } from "./LiveAllocationTable";
import { TreasuryPayoutCard } from "./TreasuryPayoutCard";
import { AuthHero } from "./AuthHero";
import { Card } from "./Card";
import { shortAddress } from "@/lib/format";
import { getOrFetchWalletClient } from "@/lib/wallet-helper";

type Props = {
  auctionAddress: `0x${string}`;
};

export function IssuerDashboard({ auctionAddress }: Props) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [actionStep, setActionStep] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const auction = useAuction(auctionAddress);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  if (!isConnected) {
    return <AuthHero role="issuer" />;
  }

  const isIssuer =
    !!address &&
    !!auction.issuer &&
    auction.issuer !== "0x0000000000000000000000000000000000000000" &&
    address.toLowerCase() === auction.issuer.toLowerCase();

  async function runAction(label: string, fn: () => Promise<void>) {
    if (!isIssuer) {
      setActionError("Smart Contract Enforced: Connected wallet is not the authorized Issuer for this auction.");
      return;
    }
    setActionError(null);
    setActionStep(label);
    try {
      await fn();
      auction.refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionStep(null);
    }
  }

  async function handleFinalize() {
    await runAction("Finalizing...", async () => {
      const hash = await writeContractAsync({
        address: auctionAddress,
        abi: AUCTION_ABI,
        functionName: "finalize",
      });
      await publicClient?.waitForTransactionReceipt({ hash });
    });
  }

  async function handleCancelAuction() {
    if (!isIssuer) {
      setActionError("Smart Contract Enforced: Connected wallet is not the authorized Issuer for this auction.");
      return;
    }

    const nowSecs = Math.floor(Date.now() / 1000);
    if (auction.status === 1 && Number(auction.deadline) > 0 && nowSecs <= Number(auction.deadline)) {
      setActionError("Smart Contract Enforced: Auction is still active. Finalization or cancellation is locked until deadline expires.");
      return;
    }

    setActionError(null);
    setActionStep("Sending transaction to blockchain...");
    try {
      if (auction.status === 0) {
        setActionStep("Calling abandonEscrow()...");
        const hash = await writeContractAsync({
          address: auctionAddress,
          abi: AUCTION_ABI,
          functionName: "abandonEscrow",
        });
        setActionStep("Awaiting block confirmation...");
        await publicClient?.waitForTransactionReceipt({ hash });
      } else if (auction.status === 1 && auction.bidCount === 0) {
        setActionStep("Calling recoverAssetIfNoBids()...");
        const hash = await writeContractAsync({
          address: auctionAddress,
          abi: AUCTION_ABI,
          functionName: "recoverAssetIfNoBids",
        });
        setActionStep("Awaiting block confirmation...");
        await publicClient?.waitForTransactionReceipt({ hash });
      } else if (auction.status === 1) {
        setActionStep("Calling finalize()...");
        const hashFin = await writeContractAsync({
          address: auctionAddress,
          abi: AUCTION_ABI,
          functionName: "finalize",
        });
        setActionStep("Awaiting block confirmation...");
        await publicClient?.waitForTransactionReceipt({ hash: hashFin });
      }
      setActionStep("Success! cASSET returned to Safe Treasury. Redirecting...");
      await new Promise((r) => setTimeout(r, 1800));
      router.push("/issuer");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
      setActionStep(null);
    }
  }

  async function handleReveal() {
    await runAction("Revealing clearing price...", async () => {
      const activeWallet = await getOrFetchWalletClient(walletClient, address);
      if (!activeWallet) throw new Error("Connect your wallet first.");
      const clearingPriceHandle = (await publicClient?.readContract({
        address: auctionAddress,
        abi: AUCTION_ABI,
        functionName: "getClearingPriceHandle",
      })) as `0x${string}`;
      
      let proof: `0x${string}` | null = null;
      for (let attempt = 0; attempt < 6 && !proof; attempt++) {
        try {
          const result = await publicDecryptHandle(activeWallet, clearingPriceHandle);
          proof = result.proof as `0x${string}`;
        } catch {
          await new Promise((r) => setTimeout(r, 10_000));
        }
      }
      if (!proof) throw new Error("Gateway did not index the handle in time — try again.");
      const hash = await writeContractAsync({
        address: auctionAddress,
        abi: AUCTION_ABI,
        functionName: "completeSettlement",
        args: [proof],
      });
      await publicClient?.waitForTransactionReceipt({ hash });
    });
  }

  async function handleWithdraw() {
    let txHash: `0x${string}` | undefined;
    await runAction("Withdrawing to Safe...", async () => {
      const hash = await writeContractAsync({
        address: auctionAddress,
        abi: AUCTION_ABI,
        functionName: "withdrawToSafe",
      });
      txHash = hash;
      await publicClient?.waitForTransactionReceipt({ hash });
    });
    return txHash;
  }

  const deadlinePassed = Number(auction.deadline) > 0 && now > Number(auction.deadline);
  const finalizeDeadline = Number(auction.deadline) + 86400; // deadline + 24 hours
  const finalizeWindowPassed = Number(auction.deadline) > 0 && now > finalizeDeadline;
  const remainingFinalizeSecs = Math.max(0, finalizeDeadline - now);

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <>
      {/* ── GLOBAL ACTION BANNER ─────────────────────────────────── */}
      {actionStep && (
        <div className={`mb-6 rounded-[16px] border px-5 py-4 font-body text-xs flex items-center gap-3 animate-in fade-in duration-200 ${
          actionStep.startsWith("✅")
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
            : "border-amber-500/40 bg-amber-500/10 text-amber-200"
        }`}>
          {actionStep.startsWith("✅") ? (
            <span className="text-emerald-400 text-base">✅</span>
          ) : (
            <span className="h-4 w-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin shrink-0" />
          )}
          <span className="font-medium">{actionStep}</span>
        </div>
      )}
      {actionError && (
        <div className="mb-6 rounded-[16px] border border-rose-500/40 bg-rose-500/10 px-5 py-4 font-body text-xs text-rose-200 flex items-start gap-3">
          <span className="shrink-0 text-base">❌</span>
          <span>{actionError}</span>
        </div>
      )}

      {/* ── STATUS 0: INCOMPLETE SETUP ─────────────────────────── */}
      {auction.status === 0 && isIssuer && (
        <div className="mb-6 rounded-[20px] border border-amber-500/40 bg-amber-500/10 p-6 flex flex-col gap-5 font-body">
          <div className="flex items-start gap-3">
            <div>
              <h3 className="font-display text-xl text-parchment">Incomplete Setup</h3>
              <p className="mt-1 text-xs text-amber-300/80 leading-relaxed">
                The auction contract is deployed on-chain, but setup is not complete.
                Escrow collateral (<strong className="text-parchment">cASSET</strong>) has not been confirmed —
                the auction is not yet active for bidding.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-[14px] border border-amber-500/20 bg-black/30 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 mb-1">Option 1 — Resume</p>
              <p className="text-xs text-muted mb-3">Complete escrow and activate auction so investors can start bidding.</p>
              <button
                disabled={actionStep !== null}
                onClick={() => router.push(`/issuer?resume=${auctionAddress}`)}
                className="w-full rounded-full bg-amber-500 text-charcoal py-2.5 px-5 text-xs font-bold hover:bg-amber-400 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionStep ?? "Resume Setup"}
              </button>
            </div>

            <div className="rounded-[14px] border border-rose-500/20 bg-black/30 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-400 mb-1">Option 2 — Cancel</p>
              <p className="text-xs text-muted mb-3">Recover assets if transferred, then remove this auction from dashboard.</p>
              <button
                disabled={actionStep !== null}
                onClick={() => setShowCancelModal(true)}
                className="w-full rounded-full border border-rose-500/40 bg-rose-500/10 text-rose-300 py-2.5 px-5 text-xs font-bold hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionStep ?? "Abandon & Recover Asset"}
              </button>
            </div>
          </div>

          {actionError && (
            <p className="rounded-[10px] border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-300">{actionError}</p>
          )}
        </div>
      )}

      {!isIssuer && auction.issuer && auction.issuer !== "0x0000000000000000000000000000000000000000" && (
        <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 flex items-center gap-3 font-body animate-in fade-in">
          <div>
            <h4 className="font-bold text-sm text-parchment">
              Preview Mode (Read-Only Preview)
            </h4>
            <p className="text-xs text-muted mt-0.5">
              Your connected wallet (<span className="font-mono text-parchment font-semibold">{shortAddress(address || "")}</span>) is not the Issuer for this auction. Finalization access belongs to the Issuer wallet ({shortAddress(auction.issuer)}).
            </p>
          </div>
        </div>
      )}

      {/* Hide the main AuctionInfoCard for status 0 — it's an incomplete auction */}
      {auction.status === 0 ? null : (
      <section className="mb-6">
        <AuctionInfoCard
          auction={auction}
          isIssuer={isIssuer}
          layout="issuer"
          action={
            isIssuer && auction.status === 1 ? (
              <div className="flex flex-col items-center gap-3">
                {(() => {
                  const hasBids = auction.bidCount > 0;
                  const canFinalize = deadlinePassed && hasBids;


                  return (
                    <>
                      <button
                        disabled={!canFinalize || actionStep !== null}
                        onClick={() => setShowFinalizeModal(true)}
                        className={`w-full rounded-full py-3.5 px-6 font-body text-sm font-semibold transition-all cursor-pointer ${
                          !canFinalize || actionStep !== null
                            ? "bg-white/10 text-muted cursor-not-allowed border border-hairline-strong"
                            : "bg-white text-charcoal shadow-lg hover:bg-white/90 hover:scale-[1.01] active:scale-[0.99]"
                        }`}
                      >
                        {actionStep ??
                          (!deadlinePassed
                            ? "Finalize Locked (Bidding Period Live)"
                            : !hasBids
                            ? "Finalize Locked (0 Bids Submitted)"
                            : "Finalize Auction & TEE Resolve")}
                      </button>

                      {!deadlinePassed ? (
                        <div className="flex flex-col items-center gap-1 text-center font-body text-xs">
                          <p className="text-amber-400/90 font-medium flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                            Smart Contract Enforced: Finalization unlocks when auction duration expires.
                          </p>
                          <p className="text-muted/70 text-[11px]">
                            Demo Tip: Create a new auction with a 10s or 1m duration for fast testing.
                          </p>
                        </div>
                      ) : !hasBids ? (
                        <div className="flex flex-col items-center gap-3 w-full text-center font-body text-xs mt-1">
                          <p className="text-amber-300 font-medium flex items-center justify-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                            Auction Ended Without Bids (0 Bids Received)
                          </p>
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 w-full">
                            <button
                              onClick={() => setShowCancelModal(true)}
                              className="w-full sm:w-auto rounded-full bg-rose-500/20 border border-rose-500/40 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/30 transition-all cursor-pointer"
                            >
                              Cancel &amp; Recover cASSET
                            </button>
                          </div>
                        </div>
                      ) : finalizeWindowPassed ? (
                        <div className="flex flex-col items-center gap-1.5 text-center font-body text-xs">
                          <p className="text-rose-400 font-bold flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
                            Finalization Window (24 Hours) Expired!
                          </p>
                          <p className="text-muted/70 text-[11px]">
                            The system has enabled Emergency Refund options for Investors.
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-center font-body text-xs">
                          <p className="text-emerald-400 font-medium flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            Deadline passed &amp; bids received! Click Finalize to initiate TEE resolution.
                          </p>
                          <p className="text-amber-400/90 text-[11px] font-mono">
                            Issuer Finalization Time Remaining: {formatDuration(remainingFinalizeSecs)} (Max 24h)
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : isIssuer && auction.status === 2 ? (
              <button
                disabled={actionStep !== null}
                onClick={() => setShowRevealModal(true)}
                className="w-full rounded-full bg-amber-500 py-3.5 px-6 font-body text-sm font-semibold text-charcoal shadow-lg transition-all hover:bg-amber-400 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                {actionStep ?? "Reveal Clearing Price"}
              </button>
            ) : null
          }
        />
      </section>
      )}

      {/* ── MODAL: FINALIZE ─────────────────────────────────────── */}
      {showFinalizeModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-6 backdrop-blur-md animate-in fade-in duration-200">
          <Card className="w-full max-w-md p-8 border border-hairline-strong bg-surface shadow-2xl rounded-[20px] flex flex-col gap-6">
            <div>
              <span className="inline-block mb-3 rounded-full border border-oxblood/40 bg-oxblood/10 px-3 py-1 font-body text-[11px] font-semibold tracking-wider text-oxblood uppercase">
                Confirmation Required
              </span>
              <h3 className="font-display text-3xl text-parchment">
                Finalize Auction?
              </h3>
              <p className="mt-3 font-body text-sm text-muted leading-relaxed">
                This action will compute sealed bids via hardware TEE enclave. Once finalized, no new bids can be submitted.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowFinalizeModal(false)}
                className="flex-1 rounded-full border border-hairline-strong py-3 px-5 font-body text-sm font-medium text-parchment transition-all hover:bg-white/10 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFinalizeModal(false);
                  handleFinalize();
                }}
                className="flex-1 rounded-full bg-white py-3 px-5 font-body text-sm font-semibold text-charcoal shadow-lg transition-all hover:bg-oxblood hover:text-white hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                Confirm &amp; Finalize
              </button>
            </div>
          </Card>
        </div>
      ) : null}

      {/* Extend Deadline modal removed — extendDeadline() does not exist in Auction.sol ABI */}

      {/* ── MODAL: CANCEL AUCTION ────────────────────────────────── */}
      {showCancelModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-6 backdrop-blur-md animate-in fade-in duration-200 font-body">
          <Card className="w-full max-w-md p-8 border border-rose-500/30 bg-surface shadow-2xl rounded-[24px] flex flex-col gap-6">
            <div>
              <span className="inline-block mb-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 font-body text-[11px] font-bold text-rose-300 uppercase tracking-wider">
                {auction.status === 0 ? "Abandon Setup" : "Cancel Auction"}
              </span>
              <h3 className="font-display text-3xl text-parchment">
                {auction.status === 0 ? "Abandon & Recover cASSET?" : "Cancel & Recover cASSET?"}
              </h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                {auction.status === 0
                  ? <>Executing <code className="text-rose-300">abandonEscrow()</code> — returning transferred cASSET to Issuer Safe Treasury. Status updates to Settled.</>  
                  : <>Executing <code className="text-rose-300">recoverAssetIfNoBids()</code> — returning 100% cASSET (<strong className="text-parchment">{auction.quantity.toLocaleString()} cASSET</strong>) to Issuer Safe Treasury. Status updates to Settled.</>}
              </p>
            </div>

            <div className="rounded-xl border border-hairline bg-white/5 p-4 text-xs">
              <span className="text-muted block text-[11px] font-medium uppercase mb-1">Destination Safe Treasury:</span>
              <span className="font-mono text-parchment font-semibold">{auction.safeAddress}</span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 rounded-full border border-hairline-strong py-3 px-5 font-body text-xs font-medium text-parchment transition-all hover:bg-white/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  handleCancelAuction();
                }}
                className="flex-1 rounded-full bg-rose-600 py-3 px-5 font-body text-xs font-bold text-white shadow-lg hover:bg-rose-500 transition-all cursor-pointer"
              >
                Ya, Batalkan Lelang
              </button>
            </div>
          </Card>
        </div>
      ) : null}

      {/* ── MODAL: REVEAL ────────────────────────────────────────── */}
      {showRevealModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-6 backdrop-blur-md animate-in fade-in duration-200">
          <Card className="w-full max-w-md p-8 border border-hairline-strong bg-surface shadow-2xl rounded-[20px] flex flex-col gap-6">
            <div>
              <span className="inline-block mb-3 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-body text-[11px] font-semibold tracking-wider text-amber-400 uppercase">
                Confirmation Required
              </span>
              <h3 className="font-display text-3xl text-parchment">
                Reveal Clearing Price?
              </h3>
              <p className="mt-3 font-body text-sm text-muted leading-relaxed">
                This action will invoke the Nox TEE enclave to decrypt the clearing price proof and publicly settle the auction on-chain. Are you sure you want to proceed?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRevealModal(false)}
                className="flex-1 rounded-full border border-hairline-strong py-3 px-5 font-body text-sm font-medium text-parchment transition-all hover:bg-white/10 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRevealModal(false);
                  handleReveal();
                }}
                className="flex-1 rounded-full bg-white py-3 px-5 font-body text-sm font-semibold text-charcoal shadow-lg transition-all hover:bg-amber-500 hover:text-charcoal hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                Confirm &amp; Reveal
              </button>
            </div>
          </Card>
        </div>
      ) : null}

      {auction.status === 3 ? (
        <section className="mb-section-gap">
          <TreasuryPayoutCard
            auctionAddress={auctionAddress}
            safeAddress={auction.safeAddress}
            isIssuer={isIssuer}
            onWithdraw={handleWithdraw}
            isLoading={actionStep !== null}
            error={actionError}
            clearingPrice={auction.clearingPrice}
            reservePrice={auction.reservePrice}
            quantity={auction.quantity}
            scale={auction.scale}
          />
          <LiveAllocationTable auctionAddress={auctionAddress} bidders={auction.bidders} />
        </section>
      ) : null}
    </>
  );
}
