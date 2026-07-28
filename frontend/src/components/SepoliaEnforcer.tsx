"use client";

import { useEffect } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";

export function SepoliaEnforcer() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  // AUTO-FORCE SWITCH TO SEPOLIA NETWORK IMMEDIATELY UPON WALLET CONNECT
  useEffect(() => {
    if (isConnected && chainId !== sepolia.id && switchChain) {
      try {
        switchChain({ chainId: sepolia.id });
      } catch (err) {
        console.warn("Auto-switch to Sepolia prompt triggered:", err);
      }
    }
  }, [isConnected, chainId, switchChain]);

  if (!isConnected || chainId === sepolia.id) {
    return null;
  }

  return (
    <div className="w-full bg-amber-500 text-charcoal py-2.5 px-4 text-center text-xs font-bold flex flex-wrap items-center justify-center gap-3 z-[9999] shadow-md animate-in slide-in-from-top duration-300">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-charcoal animate-ping" />
        ⚠️ Wrong Network: Nirliptha strictly requires Ethereum Sepolia Testnet (Chain ID {sepolia.id}).
      </span>
      <button
        onClick={() => switchChain?.({ chainId: sepolia.id })}
        disabled={isPending}
        className="rounded-full bg-charcoal text-amber-300 py-1 px-3.5 text-[11px] font-bold hover:bg-black transition-all cursor-pointer disabled:opacity-50"
      >
        {isPending ? "Switching Network..." : "Switch to Sepolia Now ↗"}
      </button>
    </div>
  );
}
