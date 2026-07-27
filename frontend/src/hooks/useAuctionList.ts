"use client";

import { useReadContracts } from "wagmi";
import { AUCTIONFACTORY_ABI, AUCTION_ABI } from "@/lib/abis";
import { CONTRACTS } from "@/lib/config";

export type AuctionSummary = {
  address: `0x${string}`;
  status: 0 | 1 | 2 | 3;
  issuer: `0x${string}`;
  quantity: bigint;
  reservePrice: bigint;
  deadline: bigint;
  scale: bigint;
  clearingPrice: bigint;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const SUMMARY_FIELDS_PER_AUCTION = 7;

// Three dependent reads: auctionCount() -> auctions(0..count-1) -> a
// per-address summary multicall. Each stage is its own useReadContracts
// call (only `contracts`/`enabled` change between renders as earlier stages
// resolve), same pattern as useBid's bidderIndex -> bids/allocations chain
// — all hook calls stay unconditional, so this doesn't violate
// rules-of-hooks even though the contracts array length is dynamic.
export function useAuctionList() {
  const { data: countData, isLoading: countLoading } = useReadContracts({
    contracts: [
      { address: CONTRACTS.factory as `0x${string}`, abi: AUCTIONFACTORY_ABI, functionName: "auctionCount" },
    ],
    query: { refetchInterval: 15_000, refetchOnMount: "always", staleTime: 0 },
  });

  const count = Number((countData?.[0]?.result as bigint | undefined) ?? BigInt(0));
  const indices = Array.from({ length: count }, (_, i) => i);

  const { data: addrData, isLoading: addrLoading } = useReadContracts({
    contracts: indices.map((i) => ({
      address: CONTRACTS.factory as `0x${string}`,
      abi: AUCTIONFACTORY_ABI,
      functionName: "auctions" as const,
      args: [BigInt(i)] as const,
    })),
    query: { enabled: count > 0 },
  });

  const addresses = (addrData ?? [])
    .filter((r) => r.status === "success")
    .map((r) => r.result as `0x${string}`);

  const { data: summaryData, isLoading: summaryLoading, refetch } = useReadContracts({
    contracts: addresses.flatMap((address) => [
      { address, abi: AUCTION_ABI, functionName: "status" as const },
      { address, abi: AUCTION_ABI, functionName: "issuer" as const },
      { address, abi: AUCTION_ABI, functionName: "quantity" as const },
      { address, abi: AUCTION_ABI, functionName: "reservePrice" as const },
      { address, abi: AUCTION_ABI, functionName: "deadline" as const },
      { address, abi: AUCTION_ABI, functionName: "SCALE" as const },
      { address, abi: AUCTION_ABI, functionName: "clearingPrice" as const },
    ]),
    query: { enabled: addresses.length > 0, refetchInterval: 15_000, refetchOnMount: "always", staleTime: 0 },
  });

  const auctions: AuctionSummary[] = addresses.map((address, i) => {
    const base = i * SUMMARY_FIELDS_PER_AUCTION;
    return {
      address,
      status: (summaryData?.[base]?.result as 0 | 1 | 2 | 3) ?? 0,
      issuer: (summaryData?.[base + 1]?.result as `0x${string}`) ?? ZERO_ADDRESS,
      quantity: (summaryData?.[base + 2]?.result as bigint) ?? BigInt(0),
      reservePrice: (summaryData?.[base + 3]?.result as bigint) ?? BigInt(0),
      deadline: (summaryData?.[base + 4]?.result as bigint) ?? BigInt(0),
      scale: (summaryData?.[base + 5]?.result as bigint) ?? BigInt(1_000_000),
      clearingPrice: (summaryData?.[base + 6]?.result as bigint) ?? BigInt(0),
    };
  });

  return {
    auctions,
    isLoading: countLoading || addrLoading || summaryLoading,
    refetch,
  };
}
