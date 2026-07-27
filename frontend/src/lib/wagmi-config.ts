import { createConfig, http, fallback, injected } from "wagmi";
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
    [sepolia.id]: fallback([
      http("https://ethereum-sepolia-rpc.publicnode.com"),
      http("https://rpc.sepolia.org"),
      http("https://1rpc.io/sepolia"),
      http(),
    ]),
  },
  ssr: true,
});
