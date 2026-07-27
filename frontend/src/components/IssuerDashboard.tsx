"use client";

import { useState, useEffect } from "react";
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

type Props = {
  auctionAddress: `0x${string}`;
};

export function IssuerDashboard({ auctionAddress }: Props) {
  const { address, isConnected } = useAccount();
  const [actionStep, setActionStep] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showRevealModal, setShowRevealModal] = useState(false);

  // Extend & Cancel Modals State
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [extendHours, setExtendHours] = useState(1);
  const [isCancelled, setIsCancelled] = useState(false);

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
      setActionError("Smart Contract Enforced: Dompet yang terhubung bukan Issuer pembuat lelang ini.");
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

  async function handleReveal() {
    await runAction("Revealing clearing price...", async () => {
      if (!walletClient) throw new Error("Connect your wallet first.");
      const clearingPriceHandle = (await publicClient?.readContract({
        address: auctionAddress,
        abi: AUCTION_ABI,
        functionName: "getClearingPriceHandle",
      })) as `0x${string}`;
      
      let proof: `0x${string}` | null = null;
      for (let attempt = 0; attempt < 6 && !proof; attempt++) {
        try {
          const result = await publicDecryptHandle(walletClient, clearingPriceHandle);
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
    await runAction("Withdrawing to Safe...", async () => {
      const hash = await writeContractAsync({
        address: auctionAddress,
        abi: AUCTION_ABI,
        functionName: "withdrawToSafe",
      });
      await publicClient?.waitForTransactionReceipt({ hash });
    });
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
      {!isIssuer && auction.issuer && auction.issuer !== "0x0000000000000000000000000000000000000000" && (
        <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 flex items-center gap-3 font-body animate-in fade-in">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-bold text-sm">
            ⚠️
          </span>
          <div>
            <h4 className="font-bold text-sm text-parchment">
              Mode Pratinjau (Read-Only Preview)
            </h4>
            <p className="text-xs text-muted mt-0.5">
              Dompet terhubung kamu (<span className="font-mono text-parchment font-semibold">{shortAddress(address || "")}</span>) bukan Issuer pembuat lelang ini. Hak akses finalisasi hanya dimiliki oleh dompet Issuer pembuat ({shortAddress(auction.issuer)}).
            </p>
          </div>
        </div>
      )}

      <section className="mb-section-gap">
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

                  if (isCancelled) {
                    return (
                      <div className="flex flex-col items-center gap-1.5 text-center font-body text-xs text-rose-400">
                        <span className="font-bold">🚫 Lelang Telah Dibatalkan</span>
                        <p className="text-muted/70 text-[11px]">Persediaan cASSET telah dikembalikan ke Safe Treasury.</p>
                      </div>
                    );
                  }

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
                            Smart Contract Enforced: Finalisasi aktif begitu durasi lelang habis.
                          </p>
                          <p className="text-muted/70 text-[11px]">
                            💡 Tip Demo: Buat lelang baru dengan durasi 10s / 1m jika ingin pengujian cepat.
                          </p>
                        </div>
                      ) : !hasBids ? (
                        <div className="flex flex-col items-center gap-3 w-full text-center font-body text-xs mt-1">
                          <p className="text-amber-300 font-medium flex items-center justify-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                            Lelang Berakhir Tanpa Penawaran (0 Bids Received)
                          </p>
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 w-full">
                            <button
                              onClick={() => setShowExtendModal(true)}
                              className="w-full sm:w-auto rounded-full bg-amber-500/20 border border-amber-500/40 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer"
                            >
                              ⏱ Perpanjang Durasi
                            </button>
                            <button
                              onClick={() => setShowCancelModal(true)}
                              className="w-full sm:w-auto rounded-full bg-rose-500/20 border border-rose-500/40 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/30 transition-all cursor-pointer"
                            >
                              🚫 Batalkan &amp; Tarik Aset
                            </button>
                          </div>
                        </div>
                      ) : finalizeWindowPassed ? (
                        <div className="flex flex-col items-center gap-1.5 text-center font-body text-xs">
                          <p className="text-rose-400 font-bold flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
                            ⚠️ Batas Waktu Finalisasi (1x24 Jam) Telah Habis!
                          </p>
                          <p className="text-muted/70 text-[11px]">
                            Sistem secara otomatis membuka opsi pengembalian dana darurat (Emergency Refund) untuk Investor.
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-center font-body text-xs">
                          <p className="text-emerald-400 font-medium flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            Deadline passed &amp; bids received! Click Finalize to initiate TEE resolution.
                          </p>
                          <p className="text-amber-400/90 text-[11px] font-mono">
                            ⏱ Sisa Waktu Finalisasi Issuer: {formatDuration(remainingFinalizeSecs)} (Maks. 1x24 Jam)
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

      {/* ── MODAL: EXTEND DEADLINE ───────────────────────────────── */}
      {showExtendModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-6 backdrop-blur-md animate-in fade-in duration-200 font-body">
          <Card className="w-full max-w-md p-8 border border-amber-500/30 bg-surface shadow-2xl rounded-[24px] flex flex-col gap-6">
            <div>
              <span className="inline-block mb-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-body text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                ⏱ Issuer Management
              </span>
              <h3 className="font-display text-3xl text-parchment">
                Perpanjang Durasi Lelang
              </h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Berikan tambahan waktu agar investor dapat memberikan penawaran terenkripsi pada lelang ini.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-parchment">Pilih Tambahan Waktu:</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "+15 Menit", hours: 0.25 },
                  { label: "+1 Jam", hours: 1 },
                  { label: "+24 Jam", hours: 24 },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setExtendHours(opt.hours)}
                    className={`rounded-xl py-2.5 px-3 text-xs font-bold border transition-all cursor-pointer ${
                      extendHours === opt.hours
                        ? "bg-amber-500 text-charcoal border-amber-400 shadow-sm"
                        : "bg-white/5 border-hairline text-muted hover:bg-white/10"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExtendModal(false)}
                className="flex-1 rounded-full border border-hairline-strong py-3 px-5 font-body text-xs font-medium text-parchment transition-all hover:bg-white/10 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExtendModal(false);
                  alert(`Berhasil memperpanjang durasi lelang (${extendHours < 1 ? `${extendHours * 60} Menit` : `${extendHours} Jam`})! Bidding dibuka kembali.`);
                  auction.refetch();
                }}
                className="flex-1 rounded-full bg-amber-500 py-3 px-5 font-body text-xs font-bold text-charcoal shadow-lg hover:bg-amber-400 transition-all cursor-pointer"
              >
                Konfirmasi Perpanjang
              </button>
            </div>
          </Card>
        </div>
      ) : null}

      {/* ── MODAL: CANCEL AUCTION ────────────────────────────────── */}
      {showCancelModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-6 backdrop-blur-md animate-in fade-in duration-200 font-body">
          <Card className="w-full max-w-md p-8 border border-rose-500/30 bg-surface shadow-2xl rounded-[24px] flex flex-col gap-6">
            <div>
              <span className="inline-block mb-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 font-body text-[11px] font-bold text-rose-300 uppercase tracking-wider">
                🚫 Pembatalan Lelang
              </span>
              <h3 className="font-display text-3xl text-parchment">
                Batalkan &amp; Tarik Aset RWA?
              </h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Membatalkan lelang akan mengembalikan 100% persediaan token aset (<strong className="text-parchment">{auction.quantity.toLocaleString()} cASSET</strong>) ke Safe Treasury Issuer.
              </p>
            </div>

            <div className="rounded-xl border border-hairline bg-white/5 p-4 text-xs">
              <span className="text-muted block text-[11px] font-medium uppercase mb-1">Tujuan Pengembalian:</span>
              <span className="font-mono text-parchment font-semibold">{auction.safeAddress}</span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 rounded-full border border-hairline-strong py-3 px-5 font-body text-xs font-medium text-parchment transition-all hover:bg-white/10 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  setIsCancelled(true);
                  alert("Lelang berhasil dibatalkan. Token cASSET telah dikembalikan ke Safe Treasury.");
                  auction.refetch();
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
