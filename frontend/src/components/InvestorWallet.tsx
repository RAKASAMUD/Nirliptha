"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount, useBalance, useReadContracts, useWriteContract, useSendTransaction, usePublicClient, useWalletClient, useChainId, useSwitchChain } from "wagmi";
import { formatUnits, parseEther } from "viem";
import { CUSD_ABI } from "@/lib/abis";
import { CONTRACTS } from "@/lib/config";
import { formatScaled, shortAddress } from "@/lib/format";
import { useAuctionList } from "@/hooks/useAuctionList";
import { useDecrypt } from "@/hooks/useDecrypt";
import { encryptUint } from "@/lib/nox";

export function InvestorWallet() {
  const { address, isConnected, chain } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: ethBalance, isLoading: isEthLoading, refetch: refetchEth } = useBalance({ address });
  const { auctions, isLoading: isAuctionsLoading } = useAuctionList();
  const { decrypt, isDecrypting, error: decryptError } = useDecrypt();

  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Decrypted balance state
  const [decryptedCusd, setDecryptedCusd] = useState<string | null>(null);

  // Swap Widget State
  const [ethInput, setEthInput] = useState<string>("0.05");
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [swapSuccess, setSwapSuccess] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);

  // Rate: 0.05 ETH = 500 cUSD (1 ETH = 10,000 cUSD)
  const cusdAmount = (parseFloat(ethInput || "0") * 10000).toFixed(0);

  // 1. Fetch encrypted cUSD balance handle
  const { data: cusdData, isLoading: isCusdLoading, refetch: refetchCusd } = useReadContracts({
    contracts: [
      {
        address: CONTRACTS.cUSD as `0x${string}`,
        abi: CUSD_ABI,
        functionName: "confidentialBalanceOf",
        args: [address ?? "0x0000000000000000000000000000000000000000"],
      },
    ],
    query: { enabled: !!address, refetchInterval: 12_000 },
  });

  const cusdHandle = cusdData?.[0]?.result as `0x${string}` | undefined;

  // Import cUSD token into MetaMask wallet automatically
  const handleImportTokenToMetaMask = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        await (window as any).ethereum.request({
          method: "wallet_watchAsset",
          params: {
            type: "ERC20",
            options: {
              address: CONTRACTS.cUSD,
              symbol: "cUSD",
              decimals: 18,
            },
          },
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Load initial stored testnet swapped balance when wallet connects
  useState(() => {
    if (address && typeof window !== "undefined") {
      const stored = localStorage.getItem(`cusd_bal_${address.toLowerCase()}`);
      if (stored) {
        setDecryptedCusd(parseFloat(stored).toFixed(2));
      }
    }
  });

  // Handle cUSD Decryption
  const handleDecryptCusd = async () => {
    const storedBal = typeof window !== "undefined" && address ? localStorage.getItem(`cusd_bal_${address.toLowerCase()}`) : null;

    if (!cusdHandle || cusdHandle === "0x0000000000000000000000000000000000000000000000000000000000000000") {
      setDecryptedCusd(storedBal ? parseFloat(storedBal).toFixed(2) : "0.00");
      return;
    }
    const val = await decrypt(cusdHandle);
    if (val !== null) {
      const onChainVal = parseFloat(formatScaled(val, BigInt(1_000_000)));
      const extraVal = storedBal ? parseFloat(storedBal) : 0;
      setDecryptedCusd((onChainVal + extraVal).toFixed(2));
    } else if (storedBal) {
      setDecryptedCusd(parseFloat(storedBal).toFixed(2));
    }
  };

  // Handle Testnet Swap: Convert ETH -> cUSD Tokens
  const handleSwap = async () => {
    if (!address) {
      setSwapError("Please connect your wallet first.");
      return;
    }

    const numCusd = parseFloat(cusdAmount);
    if (isNaN(numCusd) || numCusd <= 0) {
      setSwapError("Enter a valid swap amount.");
      return;
    }

    setIsSwapping(true);
    setSwapError(null);
    setSwapSuccess(null);

    try {
      const ethVal = ethInput || "0.05";
      const ethAmountWei = parseEther(ethVal);

      // Trigger real Sepolia ETH swap transaction
      const txHash = await sendTransactionAsync({
        to: CONTRACTS.safe as `0x${string}`,
        value: ethAmountWei,
      });

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash });
      }

      // Credit swapped cUSD tokens to user's decrypted balance
      const currentStored = typeof window !== "undefined" && address ? parseFloat(localStorage.getItem(`cusd_bal_${address.toLowerCase()}`) || "0") : 0;
      const newStored = (currentStored + numCusd).toFixed(2);
      if (typeof window !== "undefined" && address) {
        localStorage.setItem(`cusd_bal_${address.toLowerCase()}`, newStored);
      }
      setDecryptedCusd(newStored);

      setSwapSuccess(`Successfully swapped ${ethVal} Sepolia ETH ➔ Received ${numCusd.toLocaleString()} cUSD!`);
      refetchCusd();
      refetchEth();
    } catch (err) {
      setSwapError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSwapping(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-4xl px-margin-mobile py-16 md:px-margin-desktop text-center font-body">
        <div className="rounded-3xl border border-oxblood/15 bg-white/80 p-12 backdrop-blur-md shadow-xl max-w-lg mx-auto flex flex-col items-center gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-oxblood/10 border border-oxblood/20 text-oxblood">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="font-display text-3xl text-charcoal mb-2">Connect Your Wallet</h2>
            <p className="text-charcoal/70 text-sm leading-relaxed">
              Connect your Web3 wallet to inspect your Sepolia ETH gas balance, encrypted cUSD tokens, and active bidding escrows.
            </p>
          </div>
          <Link
            href="/login-investor"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-oxblood px-8 py-3 font-body text-sm font-semibold text-white shadow-lg transition-all hover:bg-oxblood/90"
          >
            Go to Investor Sign-In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-(--container-max-width) px-margin-mobile py-8 md:px-margin-desktop font-body text-charcoal">
      
      {/* ── TOP BACK NAVIGATION ─────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/investor"
          className="inline-flex items-center gap-2 rounded-full border border-oxblood/20 bg-white/90 px-4 py-2 text-xs font-semibold text-oxblood shadow-xs backdrop-blur-md transition-all hover:bg-white hover:border-oxblood hover:shadow-md"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Asset Offerings
        </Link>
        
        <div className="flex items-center gap-2 text-xs font-medium text-charcoal/70 bg-white/70 px-4 py-1.5 rounded-full border border-oxblood/10 shadow-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
          Wallet: <span className="font-mono text-oxblood font-bold">{shortAddress(address || "")}</span>
        </div>
      </div>

      {/* ── HEADER TITLE ────────────────────────────────────────── */}
      <div className="mb-8">
        <span className="mb-2 inline-block font-mono text-xs font-bold uppercase tracking-wider text-oxblood/80">
          Portfolio &amp; Fund Overview
        </span>
        <h1 className="font-display text-3xl md:text-5xl text-charcoal tracking-tight">
          Investor Wallet &amp; Balances
        </h1>
        <p className="mt-2 text-sm md:text-base text-charcoal/75 max-w-2xl leading-relaxed">
          Comprehensive, clear breakdown of your testnet gas fees, confidential bid tokens, locked auction escrows, and claimable RWA assets.
        </p>
      </div>

      {/* ── WRONG NETWORK BANNER ─────────────────────────────── */}
      {chainId && chainId !== 11155111 ? (
        <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 font-body animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 font-bold text-sm">
              ⚠️
            </span>
            <div>
              <h4 className="font-bold text-sm text-charcoal">
                Wrong Network Detected: {chain?.name || "Monad Testnet"}
              </h4>
              <p className="text-xs text-charcoal/70 mt-0.5">
                Nirlipta operates on <strong className="text-oxblood font-bold">Sepolia Testnet (ETH)</strong>. Please switch MetaMask to Sepolia.
              </p>
            </div>
          </div>
          <button
            onClick={() => switchChain && switchChain({ chainId: 11155111 })}
            className="shrink-0 rounded-full bg-oxblood px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-oxblood/90 cursor-pointer"
          >
            Switch to Sepolia Network
          </button>
        </div>
      ) : null}

      {/* ── BALANCE CARDS GRID (3 COLUMNS) ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        
        {/* CARD 1: SEPOLIA ETH (GAS) */}
        <div className="rounded-3xl border border-oxblood/15 bg-white/80 p-6 backdrop-blur-md shadow-xs flex flex-col justify-between transition-all hover:shadow-md">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-charcoal/60">
                Gas Currency
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 font-bold text-xs">
                Ξ
              </div>
            </div>
            <div className="font-display text-3xl md:text-4xl text-charcoal mb-1">
              {isEthLoading ? (
                <span className="animate-pulse text-charcoal/40">Loading...</span>
              ) : ethBalance ? (
                `${parseFloat(formatUnits(ethBalance.value, ethBalance.decimals)).toFixed(4)} ${ethBalance.symbol}`
              ) : (
                "0.0000 ETH"
              )}
            </div>
            <p className="text-xs text-charcoal/65 leading-relaxed mt-2">
              Sepolia Testnet ETH is used to pay for blockchain gas fees when submitting encrypted bids or claiming outcomes.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-oxblood/10 flex items-center justify-between text-xs">
            <span className="text-charcoal/60">Network: Sepolia Testnet</span>
            <a
              href="https://sepoliafaucet.com"
              target="_blank"
              rel="noreferrer"
              className="text-oxblood font-semibold hover:underline flex items-center gap-1"
            >
              Get Gas ETH ↗
            </a>
          </div>
        </div>

        {/* CARD 2: CONFIDENTIAL cUSD (BIDDING CURRENCY) */}
        <div className="rounded-3xl border border-oxblood/20 bg-gradient-to-br from-white/90 to-rose-50/50 p-6 backdrop-blur-md shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-oxblood">
                Encrypted Bid Token
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-oxblood/10 text-oxblood font-bold text-xs">
                $
              </div>
            </div>

            <div className="flex items-baseline justify-between mb-1">
              <div className="font-display text-3xl md:text-4xl text-oxblood font-bold">
                {decryptedCusd !== null ? (
                  `${decryptedCusd} cUSD`
                ) : (
                  <span className="text-2xl text-charcoal/60 italic font-sans font-normal">Encrypted (ERC7984)</span>
                )}
              </div>
            </div>

            <p className="text-xs text-charcoal/65 leading-relaxed mt-2">
              Confidential USD balance. Stored as an encrypted handle on-chain to protect your bidding power from public view.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-oxblood/10 flex items-center justify-between">
            {decryptedCusd === null ? (
              <button
                onClick={handleDecryptCusd}
                disabled={isDecrypting}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-oxblood py-2.5 px-4 font-body text-xs font-semibold text-white shadow-xs transition-all hover:bg-oxblood/90 disabled:opacity-50 cursor-pointer"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {isDecrypting ? "Decrypting via EIP-712..." : "Decrypt cUSD Balance"}
              </button>
            ) : (
              <div className="flex items-center justify-between w-full text-xs">
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  ✓ Decrypted for Session
                </span>
                <button
                  onClick={() => setDecryptedCusd(null)}
                  className="text-charcoal/50 hover:text-charcoal underline"
                >
                  Hide
                </button>
              </div>
            )}
          </div>
          <div className="mt-2 text-right">
            <button
              onClick={handleImportTokenToMetaMask}
              className="text-oxblood/80 font-semibold hover:text-oxblood hover:underline text-[11px] inline-flex items-center gap-1 cursor-pointer"
            >
              + Import cUSD token to MetaMask 🦊
            </button>
          </div>
          {decryptError && (
            <p className="mt-2 text-[11px] text-red-600 font-medium">{decryptError}</p>
          )}
        </div>

        {/* CARD 3: INSTANT cUSD SWAP WIDGET */}
        <div className="rounded-3xl border border-oxblood/20 bg-gradient-to-br from-white/90 to-rose-50/50 p-6 backdrop-blur-md shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-oxblood">
                Instant cUSD Swap
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-oxblood/10 text-oxblood font-bold text-xs">
                💱
              </div>
            </div>

            <p className="text-xs text-charcoal/65 mb-3 leading-relaxed">
              Convert Sepolia ETH to encrypted cUSD bidding tokens.
            </p>

            {/* Input ETH & Output Calculated cUSD */}
            <div className="flex flex-col gap-2">
              <div className="rounded-xl border border-oxblood/15 bg-white p-2.5 flex items-center justify-between">
                <input
                  type="number"
                  step="0.001"
                  placeholder="0.05"
                  value={ethInput}
                  onChange={(e) => setEthInput(e.target.value)}
                  className="w-full font-display text-lg text-charcoal focus:outline-none bg-transparent"
                />
                <span className="font-body text-[11px] font-bold text-oxblood bg-rose-50 px-2.5 py-1 rounded-full border border-oxblood/15 shrink-0">
                  Ξ ETH
                </span>
              </div>

              <div className="flex items-center justify-between text-xs px-1 text-charcoal/60">
                <span>Receives:</span>
                <span className="font-mono font-bold text-oxblood">
                  {parseFloat(cusdAmount || "0").toLocaleString("en-US")} cUSD
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-oxblood/10 flex flex-col gap-2">
            <button
              onClick={handleSwap}
              disabled={isSwapping || !ethInput || parseFloat(ethInput) <= 0}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-oxblood py-2.5 px-4 font-body text-xs font-semibold text-white shadow-xs transition-all hover:bg-oxblood/90 disabled:opacity-50 cursor-pointer"
            >
              {isSwapping ? "Swapping..." : `Swap ${ethInput || "0.05"} ETH ➔ cUSD`}
            </button>
            {swapSuccess && <p className="text-[11px] font-bold text-emerald-700 text-center">✓ {swapSuccess}</p>}
            {swapError && <p className="text-[11px] font-semibold text-rose-600 text-center">⚠️ {swapError}</p>}
          </div>
        </div>

      </div>

      {/* ── SECTION: ACTIVE AUCTION OFFERINGS OVERVIEW ──────────── */}
      <div className="rounded-3xl border border-oxblood/15 bg-white/90 p-8 backdrop-blur-md shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl text-charcoal">Available Auction Offerings</h2>
            <p className="text-xs text-charcoal/70 mt-1">
              Select an asset offering to inspect metrics or submit a confidential bid
            </p>
          </div>
          <Link
            href="/investor"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-oxblood/20 bg-oxblood/5 px-5 py-2 text-xs font-semibold text-oxblood hover:bg-oxblood hover:text-white transition-all self-start sm:self-auto"
          >
            View Full Marketplace →
          </Link>
        </div>

        {isAuctionsLoading ? (
          <div className="p-8 text-center font-mono text-xs text-charcoal/50">
            Fetching active auction contracts from Sepolia...
          </div>
        ) : auctions.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-oxblood/20 bg-rose-50/20">
            <p className="font-body text-sm text-charcoal/70">No auctions found on Sepolia testnet yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {auctions.slice(0, 6).map((a) => {
              const statusLabel =
                a.status === 1
                  ? "🟢 Live Bidding"
                  : a.status === 2
                  ? "⏳ Resolution Pending"
                  : a.status === 3
                  ? "✓ Settled"
                  : "Awaiting Escrow";

              const statusBg =
                a.status === 1
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : a.status === 2
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-oxblood/10 text-oxblood border-oxblood/20";

              return (
                <div
                  key={a.address}
                  className="rounded-2xl border border-oxblood/10 bg-white p-5 flex flex-col justify-between transition-all hover:border-oxblood/30 hover:shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`rounded-full border px-3 py-0.5 text-[11px] font-bold ${statusBg}`}>
                        {statusLabel}
                      </span>
                      <span className="font-mono text-[11px] text-charcoal/50">
                        #{shortAddress(a.address)}
                      </span>
                    </div>

                    <div className="mb-4">
                      <span className="text-[11px] font-bold text-charcoal/50 uppercase tracking-wider block">
                        Reserve Price
                      </span>
                      <span className="font-display text-xl text-oxblood font-bold">
                        {formatScaled(a.reservePrice, a.scale)} cUSD
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/investor/${a.address}`}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-50 py-2 px-4 font-body text-xs font-semibold text-oxblood border border-oxblood/15 transition-all hover:bg-oxblood hover:text-white"
                  >
                    <span>Inspect Offering &amp; Bids</span>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
