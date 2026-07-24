// Frozen contract addresses per PLAN-FE-frontend.md Global Constraints /
// smart-contracts/deployments/sepolia.json (M3 freeze) + the Safe address
// recorded in .agents/laporan.md (the withdrawToSafe destination from the
// real executed Sepolia run — not in sepolia.json itself).
export const CONTRACTS = {
  cUSD: "0x7309886ee42Aa29a796A479A01Eef07a61c8F6Fd",
  cAsset: "0x43d81618774059F0172b7B32c972271a6440003D",
  factory: "0x39536Ea5789538D7F76999e8BDE5679526F815Df",
  safe: "0x6Ca474410D2d9532e9355Ca754fe62a3E340dA63",
  demoAuction: "0x3c35ea01f9c197d01Ad6345CA41EB4bFdac84a86",
} as const;

export const ISSUER_ADDRESS: `0x${string}` = "0x2268CE95fe554D5F07E9657fC14F492DD2df5Fc2";

export const SEPOLIA_CHAIN_ID = 11155111;

export const ETHERSCAN_BASE = "https://sepolia.etherscan.io";

// No manual gateway/subgraph URL needed here: @iexec-nox/handle's
// createViemHandleClient auto-resolves gatewayUrl/smartContractAddress/
// subgraphUrl from the connected chainId (see
// node_modules/@iexec-nox/handle/src/config/networks.ts — Sepolia,
// chainId 11155111, is a built-in entry). See lib/nox.ts.
