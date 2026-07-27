"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ExitIcon } from "@radix-ui/react-icons";

type Props = {
  open: boolean;
  targetRole: "Issuer" | "Investor";
  onCancel: () => void;
  onConfirm: () => void;
};

export function RoleSwitchModal({ open, targetRole, onCancel, onConfirm }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-6 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-[24px] border border-oxblood/20 bg-white p-6 md:p-8 text-center shadow-2xl font-body">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-oxblood/10 border border-oxblood/20 text-oxblood shadow-xs">
          <ExitIcon className="h-7 w-7" />
        </div>
        
        <span className="mb-1 inline-block rounded-full bg-oxblood/10 px-3 py-0.5 font-mono text-[10px] font-bold text-oxblood uppercase tracking-wider">
          Re-Authentication Required
        </span>

        <h3 className="mb-2 font-display text-2xl md:text-3xl text-charcoal">
          Switch to {targetRole} Portal?
        </h3>

        <p className="mb-6 text-xs text-charcoal/70 leading-relaxed">
          Switching portals requires disconnecting your current wallet session so you can log in and authenticate fresh for the <strong>{targetRole}</strong> role.
        </p>

        <div className="flex flex-col gap-2.5 pt-2">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full rounded-full bg-oxblood py-3.5 px-5 text-xs font-semibold text-white shadow-md transition-all hover:bg-oxblood/90 hover:shadow-lg cursor-pointer"
          >
            Disconnect &amp; Enter {targetRole} Portal &rarr;
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-full border border-oxblood/20 bg-rose-50/50 py-3 px-5 text-xs font-semibold text-charcoal transition-all hover:bg-rose-50 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
