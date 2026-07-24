"use client";

import { WalletIcon } from "./icons";

type Props = {
  address?: string; // already shortened for display, e.g. "0x2268...5Fc2"
  isWrongChain?: boolean;
  onConnect?: () => void;
  onSwitchChain?: () => void;
  onDisconnect?: () => void;
};

// Presentational only — this pass has no wagmi wired up yet (that's
// PLAN-FE-frontend.md Task 1, a separate follow-up). Client component
// because it's meant to eventually hold onClick handlers bound to wagmi
// hooks (useConnect/useSwitchChain/useDisconnect); until then it just
// renders whichever of the three states its props describe.
export function ConnectButton({
  address,
  isWrongChain,
  onConnect,
  onSwitchChain,
  onDisconnect,
}: Props) {
  if (!address) {
    return (
      <button
        onClick={onConnect}
        className="rounded-full bg-oxblood px-6 py-2 font-body text-sm font-medium text-white transition-all hover:bg-oxblood-hover active:scale-[0.98]"
      >
        Connect Wallet
      </button>
    );
  }

  if (isWrongChain) {
    return (
      <button
        onClick={onSwitchChain}
        className="rounded-full border border-oxblood/50 px-6 py-2 font-body text-sm font-medium text-oxblood transition-all hover:bg-oxblood/10 active:scale-[0.98]"
      >
        Switch to Sepolia
      </button>
    );
  }

  return (
    <button
      onClick={onDisconnect}
      className="flex items-center gap-3 rounded-full border border-hairline-strong bg-surface px-4 py-2 transition-colors hover:bg-white/5"
    >
      <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
      <span className="font-mono text-xs tracking-wider text-parchment">{address}</span>
      <WalletIcon className="h-4 w-4 text-muted" />
    </button>
  );
}
