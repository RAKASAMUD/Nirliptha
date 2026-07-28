"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import { ConnectButton } from "./ConnectButton";

type Props = {
  role: "issuer" | "investor";
};

export function AuthHero({ role }: Props) {
  const { isConnected, address } = useAccount();
  const isInvestor = role === "investor";

  return (
    <div className="flex flex-1 h-full overflow-hidden">

      {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col justify-center px-10 lg:px-20 ${
          isInvestor ? "text-charcoal" : "text-parchment"
        }`}
      >
        {/* Brand Logo Header */}
        <div className="mb-6 inline-flex items-center gap-3">
          <img src="/icon.png" alt="Nirliptha Logo" className="h-10 w-10 object-contain rounded-full" />
          <span className={`font-display text-2xl font-bold tracking-tight uppercase ${isInvestor ? "text-oxblood" : "text-parchment"}`}>
            NIRLIPTHA
          </span>
        </div>

        <h1
          className={`font-display text-4xl sm:text-5xl xl:text-6xl tracking-tight leading-[1.08] ${
            isInvestor ? "text-charcoal" : "text-parchment"
          }`}
        >
          {isInvestor ? (
            <>
              Private Asset<br />
              Offerings.{" "}
              <span className="italic font-normal text-oxblood">
                Zero<br />Strategy Leakage.
              </span>
            </>
          ) : (
            <>
              Issue Real-World<br />
              Assets.{" "}
              <span className="italic font-normal text-oxblood">
                Complete<br />Sealed Privacy.
              </span>
            </>
          )}
        </h1>
      </div>

      {/* ── RIGHT COLUMN — full oxblood panel ───────────────────── */}
      <div className="w-full lg:w-[440px] xl:w-[480px] shrink-0 bg-oxblood flex flex-col items-center justify-center px-10 relative overflow-hidden">

        {/* decorative circles */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-black/20" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-white/[0.03] border border-white/10" />

        <div className="relative z-10 flex flex-col items-center text-center gap-8 max-w-xs w-full">

          {/* ICON LOGO (No square bg box) */}
          <img src="/icon.png" alt="Nirliptha Logo" className="h-16 w-16 object-contain rounded-full drop-shadow-xl" />

          {/* HEADING + SUBTEXT */}
          <div>
            <h2 className="font-display text-3xl xl:text-4xl text-white leading-tight mb-3">
              {isInvestor
                ? "Ready to invest with complete privacy?"
                : "Ready to issue with complete confidentiality?"}
            </h2>
            <p className="text-white/75 text-sm leading-relaxed">
              {isInvestor
                ? "Connect your wallet to access live encrypted offerings. Your wallet is used only for authentication — connecting moves no funds."
                : "Connect your wallet to launch your first confidential auction. Authentication is gasless — no funds are transferred on connection."}
            </p>
          </div>

          {/* CTA */}
          {!isConnected ? (
            <div className="flex flex-col items-center gap-3 w-full">
              <ConnectButton variant="light" />
              <div className="flex items-center gap-2 text-white/50 text-xs">
                <svg className="h-3.5 w-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                No gas fees charged on wallet connection
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 w-full animate-in fade-in duration-300">
              <div className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-4 py-2 text-xs font-bold text-emerald-300 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {address?.slice(0, 6)}...{address?.slice(-4)} — Connected
              </div>
              <Link
                href={isInvestor ? "/investor" : "/issuer"}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-white py-4 px-6 font-body text-sm font-semibold text-oxblood shadow-lg transition-all duration-300 hover:bg-white/90 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
              >
                <span>{isInvestor ? "Enter Investor Marketplace" : "Enter Issuer Console"}</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
