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
    if (!cusdHandle || cusdHandle === "0x0000000000000000000000000000000000000000000000000000000000000000") {
      setDecryptedCusd("0.00");
      return;
    }
    const val = await decrypt(cusdHandle);
    if (val !== null) {
      setDecryptedCusd(formatScaled(val, BigInt(1_000_000)));
    }
  };

  return (
    <div className="flex flex-col gap-8 font-body animate-in fade-in duration-300">
      <div>
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted/70 block mb-1">
          Issuer Console &middot; Balances
        </span>
        <h2 className="font-display text-3xl md:text-4xl text-parchment">
          Issuer Wallet &amp; Treasury Balances
        </h2>
        <p className="mt-1 text-xs md:text-sm text-muted max-w-xl leading-relaxed">
          Monitor your Sepolia testnet gas ETH and confidential cUSD settlement proceeds.
        </p>
      </div>

      {/* ── BALANCE CARDS GRID (2 COLUMNS: ETH & cUSD) ─────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARD 1: SEPOLIA ETH (GAS BALANCE) */}
        <Card className="p-6 flex flex-col justify-between border-hairline-strong bg-black/40">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold text-muted/70 uppercase tracking-wider">
                Gas Currency (Sepolia ETH)
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 font-bold text-xs">
                Ξ
              </div>
            </div>
            <div className="font-display text-3xl text-parchment mb-1">
              {isEthLoading ? (
                <span className="animate-pulse text-muted">Loading...</span>
              ) : ethBalance ? (
                `${parseFloat(formatUnits(ethBalance.value, ethBalance.decimals)).toFixed(4)} ${ethBalance.symbol}`
              ) : (
                "0.0000 ETH"
              )}
            </div>
            <p className="text-xs text-muted/80 leading-relaxed mt-2">
              Sepolia ETH is required to deploy auctions, finalize bidding, and withdraw proceeds.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-hairline flex items-center justify-between text-xs">
            <span className="text-muted/60">Network: Sepolia</span>
            <a
              href="https://sepoliafaucet.com"
              target="_blank"
              rel="noreferrer"
              className="text-parchment font-semibold hover:underline flex items-center gap-1"
            >
              Get Gas ETH ↗
            </a>
          </div>
        </Card>

        {/* CARD 2: CONFIDENTIAL cUSD (ISSUER REVENUE) */}
        <Card className="p-6 flex flex-col justify-between border-oxblood/30 bg-oxblood/10">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold text-oxblood uppercase tracking-wider">
                Confidential cUSD Revenue
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-oxblood/20 text-parchment font-bold text-xs">
                $
              </div>
            </div>

            <div className="font-display text-3xl text-parchment mb-1">
              {decryptedCusd !== null ? (
                `${decryptedCusd} cUSD`
              ) : (
                <span className="text-xl text-muted italic font-sans font-normal">Encrypted (ERC7984)</span>
              )}
            </div>
            <p className="text-xs text-muted/80 leading-relaxed mt-2">
              Confidential USD balance held in your issuer wallet. Protected by Nox TEE protocol.
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
