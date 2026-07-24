import { createConfig, http, injected } from "wagmi";
import { sepolia } from "wagmi/chains";

// Sepolia only, injected connector (MetaMask) only — per PLAN-FE-frontend.md
// Global Constraints ("Jaringan: Ethereum Sepolia only") and Tech Stack
// ("Wallet connector: MetaMask (injected) — cukup untuk demo").
export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(),
  },
  ssr: true,
});
