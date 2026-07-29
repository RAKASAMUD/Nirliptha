"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { syncOfferingTitles } from "@/lib/offeringTitles";
import { SepoliaEnforcer } from "./SepoliaEnforcer";

export function RootThemeWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isInvestorPage = pathname?.startsWith("/investor") || pathname?.startsWith("/login-investor");

  useEffect(() => {
    syncOfferingTitles();

    // Listen for cross-tab changes (e.g. Issuer creates auction in Tab A, Investor views in Tab B)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "offering_titles_registry") {
        syncOfferingTitles();
      }
    };
    window.addEventListener("storage", handleStorage);

    // Poll API every 15 seconds so different browsers/devices auto-sync titles!
    const intervalId = setInterval(syncOfferingTitles, 15000);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div
      className={`flex flex-col flex-1 min-h-screen w-full transition-colors duration-300 ${
        isInvestorPage
          ? "theme-investor-light bg-gradient-to-b from-white via-rose-50/60 to-rose-100/50 text-charcoal"
          : "theme-dark bg-gradient-to-bl from-[#45000a] via-[#150004] to-[#000000] text-parchment"
      }`}
    >
      <SepoliaEnforcer />
      {children}
    </div>
  );
}
