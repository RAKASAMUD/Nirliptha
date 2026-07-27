"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Connector } from "wagmi";

type Props = {
  open: boolean;
  connectors: readonly Connector[];
  isConnecting: boolean;
  onSelect: (connector: Connector) => void;
  onClose: () => void;
};

export function WalletSelectModal({ open, connectors, isConnecting, onSelect, onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  // Curated wallet list configuration with direct provider triggers
  const walletOptions = [
    {
      id: "metaMask",
      name: "MetaMask",
      desc: "Connect using official MetaMask extension",
      icon: "🦊",
      bg: "hover:border-amber-500/50 hover:bg-amber-500/10",
      badge: "Popular",
    },
    {
      id: "rabby",
      name: "Rabby Wallet",
      desc: "Connect using Rabby smart contract wallet",
      icon: "🐰",
      bg: "hover:border-indigo-500/50 hover:bg-indigo-500/10",
      badge: "Recommended",
    },
    {
      id: "phantom",
      name: "Phantom Wallet",
      desc: "Connect using Phantom EVM multi-chain wallet",
      icon: "👻",
      bg: "hover:border-purple-500/50 hover:bg-purple-500/10",
      badge: "EVM",
    },
    {
      id: "injected",
      name: "Default Browser Wallet",
      desc: "Connect using any injected Web3 provider",
      icon: "💳",
      bg: "hover:border-rose-500/50 hover:bg-rose-500/10",
      badge: "Generic",
    },
  ];

  const handleConnectWalletOption = async (walletId: string, matchedConnector: Connector) => {
    if (typeof window !== "undefined") {
      const win = window as any;

      try {
        if (walletId === "rabby" && win.rabby) {
          await win.rabby.request({ method: "eth_requestAccounts" });
        } else if (walletId === "phantom" && (win.phantom?.ethereum || win.ethereum?.isPhantom)) {
          const provider = win.phantom?.ethereum || win.ethereum;
          await provider.request({ method: "eth_requestAccounts" });
        } else if (walletId === "metaMask" && win.ethereum) {
          const provider = win.ethereum.providers?.find((p: any) => p.isMetaMask) || win.ethereum;
          await provider.request({ method: "eth_requestAccounts" });
        } else if (win.ethereum) {
          await win.ethereum.request({ method: "eth_requestAccounts" });
        }
      } catch (err) {
        console.warn("Direct provider request skipped or rejected:", err);
      }
    }

    onSelect(matchedConnector);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-6 backdrop-blur-md animate-in fade-in duration-200 font-body">
      <div className="w-full max-w-md rounded-[28px] border border-oxblood/20 bg-surface p-6 md:p-8 shadow-2xl flex flex-col gap-6 text-parchment">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-hairline pb-4">
          <div>
            <span className="inline-block mb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-oxblood/90">
              Web3 Authentication
            </span>
            <h3 className="font-display text-2xl text-parchment">Select Wallet</h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-hairline text-muted hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Wallet Options List */}
        <div className="flex flex-col gap-3">
          {walletOptions.map((opt) => {
            // Find matching connector or fallback to default
            const matchedConnector =
              connectors.find((c) => c.id.toLowerCase().includes(opt.id.toLowerCase())) ||
              connectors.find((c) => c.name.toLowerCase().includes(opt.name.toLowerCase())) ||
              connectors[0];

            return (
              <button
                key={opt.id}
                disabled={isConnecting || !matchedConnector}
                onClick={() => handleConnectWalletOption(opt.id, matchedConnector)}
                className={`group flex items-center justify-between rounded-2xl border border-hairline bg-white/5 p-4 text-left transition-all duration-300 ${opt.bg} hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-2xl shadow-xs border border-white/10 group-hover:scale-110 transition-transform">
                    {opt.icon}
                  </div>
                  <div>
                    <h4 className="font-body text-sm font-bold text-parchment group-hover:text-white">
                      {opt.name}
                    </h4>
                    <p className="font-body text-[11px] text-muted leading-tight mt-0.5">
                      {opt.desc}
                    </p>
                  </div>
                </div>

                <span className="shrink-0 rounded-full border border-hairline bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-muted group-hover:border-oxblood/40 group-hover:text-parchment">
                  {opt.badge}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-center text-[11px] text-muted/70 leading-relaxed pt-1">
          Nirlipta operates exclusively on <strong className="text-parchment">Sepolia Testnet</strong> with client-side Nox TEE encryption.
        </p>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
