"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { WalletIcon } from "./icons";
import { shortAddress } from "@/lib/format";
import { LogoutModal } from "./LogoutModal";
import { WalletSelectModal } from "./WalletSelectModal";

type ConnectButtonProps = {
  /** "dark" = oxblood bg (default), "light" = white bg with oxblood text */
  variant?: "dark" | "light";
};

export function ConnectButton({ variant = "dark" }: ConnectButtonProps) {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);

  if (!isConnected || !address) {
    const lightCls =
      "bg-white text-oxblood hover:bg-white/90 hover:shadow-[0_0_25px_rgba(255,255,255,0.35)]";
    const darkCls =
      "bg-oxblood text-white hover:bg-oxblood-hover hover:shadow-[0_0_25px_rgba(132,0,22,0.7)]";

    return (
      <>
        <button
          onClick={() => setShowSelectModal(true)}
          className={`group relative inline-flex items-center justify-center overflow-hidden rounded-full px-8 py-3 font-body text-sm font-semibold shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-60 cursor-pointer ${
            variant === "light" ? lightCls : darkCls
          }`}
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
          <span className="relative z-10 flex items-center gap-2">
            <WalletIcon className="h-4 w-4" />
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </span>
        </button>

        <WalletSelectModal
          open={showSelectModal}
          connectors={connectors}
          isConnecting={isConnecting}
          onSelect={(connector) => {
            setShowSelectModal(false);
            connect({ connector });
          }}
          onClose={() => setShowSelectModal(false)}
        />
      </>
    );
  }

  if (chainId !== sepolia.id) {
    return (
      <button
        onClick={() => switchChain({ chainId: sepolia.id })}
        disabled={isSwitching}
        className="group relative inline-flex items-center justify-center overflow-hidden rounded-full border border-oxblood/60 px-6 py-2.5 font-body text-sm font-medium text-oxblood transition-all duration-300 hover:scale-105 hover:bg-oxblood/15 hover:border-oxblood hover:shadow-[0_0_20px_rgba(132,0,22,0.4)] active:scale-95 disabled:opacity-60 cursor-pointer"
      >
        <span className="relative z-10">
          {isSwitching ? "Switching..." : "Switch to Sepolia"}
        </span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowLogoutModal(true)}
        title="Click to Disconnect / Logout wallet"
        className="group flex items-center gap-3 rounded-full border border-hairline-strong bg-surface px-5 py-2.5 transition-all duration-300 hover:scale-105 hover:bg-white hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] active:scale-95 cursor-pointer"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500 group-hover:bg-oxblood shadow-[0_0_8px_rgba(16,185,129,0.5)] group-hover:shadow-[0_0_8px_rgba(132,0,22,0.8)] transition-colors duration-300" />
        <span className="font-mono text-xs tracking-wider text-parchment group-hover:hidden">
          {shortAddress(address)}
        </span>
        <span className="font-mono text-xs font-bold tracking-wider text-oxblood hidden group-hover:inline">
          Disconnect
        </span>
        <WalletIcon className="h-4 w-4 text-muted transition-transform duration-300 group-hover:rotate-12 group-hover:text-oxblood" />
      </button>

      <LogoutModal
        open={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={() => {
          setShowLogoutModal(false);
          disconnect();
        }}
      />
    </>
  );
}
