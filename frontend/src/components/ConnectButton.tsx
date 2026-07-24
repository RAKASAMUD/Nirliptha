"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { WalletIcon } from "./icons";
import { shortAddress } from "@/lib/format";

// Self-contained wallet widget per PLAN-FE-frontend.md Task 1 Step 5: reads
// connection state directly from wagmi rather than taking it as props, so
// any page can drop in <ConnectButton /> as-is.
export function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { disconnect } = useDisconnect();

  if (!isConnected || !address) {
    return (
      <button
        onClick={() => connect({ connector: connectors[0] })}
        disabled={isConnecting}
        className="rounded-full bg-oxblood px-6 py-2 font-body text-sm font-medium text-white transition-all hover:bg-oxblood-hover disabled:opacity-60 active:scale-[0.98]"
      >
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  if (chainId !== sepolia.id) {
    return (
      <button
        onClick={() => switchChain({ chainId: sepolia.id })}
        disabled={isSwitching}
        className="rounded-full border border-oxblood/50 px-6 py-2 font-body text-sm font-medium text-oxblood transition-all hover:bg-oxblood/10 disabled:opacity-60 active:scale-[0.98]"
      >
        {isSwitching ? "Switching..." : "Switch to Sepolia"}
      </button>
    );
  }

  return (
    <button
      onClick={() => disconnect()}
      className="flex items-center gap-3 rounded-full border border-hairline-strong bg-surface px-4 py-2 transition-colors hover:bg-white/5"
    >
      <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
      <span className="font-mono text-xs tracking-wider text-parchment">
        {shortAddress(address)}
      </span>
      <WalletIcon className="h-4 w-4 text-muted" />
    </button>
  );
}
