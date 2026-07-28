"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { SignInMenu } from "./SignInMenu";

const GITHUB_URL = "https://github.com/RAKASAMUD/Nirliptha";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const isInvestorPage =
    pathname?.startsWith("/investor") || pathname?.startsWith("/login-investor");

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 15) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isLoginPage = pathname?.startsWith("/login-investor");

  return (
    <div
      className={`flex justify-center px-margin-mobile md:px-margin-desktop transition-all duration-300 ${
        isLoginPage
          ? "relative z-0 pt-6 pb-2"
          : `sticky top-0 z-50 ${isScrolled ? "pt-3 pb-3" : "pt-6 pb-2"}`
      }`}
    >
      <nav
        className={`flex h-16 w-full max-w-(--container-max-width) items-center justify-between rounded-full px-6 transition-all duration-300 ${
          isInvestorPage
            ? isScrolled
              ? "border border-oxblood/20 bg-white/95 shadow-xl backdrop-blur-xl scale-[0.99]"
              : "border border-oxblood/15 bg-white/80 backdrop-blur-md shadow-sm"
            : isScrolled
              ? "border border-hairline-strong bg-charcoal/85 shadow-2xl backdrop-blur-xl scale-[0.99]"
              : "border border-white/10 bg-black/40 backdrop-blur-md shadow-md"
        }`}
      >
        <Link
          href="/"
          className={`flex items-center gap-2.5 font-display text-2xl tracking-tight transition-colors ${
            isInvestorPage
              ? "text-oxblood font-bold hover:text-charcoal"
              : "text-parchment hover:text-white"
          }`}
        >
          <img
            src="/icon.png"
            alt="Nirliptha"
            className="h-8 w-8 object-contain rounded-full border border-oxblood/20 shadow-xs"
          />
          <span>NIRLIPTHA</span>
        </Link>
        <div className="flex items-center gap-gutter">
          <SignInMenu isInvestorTheme={isInvestorPage} />
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className={`rounded-full p-2 transition-colors ${
              isInvestorPage
                ? "text-charcoal/70 hover:bg-oxblood/10 hover:text-oxblood"
                : "text-muted hover:bg-white/5 hover:text-parchment"
            }`}
          >
            <GitHubLogoIcon className="h-5 w-5" />
          </a>
        </div>
      </nav>
    </div>
  );
}
