// Default props for the presentational pass, matching the REAL auction that
// was already executed end-to-end on Sepolia (see .agents/laporan.md and
// PLAN-FE-frontend.md's frozen contract addresses) — not invented numbers.
// Once PLAN-FE-frontend.md Task 1/3 add the real data layer (lib/config.ts,
// hooks/useAuction.ts), these constants are replaced by live contract reads;
// the component props they feed (AuctionData, AllocationRow[]) already
// match those hooks' return shapes.

export const DEMO_ISSUER_ADDRESS = "0x2268CE95fe554D5F07E9657fC14F492DD2df5Fc2";
export const DEMO_SAFE_ADDRESS = "0x6Ca474410D2d9532e9355Ca754fe62a3E340dA63";
export const DEMO_AUCTION_ADDRESS = "0x3c35ea01f9c197d01Ad6345CA41EB4bFdac84a86";

const DECIMALS = 6;
const scale = (n: number) => BigInt(Math.round(n * 10 ** DECIMALS));

export const DEMO_AUCTION = {
  status: 3 as const, // Settled — the real proven end-to-end scenario
  quantity: scale(100_000),
  reservePrice: scale(1),
  deadline: BigInt(Math.floor(Date.now() / 1000) + 14 * 60 + 32),
  safeAddress: DEMO_SAFE_ADDRESS,
  clearingPrice: scale(1.05),
  bidCount: 5,
  decimals: DECIMALS,
};

// Bid table from PLAN-M2-auction.md Task 3, actually submitted on Sepolia.
export const DEMO_BIDDERS = [
  { address: "0x944D9D6cc31e017eb1D6D207CaD687582Fa0BaFD", q: 30_000, p: 1.2, allocation: 30_000 },
  { address: "0x8486Ca69836Fbfa5d231e04Ef2E96a183854Cef8", q: 50_000, p: 1.1, allocation: 50_000 },
  { address: "0x3AcE92932BFd1819dd33e82F4D397FaE0eE8dB20", q: 40_000, p: 1.05, allocation: 20_000 },
  { address: "0xD19A42dE772d34097bE87248Cf1D6d0E797579A6", q: 20_000, p: 1.05, allocation: 0 },
  { address: "0x8bdC0D857e52bd5958b8c3F3eFEEc8dd44c1717e", q: 15_000, p: 0.95, allocation: 0 },
];

export const DEMO_ALLOCATION_ROWS = DEMO_BIDDERS.map((b, i) => ({
  bidder: b.address,
  isGranted: i === 1, // show one already-granted row so that UI state is visible too
  decryptedValue: i === 1 ? scale(b.allocation) : undefined,
}));
