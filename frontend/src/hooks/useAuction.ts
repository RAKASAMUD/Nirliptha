"use client";

import { useReadContracts } from "wagmi";
import { AUCTION_ABI, CUSD_ABI, CASSET_ABI } from "@/lib/abis";
import { CONTRACTS } from "@/lib/config";

export type AuctionState = {
  status: 0 | 1 | 2 | 3;
  issuer: `0x${string}`; // per-auction — AuctionFactory is permissionless, no single global issuer
  quantity: bigint; // bare integer count of cASSET, NOT scaled by any decimals
  reservePrice: bigint; // fixed-point in Auction.SCALE units (see `scale` below)
  deadline: bigint;
  safeAddress: `0x${string}`;
  clearingPrice: bigint; // same SCALE units as reservePrice
  scale: bigint; // Auction.SCALE() — divide reservePrice/clearingPrice by this, NOT token decimals
  bidCount: number;
  bidders: `0x${string}`[];
  cUsdDecimals: number;
  cAssetDecimals: number;
  isLoading: boolean;
  refetch: () => void;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

// PLAN-FE-frontend.md flagged bidCount as a ⚠️ VERIFY point, recommending
// event-log counting (BidSubmitted) since `bids` has no length getter.
// Reading bids(0..4) directly instead — MAX_BIDS=5 is a fixed, protocol-wide
// Solidity `constant` (compile-time, same for every Auction instance from
// this codebase, not a per-deployment parameter) — avoids getLogs' RPC
// block-range limits entirely and returns bidder addresses in the same
// multicall. `allowFailure: true` (the wagmi default) means slots past the
// real bid count just come back with a revert result, which we filter out.
//
// IMPORTANT correction found while sanity-checking against real Sepolia
// data: cUSD.decimals()/cAsset.decimals() both return 18 (ERC7984Base's
// unmodified default — CUSD.sol/CAsset.sol never override it, despite an
// Auction.sol comment claiming "6 decimals, matches cUSD/cAsset"). But
// `quantity`/`reservePrice`/`clearingPrice` on Auction.sol are NOT token
// amounts scaled by that decimals value at all — they're plain integers in
// the contract's own `SCALE = 1_000_000` fixed-point convention (confirmed:
// on-chain quantity=100000 raw *is* literally 100,000 cASSET; reservePrice
// =1000000 raw is 1.00 at SCALE, not 0.000000000001 at 18 decimals). Token
// decimals are read here for later use (actual balance/deposit displays in
// Task 4/5), but must NOT be used to format quantity/reservePrice/clearingPrice.
export function useAuction(auctionAddress: `0x${string}`): AuctionState {
  // Each call is written as a fully-inline literal (not spread from a shared
  // variable) — wagmi's per-call functionName inference gets confused into
  // unifying all entries to the FIRST spread call's functionName otherwise.
  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      { address: auctionAddress, abi: AUCTION_ABI, functionName: "status" },
      { address: auctionAddress, abi: AUCTION_ABI, functionName: "issuer" },
      { address: auctionAddress, abi: AUCTION_ABI, functionName: "quantity" },
      { address: auctionAddress, abi: AUCTION_ABI, functionName: "reservePrice" },
      { address: auctionAddress, abi: AUCTION_ABI, functionName: "deadline" },
      { address: auctionAddress, abi: AUCTION_ABI, functionName: "safe" },
      { address: auctionAddress, abi: AUCTION_ABI, functionName: "clearingPrice" },
      { address: auctionAddress, abi: AUCTION_ABI, functionName: "SCALE" },
      { address: CONTRACTS.cUSD, abi: CUSD_ABI, functionName: "decimals" },
      { address: CONTRACTS.cAsset, abi: CASSET_ABI, functionName: "decimals" },
      { address: auctionAddress, abi: AUCTION_ABI, functionName: "bids", args: [BigInt(0)] },
      { address: auctionAddress, abi: AUCTION_ABI, functionName: "bids", args: [BigInt(1)] },
      { address: auctionAddress, abi: AUCTION_ABI, functionName: "bids", args: [BigInt(2)] },
      { address: auctionAddress, abi: AUCTION_ABI, functionName: "bids", args: [BigInt(3)] },
      { address: auctionAddress, abi: AUCTION_ABI, functionName: "bids", args: [BigInt(4)] },
    ],
    query: { refetchInterval: 10_000 },
  });

  const [
    statusR,
    issuerR,
    quantityR,
    reservePriceR,
    deadlineR,
    safeR,
    clearingPriceR,
    scaleR,
    cUsdDecR,
    cAssetDecR,
    ...bidSlots
  ] = data ?? [];

  // bids(i) decodes as a labeled positional tuple (not an object) even
  // though every ABI output has a name — [0] is `bidder`.
  const bidders = bidSlots
    .filter((slot) => slot?.status === "success")
    .map((slot) => (slot!.result as readonly [`0x${string}`, ...unknown[]])[0]);

  return {
    status: (statusR?.result as 0 | 1 | 2 | 3) ?? 0,
    issuer: (issuerR?.result as `0x${string}`) ?? ZERO_ADDRESS,
    quantity: (quantityR?.result as bigint) ?? BigInt(0),
    reservePrice: (reservePriceR?.result as bigint) ?? BigInt(0),
    deadline: (deadlineR?.result as bigint) ?? BigInt(0),
    safeAddress: (safeR?.result as `0x${string}`) ?? ZERO_ADDRESS,
    clearingPrice: (clearingPriceR?.result as bigint) ?? BigInt(0),
    scale: (scaleR?.result as bigint) ?? BigInt(1_000_000),
    bidCount: bidders.length,
    bidders,
    cUsdDecimals: (cUsdDecR?.result as number) ?? 18,
    cAssetDecimals: (cAssetDecR?.result as number) ?? 18,
    isLoading,
    refetch,
  };
}
