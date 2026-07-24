"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { wagmiConfig } from "@/lib/wagmi-config";

// Kept as deep in the tree as possible (wraps only {children}, not
// <html>/<body>) per the Next.js Server-and-Client-Components guide's advice
// on context providers — Server Components passed as `children` here still
// render server-side; only this boundary itself is client.
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
