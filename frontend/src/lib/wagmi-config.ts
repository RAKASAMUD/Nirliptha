import { createConfig, http, injected } from "wagmi";
import { sepolia } from "wagmi/chains";

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [
    injected({ target: "metaMask" }),
    injected({ target: "rabby" }),
    injected({ target: "phantom" }),
    injected(),
  ],
  transports: {
    [sepolia.id]: http(),
  },
  ssr: true,
});
