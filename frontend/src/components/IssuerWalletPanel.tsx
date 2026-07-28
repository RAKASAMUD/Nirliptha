"use client";

import { useState } from "react";
import { useAccount, useBalance, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { CUSD_ABI } from "@/lib/abis";
import { CONTRACTS } from "@/lib/config";
import { formatScaled } from "@/lib/format";
import { useDecrypt } from "@/hooks/useDecrypt";
import { Card } from "./Card";

export function IssuerWalletPanel() {
  const { address } = useAccount();
  const { data: ethBalance, isLoading: isEthLoading } = useBalance({ address });
  const { decrypt, isDecrypting, error: decryptError } = useDecrypt();

  const [decryptedCusd, setDecryptedCusd] = useState<string | null>(null);

  // Read Issuer's encrypted cUSD balance handle
  const { data: cusdData } = useReadContracts({
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

  return (
    <div className="flex flex-col gap-8 font-body animate-in fade-in duration-300">
      <div>
        <h2 className="font-display text-4xl md:text-5xl text-parchment font-bold tracking-tight">
          Wallet
        </h2>
        <p className="mt-1 text-sm md:text-base text-muted max-w-xl leading-relaxed">
          Everything you need to manage auctions.
        </p>
      </div>

      {/* ── STRIPE-LIKE BALANCE CARDS (NETWORK & SETTLEMENT) ─────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARD 1: SEPOLIA ETH (NETWORK BALANCE) */}
        <Card className="p-6 flex flex-col justify-between border-hairline-strong bg-surface/90 hover:border-parchment/30 transition-all shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted/70">
                Network Balance
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 font-bold text-xs">
                Ξ
              </div>
            </div>

            <h3 className="font-body text-sm font-semibold text-muted mb-1">
              Sepolia ETH
            </h3>

            <div className="font-display text-4xl text-parchment mb-2 font-bold">
              {isEthLoading ? (
                <span className="animate-pulse text-muted">Loading...</span>
              ) : ethBalance ? (
                `Ξ ${parseFloat(formatUnits(ethBalance.value, ethBalance.decimals)).toFixed(4)}`
              ) : (
                "Ξ 0.0000"
              )}
            </div>

            <p className="text-xs text-muted/80 leading-relaxed">
              Used to pay transaction fees on Sepolia.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-hairline flex items-center justify-between text-xs">
            <span className="text-muted/60">Network: <strong className="text-parchment">Sepolia</strong></span>
            <a
              href="https://sepoliafaucet.com"
              target="_blank"
              rel="noreferrer"
              className="text-parchment font-semibold hover:underline inline-flex items-center gap-1"
            >
              Get Test ETH ↗
            </a>
          </div>
        </Card>

        {/* CARD 2: CONFIDENTIAL cUSD (SETTLEMENT BALANCE) */}
        <Card className="p-6 flex flex-col justify-between border-oxblood/30 bg-oxblood/10 hover:border-oxblood/50 transition-all shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-oxblood">
                Settlement Balance
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-oxblood/20 text-parchment font-bold text-xs">
                $
              </div>
            </div>

            <h3 className="font-body text-sm font-semibold text-muted mb-1">
              Confidential cUSD
            </h3>

            <div className="font-display text-4xl text-parchment mb-2 font-bold">
              {decryptedCusd !== null ? (
                `${decryptedCusd} cUSD`
              ) : (
                <span className="text-2xl text-muted italic font-sans font-normal">Encrypted (ERC7984)</span>
              )}
            </div>

            <p className="text-xs text-muted/80 leading-relaxed">
              Available settlement proceeds. Revenue from completed auctions, ready to withdraw.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-oxblood/20 flex flex-col gap-2">
            {decryptedCusd === null ? (
              <button
                onClick={handleDecryptCusd}
                disabled={isDecrypting}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-white py-2.5 px-4 font-body text-xs font-semibold text-charcoal shadow-sm transition-all hover:bg-white/90 disabled:opacity-50 cursor-pointer"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {isDecrypting ? "Decrypting via EIP-712..." : "Decrypt cUSD Balance"}
              </button>
            ) : (
              <div className="flex items-center justify-between w-full text-xs">
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  ✓ Decrypted for Session
                </span>
                <button
                  onClick={() => setDecryptedCusd(null)}
                  className="text-muted hover:text-parchment underline"
                >
                  Hide
                </button>
              </div>
            )}
            {decryptError && (
              <p className="text-[11px] text-rose-400 font-medium">{decryptError}</p>
            )}
          </div>
        </Card>

      </div>
    </div>
  );
}
