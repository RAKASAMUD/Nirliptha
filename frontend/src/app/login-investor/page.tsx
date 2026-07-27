"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { AuthHero } from "@/components/AuthHero";

export default function LoginInvestorPage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) {
      const timer = setTimeout(() => {
        router.push("/investor");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isConnected, router]);

  return <AuthHero role="investor" />;
}

