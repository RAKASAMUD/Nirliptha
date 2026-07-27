"use client";

import { useEffect, useState } from "react";
import { useAccount, useWriteContract, usePublicClient, useWalletClient } from "wagmi";
import { AUCTIONFACTORY_ABI, CASSET_ABI, AUCTION_ABI } from "@/lib/abis";
import { CONTRACTS } from "@/lib/config";
import { encryptUint } from "@/lib/nox";
import { Card } from "./Card";
import { Button } from "./Button";
import { getOrFetchWalletClient } from "@/lib/wallet-helper";

import { shortAddress } from "@/lib/format";

type Props = {
  onCreated: (auctionAddress: `0x${string}`) => void;
  onCancel?: () => void;
};

const APPROVED_SAFES = [
  CONTRACTS.safe.toLowerCase(),
];

export function CreateAuctionForm({ onCreated, onCancel }: Props) {
  const [assetName, setAssetName] = useState("Stadion Qatar World Cup 2026");
  const [quantity, setQuantity] = useState("");
  const [reservePrice, setReservePrice] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [safeAddress, setSafeAddress] = useState<string>("");
  const [safeStatus, setSafeStatus] = useState<"checking" | "valid_protocol" | "valid_contract" | "valid_wallet" | "invalid">("invalid");
  
  // Wizard Modal States
  const [wizardStep, setWizardStep] = useState<"idle" | "preview" | "step1" | "step2" | "step3" | "success" | "error">("idle");
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [createdAuctionAddress, setCreatedAuctionAddress] = useState<`0x${string}` | null>(null);
  const [failedAtStep, setFailedAtStep] = useState<"step1" | "step2" | "step3">("step1");

  const [fieldErrors, setFieldErrors] = useState<{
    quantity?: boolean;
    reservePrice?: boolean;
    duration?: boolean;
    safeAddress?: boolean;
  }>({});
  const [shakingField, setShakingField] = useState<"quantity" | "reservePrice" | "duration" | "safeAddress" | null>(null);

  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Auto-fill connected wallet address as default safe address
  useEffect(() => {
    if (address && !safeAddress) {
      setSafeAddress(address);
    }
  }, [address]);

  useEffect(() => {
    let active = true;
    const cleanAddress = safeAddress.trim();
    if (!publicClient || !/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) {
      setSafeStatus("invalid");
      return;
    }

    if (APPROVED_SAFES.includes(cleanAddress.toLowerCase())) {
      setSafeStatus("valid_protocol");
      return;
    }

    setSafeStatus("checking");
    publicClient
      .getBytecode({ address: cleanAddress as `0x${string}` })
      .then((code) => {
        if (!active) return;
        if (code && code !== "0x" && code.length > 2) {
          setSafeStatus("valid_contract");
        } else {
          setSafeStatus("valid_wallet");
        }
      })
      .catch(() => {
        if (active) setSafeStatus("valid_wallet");
      });

    return () => {
      active = false;
    };
  }, [safeAddress, publicClient]);

  const totalDuration = (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60 + (Number(seconds) || 0);

  function handleCreateClick() {
    const errors: { quantity?: boolean; reservePrice?: boolean; duration?: boolean; safeAddress?: boolean } = {};
    let firstInvalidId: string | null = null;
    let firstInvalidKey: "quantity" | "reservePrice" | "duration" | "safeAddress" | null = null;

    // Validation Order: Quantity -> Reserve Price -> Duration -> Safe Address
    if (!quantity || Number(quantity) <= 0) {
      errors.quantity = true;
      if (!firstInvalidId) {
        firstInvalidId = "field-quantity";
        firstInvalidKey = "quantity";
      }
    }

    if (!reservePrice || Number(reservePrice) <= 0) {
      errors.reservePrice = true;
      if (!firstInvalidId) {
        firstInvalidId = "field-reservePrice";
        firstInvalidKey = "reservePrice";
      }
    }

    if (totalDuration < 300) {
      errors.duration = true;
      if (!firstInvalidId) {
        firstInvalidId = "field-duration";
        firstInvalidKey = "duration";
      }
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(safeAddress.trim())) {
      errors.safeAddress = true;
      if (!firstInvalidId) {
        firstInvalidId = "field-safeAddress";
        firstInvalidKey = "safeAddress";
      }
    }

    setFieldErrors(errors);

    if (firstInvalidId && firstInvalidKey) {
      setShakingField(firstInvalidKey);
      setTimeout(() => setShakingField(null), 500);

      const el = document.getElementById(firstInvalidId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const input = el.querySelector("input");
        if (input) input.focus();
      }
      return;
    }

    // Open Pre-confirmation Wizard Modal
    setWizardError(null);
    setWizardStep("preview");
  }

  async function handleStartWizard() {
    if (!address || !publicClient) {
      setWizardError("Connect your wallet first.");
      setWizardStep("error");
      return;
    }
    setWizardError(null);

    const activeWalletClient = await getOrFetchWalletClient(walletClient, address);
    if (!activeWalletClient) {
      setWizardError("Connect your wallet first.");
      setWizardStep("error");
      return;
    }

    const quantityRaw = BigInt(Math.round(Number(quantity)));
    const reservePriceRaw = BigInt(Math.round(Number(reservePrice) * 1_000_000));
    let currentAuctionAddr = createdAuctionAddress;

    try {
      // STEP 1: Deploy Auction Contract
      if (!currentAuctionAddr) {
        setFailedAtStep("step1");
        setWizardStep("step1");
        const block = await publicClient.getBlock();
        const deadline = block.timestamp + BigInt(totalDuration);

        const createTx = await writeContractAsync({
          address: CONTRACTS.factory as `0x${string}`,
          abi: AUCTIONFACTORY_ABI,
          functionName: "createAuction",
          args: [quantityRaw, reservePriceRaw, deadline, safeAddress as `0x${string}`],
        });
        await publicClient.waitForTransactionReceipt({ hash: createTx });

        const count = (await publicClient.readContract({
          address: CONTRACTS.factory as `0x${string}`,
          abi: AUCTIONFACTORY_ABI,
          functionName: "auctionCount",
        })) as bigint;
        currentAuctionAddr = (await publicClient.readContract({
          address: CONTRACTS.factory as `0x${string}`,
          abi: AUCTIONFACTORY_ABI,
          functionName: "auctions",
          args: [count - BigInt(1)],
        })) as `0x${string}`;

        setCreatedAuctionAddress(currentAuctionAddr);
      }

      // STEP 2: Secure Confidential Assets (Escrow Transfer)
      setFailedAtStep("step2");
      setWizardStep("step2");
      const { handle, handleProof } = await encryptUint(activeWalletClient, quantityRaw, CONTRACTS.cAsset as `0x${string}`);

      const transferTx = await writeContractAsync({
        address: CONTRACTS.cAsset as `0x${string}`,
        abi: CASSET_ABI,
        functionName: "confidentialTransfer",
        args: [currentAuctionAddr, handle, handleProof],
      });
      await publicClient.waitForTransactionReceipt({ hash: transferTx });

      // STEP 3: Activate Auction (Confirm Escrow)
      setFailedAtStep("step3");
      setWizardStep("step3");
      const confirmTx = await writeContractAsync({
        address: currentAuctionAddr,
        abi: AUCTION_ABI,
        functionName: "confirmEscrow",
      });
      await publicClient.waitForTransactionReceipt({ hash: confirmTx });

      // COMPLETE SUCCESS
      setWizardStep("success");
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : String(err));
      setWizardStep("error");
    }
  }

  function handleResetForm() {
    setQuantity("");
    setReservePrice("");
    setHours("");
    setMinutes("");
    setSeconds("");
    setSafeAddress("");
    setWizardStep("idle");
    setCreatedAuctionAddress(null);
  }

  return (
    <Card className="p-8 md:p-10 shadow-2xl rounded-[20px]">
      <div className="mb-8">
        <h3 className="font-display text-3xl md:text-4xl text-parchment font-normal tracking-tight">
          Create new auction
        </h3>
        <p className="mt-1.5 font-body text-xs text-muted/70 leading-relaxed max-w-lg">
          Configure the parameters for your confidential RWA primary issuance. All bids remain end-to-end encrypted until settlement.
        </p>
      </div>

      <div className="flex flex-col gap-6 mb-6">
        <label id="field-assetName" className="flex flex-col gap-2">
          <span className="font-body text-xs font-semibold text-parchment/90 tracking-wide flex items-center justify-between">
            <span>🏷️ Asset Title / Offering Name</span>
            <span className="text-[10px] text-muted font-normal">Nama Aset RWA</span>
          </span>
          <input
            type="text"
            placeholder="e.g. Stadion Qatar World Cup 2026, LRT Jabodebek Fleet, Solar Farm Bali"
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
            className="w-full rounded-[12px] bg-black/40 p-3.5 font-body text-sm font-semibold text-parchment placeholder:text-muted/50 border border-hairline-strong focus:border-oxblood focus:ring-1 focus:ring-oxblood focus:outline-none transition-all"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <label id="field-quantity" className="flex flex-col gap-2">
          <span className="font-body text-xs font-semibold text-parchment/90 tracking-wide">
            Asset Quantity (cASSET)
          </span>
          <input
            type="number"
            step="any"
            placeholder="e.g. 100000"
            value={quantity}
            onWheel={(e) => e.currentTarget.blur()}
            onChange={(e) => {
              setQuantity(e.target.value);
              setFieldErrors((prev) => ({ ...prev, quantity: false }));
            }}
            className={`w-full rounded-[12px] bg-black/40 p-3.5 font-body font-medium text-sm text-parchment placeholder:text-muted/50 placeholder:font-normal focus:border-oxblood focus:ring-1 focus:ring-oxblood focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all ${
              fieldErrors.quantity
                ? "border border-oxblood/80 ring-1 ring-oxblood/40 shadow-[0_0_8px_rgba(132,0,22,0.25)]"
                : "border border-hairline-strong"
            } ${shakingField === "quantity" ? "animate-shake" : ""}`}
          />
          {fieldErrors.quantity ? (
            <span className="font-body text-[11px] text-rose-400/90 font-medium mt-0.5">
              Asset Quantity must be filled
            </span>
          ) : null}
        </label>

        <label id="field-reservePrice" className="flex flex-col gap-2">
          <span className="font-body text-xs font-semibold text-parchment/90 tracking-wide">
            Reserve Price (cUSD)
          </span>
          <input
            type="number"
            step="0.01"
            placeholder="e.g. 1.00"
            value={reservePrice}
            onWheel={(e) => e.currentTarget.blur()}
            onChange={(e) => {
              setReservePrice(e.target.value);
              setFieldErrors((prev) => ({ ...prev, reservePrice: false }));
            }}
            className={`w-full rounded-[12px] bg-black/40 p-3.5 font-body font-medium text-sm text-parchment placeholder:text-muted/50 placeholder:font-normal focus:border-oxblood focus:ring-1 focus:ring-oxblood focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all ${
              fieldErrors.reservePrice
                ? "border border-oxblood/80 ring-1 ring-oxblood/40 shadow-[0_0_8px_rgba(132,0,22,0.25)]"
                : "border border-hairline-strong"
            } ${shakingField === "reservePrice" ? "animate-shake" : ""}`}
          />
          {fieldErrors.reservePrice ? (
            <span className="font-body text-[11px] text-rose-400/90 font-medium mt-0.5">
              Reserve Price must be filled
            </span>
          ) : null}
        </label>

        <div id="field-duration" className="flex flex-col gap-2">
          <span className="font-body text-xs font-semibold text-parchment/90 tracking-wide">
            Duration
          </span>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={hours}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => {
                    setHours(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, duration: false }));
                  }}
                  className={`w-full rounded-[12px] bg-black/40 p-3.5 pr-8 font-body font-medium text-sm text-parchment placeholder:text-muted/50 placeholder:font-normal focus:border-oxblood focus:ring-1 focus:ring-oxblood focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all ${
                    fieldErrors.duration
                      ? "border border-oxblood/80 ring-1 ring-oxblood/40 shadow-[0_0_8px_rgba(132,0,22,0.25)]"
                      : "border border-hairline-strong"
                  } ${shakingField === "duration" ? "animate-shake" : ""}`}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-body text-xs font-medium text-muted/60">
                  H
                </span>
              </div>
              <span className="font-body text-[10px] text-muted/50 text-center uppercase tracking-wider">Hours</span>
            </div>

            <div className="flex flex-col gap-1">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="0"
                  value={minutes}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => {
                    setMinutes(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, duration: false }));
                  }}
                  className={`w-full rounded-[12px] bg-black/40 p-3.5 pr-8 font-body font-medium text-sm text-parchment placeholder:text-muted/50 placeholder:font-normal focus:border-oxblood focus:ring-1 focus:ring-oxblood focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all ${
                    fieldErrors.duration
                      ? "border border-oxblood/80 ring-1 ring-oxblood/40 shadow-[0_0_8px_rgba(132,0,22,0.25)]"
                      : "border border-hairline-strong"
                  } ${shakingField === "duration" ? "animate-shake" : ""}`}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-body text-xs font-medium text-muted/60">
                  M
                </span>
              </div>
              <span className="font-body text-[10px] text-muted/50 text-center uppercase tracking-wider">Mins</span>
            </div>

            <div className="flex flex-col gap-1">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="0"
                  value={seconds}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => {
                    setSeconds(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, duration: false }));
                  }}
                  className={`w-full rounded-[12px] bg-black/40 p-3.5 pr-8 font-body font-medium text-sm text-parchment placeholder:text-muted/50 placeholder:font-normal focus:border-oxblood focus:ring-1 focus:ring-oxblood focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all ${
                    fieldErrors.duration
                      ? "border border-oxblood/80 ring-1 ring-oxblood/40 shadow-[0_0_8px_rgba(132,0,22,0.25)]"
                      : "border border-hairline-strong"
                  } ${shakingField === "duration" ? "animate-shake" : ""}`}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-body text-xs font-medium text-muted/60">
                  S
                </span>
              </div>
              <span className="font-body text-[10px] text-muted/50 text-center uppercase tracking-wider">Secs</span>
            </div>
          </div>
          {fieldErrors.duration ? (
            <span className="font-body text-[11px] text-rose-400/90 font-medium mt-0.5">
              ⚠️ Smart Contract Enforced: Durasi lelang minimal 5 menit (300 detik).
            </span>
          ) : null}
        </div>

        {/* REVENUE TREASURY DESTINATION (AUTO-FILLED ISSUER WALLET) */}
        <div id="field-safeAddress" className="flex flex-col gap-2">
          <span className="font-body text-xs font-semibold text-parchment/90 tracking-wide flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-muted/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Alamat Issuer &amp; Penerima Pendapatan (*Safe Treasury*)
            </span>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">
              ✓ Issuer Wallet Identified
            </span>
          </span>

          <div className="relative flex items-center">
            <input
              type="text"
              readOnly
              value={address ? `${address} (Issuer Wallet)` : safeAddress}
              className="w-full rounded-[12px] bg-black/40 p-3.5 font-mono text-xs font-semibold text-emerald-400 border border-hairline-strong focus:outline-none cursor-default pr-36"
            />
            <span className="absolute right-3 text-[11px] font-body font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
              ✓ Auto Issuer Wallet
            </span>
          </div>

          <span className="font-body text-[11px] text-muted leading-relaxed">
            Dompet terhubung kamu secara otomatis menjadi **Alamat Issuer Resmi** pembuat lelang ini. Seluruh pendapatan cUSD lelang akan masuk langsung ke dompet Issuer kamu saat penarikan (*withdrawal*).
          </span>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-[12px] border border-hairline-strong bg-transparent py-3.5 px-6 font-body text-sm font-medium text-muted hover:text-parchment hover:border-parchment/40 transition-all cursor-pointer"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleCreateClick}
          className="flex-1 rounded-[12px] py-3.5 px-6 font-body text-sm font-semibold shadow-lg transition-all cursor-pointer bg-white text-charcoal hover:bg-white/90 hover:scale-[1.005] active:scale-[0.995]"
        >
          Create Auction
        </button>
      </div>

      {/* SETUP WIZARD MODAL DIALOG */}
      {wizardStep !== "idle" ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 md:p-6 backdrop-blur-md animate-in fade-in duration-200">
          <Card className="w-full max-w-lg p-6 md:p-8 border border-white/10 bg-surface/95 shadow-2xl rounded-[24px] flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
            
            {/* VIEW 1: PREVIEW BEFORE STARTING */}
            {wizardStep === "preview" ? (
              <>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-body text-[11px] font-semibold tracking-wider text-emerald-400 uppercase">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Guided Setup Wizard
                    </span>
                    <span className="font-body text-xs font-medium text-muted/80 flex items-center gap-1">
                      ⏱ ~30–60s total
                    </span>
                  </div>
                  <h3 className="font-display text-2xl md:text-3xl text-parchment">
                    Create Confidential Auction
                  </h3>
                  <p className="mt-2 font-body text-xs text-muted leading-relaxed">
                    Creating an auction requires <strong className="text-parchment font-semibold">3 wallet confirmations</strong> for security. This is expected blockchain behavior to deploy contracts and secure escrow.
                  </p>
                </div>

                {/* Parameters Preview Box */}
                <div className="flex flex-col gap-2 rounded-[14px] border border-hairline-strong bg-black/40 p-4 font-body text-xs">
                  <span className="font-body text-[10px] text-muted/60 font-semibold uppercase tracking-wider mb-1">
                    Auction Summary
                  </span>
                  <div className="flex justify-between border-b border-white/5 pb-1.5">
                    <span className="text-muted">Quantity:</span>
                    <span className="text-parchment font-semibold">{quantity} cASSET</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1.5">
                    <span className="text-muted">Reserve Price:</span>
                    <span className="text-parchment font-semibold">{reservePrice} cUSD</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1.5">
                    <span className="text-muted">Duration:</span>
                    <span className="text-parchment font-semibold">
                      {hours ? `${hours}h ` : ""}{minutes ? `${minutes}m ` : ""}{seconds ? `${seconds}s` : "0s"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Safe Treasury:</span>
                    <span className="font-mono text-parchment font-semibold">{shortAddress(safeAddress)}</span>
                  </div>
                </div>

                {/* 3-Step Setup Preview */}
                <div className="flex flex-col gap-2.5">
                  <span className="font-body text-xs font-semibold text-parchment/90">
                    Required 3-Step Guided Workflow:
                  </span>
                  <div className="flex flex-col gap-2 font-body text-xs">
                    <div className="flex items-start gap-3 rounded-[12px] border border-white/5 bg-black/20 p-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-parchment">1</span>
                      <div>
                        <p className="font-semibold text-parchment">Deploy auction contract</p>
                        <p className="text-muted/70 text-[11px]">Creates dedicated smart contract instance on Sepolia</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-[12px] border border-white/5 bg-black/20 p-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-parchment">2</span>
                      <div>
                        <p className="font-semibold text-parchment">Secure confidential assets</p>
                        <p className="text-muted/70 text-[11px]">Encrypts &amp; deposits cASSET tokens into confidential escrow</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-[12px] border border-white/5 bg-black/20 p-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-parchment">3</span>
                      <div>
                        <p className="font-semibold text-parchment">Activate auction</p>
                        <p className="text-muted/70 text-[11px]">Verifies escrow deposit and opens bidding period</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-hairline-strong">
                  <button
                    type="button"
                    onClick={() => setWizardStep("idle")}
                    className="flex-1 rounded-[12px] border border-hairline-strong bg-transparent py-3 px-5 font-body text-sm font-medium text-muted hover:text-parchment hover:border-parchment/40 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStartWizard}
                    className="flex-1 rounded-[12px] bg-white py-3 px-5 font-body text-sm font-semibold text-charcoal shadow-lg transition-all hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    Start Auction Creation
                  </button>
                </div>
              </>
            ) : null}

            {/* VIEW 2: ACTIVE PROGRESS WIZARD (STEPS 1, 2, 3) */}
            {wizardStep === "step1" || wizardStep === "step2" || wizardStep === "step3" ? (
              <>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-body text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      Guided Progress
                    </span>
                    <span className="font-body text-xs font-bold text-parchment">
                      {wizardStep === "step1" ? "Step 1 of 3" : wizardStep === "step2" ? "Step 2 of 3" : "Step 3 of 3"}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full rounded-full bg-black/60 overflow-hidden mb-4 border border-white/5">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-500 rounded-full"
                      style={{
                        width: wizardStep === "step1" ? "33%" : wizardStep === "step2" ? "66%" : "100%",
                      }}
                    />
                  </div>

                  <h3 className="font-display text-2xl md:text-3xl text-parchment">
                    {wizardStep === "step1"
                      ? "Deploying Auction Contract"
                      : wizardStep === "step2"
                      ? "Securing Confidential Assets"
                      : "Activating Auction"}
                  </h3>
                  <p className="mt-1.5 font-body text-xs text-muted leading-relaxed">
                    {wizardStep === "step1"
                      ? "Create a dedicated auction smart contract on-chain."
                      : wizardStep === "step2"
                      ? "Transfer encrypted cASSET into confidential escrow."
                      : "Verify escrow deposit and open the auction for bidding."}
                  </p>
                </div>

                {/* Active Wallet Reassurance Box */}
                <div className="rounded-[16px] border border-emerald-500/30 bg-emerald-500/10 p-5 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-body text-xs font-semibold">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>
                      {wizardStep === "step1"
                        ? "Awaiting Wallet Prompt 1 of 3"
                        : wizardStep === "step2"
                        ? "Awaiting Wallet Prompt 2 of 3"
                        : "Awaiting Wallet Prompt 3 of 3"}
                    </span>
                  </div>
                  <p className="font-body text-xs text-parchment/90 leading-relaxed">
                    {wizardStep === "step1"
                      ? "Please approve prompt 1 in MetaMask to deploy your auction contract."
                      : wizardStep === "step2"
                      ? "Please approve prompt 2 in MetaMask to deposit encrypted cASSET into escrow."
                      : "Please approve prompt 3 in MetaMask to activate bidding."}
                  </p>
                  <p className="font-body text-[11px] text-emerald-400/80 font-medium pt-1 border-t border-emerald-500/20">
                    💡 This is part of the 3-step setup. MetaMask will close automatically after signing.
                  </p>
                </div>

                {/* Live Step Progress Checklist */}
                <div className="flex flex-col gap-2.5 font-body text-xs border-t border-hairline-strong pt-4">
                  {/* Step 1 Status */}
                  <div className="flex items-center justify-between rounded-[12px] p-3 border border-white/5 bg-black/20">
                    <div className="flex items-center gap-3">
                      {wizardStep === "step1" ? (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-[11px] font-bold animate-pulse">1</span>
                      ) : (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold">✓</span>
                      )}
                      <div>
                        <p className={`font-semibold ${wizardStep === "step1" ? "text-parchment" : "text-emerald-400"}`}>
                          1. Deploy auction contract
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-muted">
                      {wizardStep === "step1" ? "In Progress..." : "Completed ✓"}
                    </span>
                  </div>

                  {/* Step 2 Status */}
                  <div className="flex items-center justify-between rounded-[12px] p-3 border border-white/5 bg-black/20">
                    <div className="flex items-center gap-3">
                      {wizardStep === "step1" ? (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-muted/60 text-[11px] font-bold">2</span>
                      ) : wizardStep === "step2" ? (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-[11px] font-bold animate-pulse">2</span>
                      ) : (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold">✓</span>
                      )}
                      <div>
                        <p className={`font-semibold ${wizardStep === "step2" ? "text-parchment" : wizardStep === "step3" ? "text-emerald-400" : "text-muted/60"}`}>
                          2. Secure confidential assets
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-muted">
                      {wizardStep === "step1" ? "Pending" : wizardStep === "step2" ? "In Progress..." : "Completed ✓"}
                    </span>
                  </div>

                  {/* Step 3 Status */}
                  <div className="flex items-center justify-between rounded-[12px] p-3 border border-white/5 bg-black/20">
                    <div className="flex items-center gap-3">
                      {wizardStep === "step3" ? (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-[11px] font-bold animate-pulse">3</span>
                      ) : (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-muted/60 text-[11px] font-bold">3</span>
                      )}
                      <div>
                        <p className={`font-semibold ${wizardStep === "step3" ? "text-parchment" : "text-muted/60"}`}>
                          3. Activate auction
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-muted">
                      {wizardStep === "step3" ? "In Progress..." : "Pending"}
                    </span>
                  </div>
                </div>
              </>
            ) : null}

            {/* VIEW 3: ERROR STATE WITH RETRY */}
            {wizardStep === "error" ? (
              <>
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 font-body text-[11px] font-semibold tracking-wider text-rose-400 uppercase mb-3">
                    Action Required
                  </span>
                  <h3 className="font-display text-2xl md:text-3xl text-parchment">
                    Creation Paused
                  </h3>
                  <p className="mt-2 font-body text-xs text-muted leading-relaxed">
                    The workflow was interrupted. Your parameters are preserved and you can safely retry without losing progress.
                  </p>
                </div>

                <div className="rounded-[14px] border border-rose-500/30 bg-rose-500/10 p-4 font-body text-xs text-rose-300">
                  <p className="font-semibold mb-1">Error Details:</p>
                  <p className="font-mono text-[11px] break-words text-rose-200/90">{wizardError ?? "Transaction prompt declined in wallet."}</p>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-hairline-strong">
                  <button
                    type="button"
                    onClick={() => setWizardStep("idle")}
                    className="flex-1 rounded-[12px] border border-hairline-strong bg-transparent py-3 px-5 font-body text-sm font-medium text-muted hover:text-parchment hover:border-parchment/40 transition-all cursor-pointer"
                  >
                    Cancel Setup
                  </button>
                  <button
                    type="button"
                    onClick={handleStartWizard}
                    className="flex-1 rounded-[12px] bg-white py-3 px-5 font-body text-sm font-semibold text-charcoal shadow-lg transition-all hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    Retry Step
                  </button>
                </div>
              </>
            ) : null}

            {/* VIEW 4: SUCCESS COMPLETION SCREEN */}
            {wizardStep === "success" && createdAuctionAddress ? (
              <>
                <div className="text-center flex flex-col items-center gap-3 py-2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-display text-3xl text-parchment">
                      Auction Successfully Created!
                    </h3>
                    <p className="mt-1 font-body text-xs text-muted leading-relaxed">
                      Your confidential RWA auction is now live on Sepolia and open for encrypted bidding.
                    </p>
                  </div>
                </div>

                {/* Auction Details Summary */}
                <div className="flex flex-col gap-2 rounded-[14px] border border-white/10 bg-black/40 p-4 font-body text-xs">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-muted">Status:</span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Open for Bids
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-muted">Auction Contract:</span>
                    <span className="font-mono text-parchment font-semibold">{shortAddress(createdAuctionAddress)}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-muted">Quantity:</span>
                    <span className="text-parchment font-semibold">{quantity} cASSET</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Reserve Price:</span>
                    <span className="text-parchment font-semibold">{reservePrice} cUSD</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-hairline-strong">
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="flex-1 rounded-[12px] border border-hairline-strong bg-transparent py-3 px-5 font-body text-sm font-medium text-muted hover:text-parchment hover:border-parchment/40 transition-all cursor-pointer"
                  >
                    Create Another Auction
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onCreated(createdAuctionAddress);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-[12px] bg-white py-3 px-5 font-body text-sm font-semibold text-charcoal shadow-lg transition-all hover:bg-emerald-500 hover:text-charcoal hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <span>View Auction</span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                </div>
              </>
            ) : null}

          </Card>
        </div>
      ) : null}
    </Card>
  );
}
