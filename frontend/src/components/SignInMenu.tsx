"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDownIcon, ExitIcon } from "@radix-ui/react-icons";
import { shortAddress } from "@/lib/format";
import { LogoutModal } from "./LogoutModal";
import { RoleSwitchModal } from "./RoleSwitchModal";

export function SignInMenu({ isInvestorTheme = false }: { isInvestorTheme?: boolean }) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const pathname = usePathname();
  const router = useRouter();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [switchTarget, setSwitchTarget] = useState<"Issuer" | "Investor" | null>(null);

  const handlePortalNavigation = (targetRole: "Issuer" | "Investor", targetHref: string) => {
    const isCurrentlyOnTarget =
      (targetRole === "Issuer" && pathname?.startsWith("/issuer")) ||
      (targetRole === "Investor" && pathname?.startsWith("/investor"));

    if (isCurrentlyOnTarget) {
      router.push(targetHref);
      return;
    }

    if (isConnected) {
      // User is logged in on one portal and wants to switch to the other portal.
      // Require disconnect & re-login!
      setSwitchTarget(targetRole);
    } else {
      router.push(targetHref);
    }
  };

  const handleConfirmRoleSwitch = () => {
    const target = switchTarget;
    setSwitchTarget(null);
    try {
      disconnect();
    } catch (e) {
      console.error(e);
    }
    if (target === "Issuer") {
      router.push("/issuer");
    } else if (target === "Investor") {
      router.push("/login-investor");
    }
  };

  return (
    <>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild>
          <button
            className={`flex items-center gap-2 rounded-full px-5 py-2 font-body text-sm font-semibold shadow-md transition-all duration-300 focus:outline-none cursor-pointer ${
              isInvestorTheme
                ? "border border-oxblood/30 bg-oxblood text-white hover:bg-oxblood/90 hover:shadow-[0_4px_15px_rgba(132,0,22,0.2)]"
                : "border border-white bg-white text-charcoal hover:bg-white/90 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]"
            }`}
          >
            {isConnected && address ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                <span className="font-mono text-xs">{shortAddress(address)}</span>
              </>
            ) : (
              "Sign in"
            )}
            <ChevronDownIcon className="h-4 w-4" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={10}
            className={`z-[60] min-w-44 rounded-2xl p-1.5 shadow-xl backdrop-blur-xl ${
              isInvestorTheme
                ? "border border-oxblood/20 bg-white/95 text-charcoal shadow-[0_10px_30px_rgba(132,0,22,0.12)]"
                : "border border-hairline-strong bg-surface text-parchment"
            }`}
          >
            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault();
                handlePortalNavigation("Issuer", "/issuer");
              }}
              className={`flex items-center gap-2.5 cursor-pointer rounded-xl px-4 py-2.5 font-body text-sm font-medium outline-none transition-colors ${
                isInvestorTheme
                  ? "text-charcoal hover:bg-rose-50"
                  : "text-parchment hover:bg-white/5 data-[highlighted]:bg-white/5"
              }`}
            >
              <svg className={`h-4 w-4 ${isInvestorTheme ? "text-oxblood" : "text-parchment/80"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Issuer
            </DropdownMenu.Item>

            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault();
                handlePortalNavigation("Investor", "/login-investor");
              }}
              className={`flex items-center gap-2.5 cursor-pointer rounded-xl px-4 py-2.5 font-body text-sm font-medium outline-none transition-colors ${
                isInvestorTheme
                  ? "text-charcoal hover:bg-rose-50"
                  : "text-parchment hover:bg-white/5 data-[highlighted]:bg-white/5"
              }`}
            >
              <svg className={`h-4 w-4 ${isInvestorTheme ? "text-oxblood" : "text-parchment/80"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
              Investor
            </DropdownMenu.Item>

            {isConnected && (
              <>
                <DropdownMenu.Separator className={`my-1 h-[1px] ${isInvestorTheme ? "bg-oxblood/10" : "bg-hairline-strong"}`} />
                
                <DropdownMenu.Item
                  onSelect={(e) => {
                    e.preventDefault();
                    if (isInvestorTheme) {
                      router.push("/investor/wallet");
                    } else {
                      router.push("/issuer?tab=wallet");
                    }
                  }}
                  className={`flex items-center gap-2.5 cursor-pointer rounded-xl px-4 py-2.5 font-body text-sm font-medium outline-none transition-colors ${
                    isInvestorTheme
                      ? "text-charcoal hover:bg-rose-50"
                      : "text-parchment hover:bg-white/5 data-[highlighted]:bg-white/5"
                  }`}
                >
                  <svg className={`h-4 w-4 ${isInvestorTheme ? "text-oxblood" : "text-parchment/80"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Wallet
                </DropdownMenu.Item>

                <DropdownMenu.Item
                  onSelect={(e) => {
                    e.preventDefault();
                    setShowLogoutModal(true);
                  }}
                  className={`group flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 font-body text-sm font-semibold outline-none transition-colors ${
                    isInvestorTheme
                      ? "text-oxblood hover:bg-rose-50 data-[highlighted]:bg-rose-50"
                      : "text-parchment hover:bg-white/10 hover:text-oxblood data-[highlighted]:bg-white/10 data-[highlighted]:text-oxblood"
                  }`}
                >
                  <ExitIcon className={`h-4 w-4 transition-colors ${isInvestorTheme ? "text-oxblood" : "text-parchment"}`} />
                  Disconnect Wallet
                </DropdownMenu.Item>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <LogoutModal
        open={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={() => {
          setShowLogoutModal(false);
          disconnect();
        }}
      />

      <RoleSwitchModal
        open={switchTarget !== null}
        targetRole={switchTarget || "Investor"}
        onCancel={() => setSwitchTarget(null)}
        onConfirm={handleConfirmRoleSwitch}
      />
    </>
  );
}
