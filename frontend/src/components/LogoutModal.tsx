"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useDisconnect } from "wagmi";
import { ExitIcon } from "@radix-ui/react-icons";

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm?: () => void;
};

export function LogoutModal({ open, onCancel, onConfirm }: Props) {
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  const handleLogout = () => {
    try {
      disconnect();
    } catch (e) {
      console.error("Disconnect error:", e);
    }
    if (onConfirm) onConfirm();
    onCancel();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-6 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-[24px] border border-oxblood/20 bg-white p-6 md:p-8 text-center shadow-2xl font-body">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-oxblood/10 border border-oxblood/20 text-oxblood shadow-xs">
          <ExitIcon className="h-7 w-7" />
        </div>
        
        <span className="mb-1 inline-block rounded-full bg-oxblood/10 px-3 py-0.5 font-mono text-[10px] font-bold text-oxblood uppercase tracking-wider">
          Disconnect Wallet
        </span>

        <h3 className="mb-2 font-display text-2xl md:text-3xl text-charcoal">
          Disconnect Wallet?
        </h3>

        <p className="mb-6 text-xs text-charcoal/70 leading-relaxed">
          Your wallet connection will be disconnected. You can reconnect at any time to submit bids or manage auctions.
        </p>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-oxblood/20 bg-rose-50/50 py-3 px-5 text-xs font-semibold text-charcoal transition-all hover:bg-rose-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex-1 rounded-full bg-oxblood py-3 px-5 text-xs font-semibold text-white shadow-md transition-all hover:bg-oxblood/90 hover:shadow-lg cursor-pointer"
          >
            Disconnect Wallet
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
