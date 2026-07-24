import Link from "next/link";
import { CodeIcon } from "./icons";
import { ConnectButton } from "./ConnectButton";

const GITHUB_URL = "https://github.com/RAKASAMUD/Nirliptha";

// Locked structure per PLAN-FE-frontend.md Task 2: logo left, Issuer/Investor
// links + GitHub icon right. Rendered once from the root layout (not
// per-page — per the plan), so it takes no props and does no active-route
// detection (that would need usePathname, forcing 'use client' onto every
// route including the landing page, which the plan explicitly says must
// stay a pure Server Component). ConnectButton is a 'use client' leaf
// dropped in here — it's the only always-visible way to disconnect once
// connected, since Issuer/InvestorDashboard stop rendering it after they
// pick up a connected wallet.
export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-hairline bg-charcoal/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-(--container-max-width) items-center justify-between px-margin-mobile md:px-margin-desktop">
        <Link href="/" className="font-display text-2xl tracking-tight text-parchment">
          NIRLIPTA
        </Link>
        <div className="flex items-center gap-gutter">
          <Link
            href="/issuer"
            className="font-body text-sm text-muted transition-colors hover:text-parchment"
          >
            Issuer
          </Link>
          <Link
            href="/investor"
            className="font-body text-sm text-muted transition-colors hover:text-parchment"
          >
            Investor
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="rounded-full p-2 text-muted transition-colors hover:bg-white/5 hover:text-parchment"
          >
            <CodeIcon className="h-5 w-5" />
          </a>
          <ConnectButton />
        </div>
      </div>
    </nav>
  );
}
