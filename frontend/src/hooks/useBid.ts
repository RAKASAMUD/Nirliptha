"use client";

import { useCallback } from "react";
import {
  useAccount,
  useReadContracts,
  useWriteContract,
  usePublicClient,
  useWalletClient,
} from "wagmi";
import { AUCTION_ABI, CUSD_ABI } from "@/lib/abis";
import { CONTRACTS } from "@/lib/config";
import { encryptUint } from "@/lib/nox";
import { getOrFetchWalletClient } from "@/lib/wallet-helper";

export type BidRecord = {
  bidder: `0x${string}`;
  handleQ: `0x${string}`;
  handleP: `0x${string}`;
  handleActualDeposit: `0x${string}`;
  claimed: boolean;
};

export type Allocation = {
  handleQuantity: `0x${string}`;
  claimed: boolean;
};

// bidderIndex is 1-indexed on-chain (0 = not bid) — see Auction.sol line 39.
// Reading it first, then bids(idx-1)/allocations(address) as a second
// dependent useReadContracts call, since the bid index isn't known until
// the first read resolves. Both hook calls are unconditional (only their
// `contracts`/`enabled` args change), so this doesn't violate rules-of-hooks.
export function useBid(auctionAddress: `0x${string}`) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const { data: indexData, refetch: refetchIndex } = useReadContracts({
    contracts: [
      {
        address: auctionAddress,
        abi: AUCTION_ABI,
        functionName: "bidderIndex",
        args: [address ?? "0x0000000000000000000000000000000000000000"],
      },
    ],
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  const bidderIndexRaw = (indexData?.[0]?.result as bigint | undefined) ?? BigInt(0);
  const hasBid = bidderIndexRaw > BigInt(0);
  const bidIndex = hasBid ? bidderIndexRaw - BigInt(1) : null;

  const { data: detailData, refetch: refetchDetail } = useReadContracts({
    contracts: [
      {
        address: auctionAddress,
        abi: AUCTION_ABI,
        functionName: "bids",
        args: [bidIndex ?? BigInt(0)],
      },
      {
        address: auctionAddress,
        abi: AUCTION_ABI,
        functionName: "allocations",
        args: [address ?? "0x0000000000000000000000000000000000000000"],
      },
    ],
    query: { enabled: hasBid && !!address, refetchInterval: 10_000 },
  });

  const bidTuple = detailData?.[0]?.result as
    | readonly [`0x${string}`, bigint, `0x${string}`, `0x${string}`, `0x${string}`, boolean]
    | undefined;
  const allocTuple = detailData?.[1]?.result as readonly [`0x${string}`, boolean] | undefined;

  const bidRecord: BidRecord | null = bidTuple
    ? {
        bidder: bidTuple[0],
        handleQ: bidTuple[2],
        handleP: bidTuple[3],
        handleActualDeposit: bidTuple[4],
        claimed: bidTuple[5],
      }
    : null;

  const allocation: Allocation | null = allocTuple
    ? { handleQuantity: allocTuple[0], claimed: allocTuple[1] }
    : null;

  const refetch = useCallback(() => {
    refetchIndex();
    refetchDetail();
  }, [refetchIndex, refetchDetail]);

  // deadline is passed in by the caller (InvestorDashboard already reads it
  // via useAuction) rather than re-read here, to avoid a third dependent
  // contract call just for setOperator's `until` argument.
  const submitBid = useCallback(
    async (quantityRaw: bigint, priceRaw: bigint, deadline: bigint, onStep?: (step: string) => void) => {
      if (!publicClient || !address) {
        throw new Error("Connect your wallet first.");
      }

      const activeWalletClient = await getOrFetchWalletClient(walletClient, address);
      if (!activeWalletClient) {
        throw new Error("Connect your wallet first.");
      }

      const isOperator = (await publicClient.readContract({
        address: CONTRACTS.cUSD as `0x${string}`,
        abi: CUSD_ABI,
        functionName: "isOperator",
        args: [address, auctionAddress],
      })) as boolean;

      if (!isOperator) {
        onStep?.("Step 1/2: Approving...");
        const approveTx = await writeContractAsync({
          address: CONTRACTS.cUSD as `0x${string}`,
          abi: CUSD_ABI,
          functionName: "setOperator",
          args: [auctionAddress, Number(deadline)],
          gas: BigInt(200_000),
        });
        await publicClient.waitForTransactionReceipt({ hash: approveTx });
      }

      onStep?.("Step 2/2: Encrypting & Bidding...");
      const { handle: qH, handleProof: qP } = await encryptUint(activeWalletClient, quantityRaw, auctionAddress);
      const { handle: pH, handleProof: pP } = await encryptUint(activeWalletClient, priceRaw, auctionAddress);

      onStep?.("Step 2/2: Submitting encrypted bid...");
      const submitTx = await writeContractAsync({
        address: auctionAddress,
        abi: AUCTION_ABI,
        functionName: "submitBid",
        args: [qH, qP, pH, pP],
        gas: BigInt(3_000_000),
      });
      await publicClient.waitForTransactionReceipt({ hash: submitTx });
      refetch();
    },
    [walletClient, publicClient, address, auctionAddress, writeContractAsync, refetch]
  );

  const claim = useCallback(async () => {
    if (!publicClient) throw new Error("Connect your wallet first.");
    const hash = await writeContractAsync({
      address: auctionAddress,
      abi: AUCTION_ABI,
      functionName: "claim",
      gas: BigInt(3_000_000),
    });
    await publicClient.waitForTransactionReceipt({ hash });
    refetch();
  }, [publicClient, writeContractAsync, auctionAddress, refetch]);

  return {
    hasBid,
    bidIndex,
    bidRecord,
    allocation,
    hasClaimed: allocation?.claimed ?? false,
    submitBid,
    claim,
    refetch,
  };
}
