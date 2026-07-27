// Frozen token addresses per PLAN-FE-frontend.md Global Constraints /
// smart-contracts/deployments/sepolia.json + the Safe address recorded in
// .agents/laporan.md (the withdrawToSafe destination from the real executed
// Sepolia run — not in sepolia.json itself). `factory` was redeployed after
// AuctionFactory.createAuction() dropped its onlyOwner restriction — any
// wallet can now create its own auction, so there is no single protocol-wide
// issuer anymore (see AuctionFactory.sol). The frontend now discovers
// auctions by reading the Factory (useAuctionList), so there's no hardcoded
// demo-auction address here anymore — the M3-era demo auction (created
// under the OLD factory) still works if visited directly at
// /investor/0x3c35ea01f9c197d01Ad6345CA41EB4bFdac84a86, it just won't appear
// in the new listing since it predates this factory.
export const CONTRACTS = {
  cUSD: "0xE52f70B3412b508D4af8AE79a1160eb838DBf711",
  cAsset: "0xa87366C4b276C6fF26acDCA42Bc63143d57124c0",
  factory: "0x79160facE9ABCCB0825db59D9e132C8e73645224",
  safe: "0x6Ca474410D2d9532e9355Ca754fe62a3E340dA63",
} as const;

export const SEPOLIA_CHAIN_ID = 11155111;

export const ETHERSCAN_BASE = "https://sepolia.etherscan.io";

// No manual gateway/subgraph URL needed here: @iexec-nox/handle's
// createViemHandleClient auto-resolves gatewayUrl/smartContractAddress/
// subgraphUrl from the connected chainId (see
// node_modules/@iexec-nox/handle/src/config/networks.ts — Sepolia,
// chainId 11155111, is a built-in entry). See lib/nox.ts.
