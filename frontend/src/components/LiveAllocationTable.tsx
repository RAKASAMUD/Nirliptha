"use client";

import { useCallback, useState } from "react";
import { useReadContracts, useWriteContract, usePublicClient, useWalletClient } from "wagmi";
import { AUCTION_ABI } from "@/lib/abis";
import { AllocationTable, type AllocationRow } from "./AllocationTable";
import { GrantAuditModal } from "./GrantAuditModal";
import { useDecrypt } from "@/hooks/useDecrypt";

type Props = {
  auctionAddress: `0x${string}`;
  bidders: `0x${string}`[];
};

// `isGranted`/`decryptedValue` are NOT on-chain readable state — Nox's ACL
// grants live inside the TEE/gateway, not in a public Solidity getter — so
// this is local UI state per PLAN-FE-frontend.md Task 4 Step 6: "State
// per-row: { bidder, allocationHandle, isGranted, decryptedValue | null }.
// Setelah rotate, reset semua decryptedValue ke null dan isGranted ke false."
export function LiveAllocationTable({ auctionAddress, bidders }: Props) {
  const [grantedMap, setGrantedMap] = useState<Record<string, boolean>>({});
  const [decryptedMap, setDecryptedMap] = useState<Record<string, bigint>>({});
  const [modalBidder, setModalBidder] = useState<`0x${string}` | null>(null);

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { decrypt, isDecrypting, error: decryptError } = useDecrypt();

  const { data, refetch } = useReadContracts({
    contracts: bidders.map((bidder) => ({
      address: auctionAddress,
      abi: AUCTION_ABI,
      functionName: "allocations" as const,
      args: [bidder] as const,
    })),
    query: { enabled: bidders.length > 0 },
  });

  const handleGrant = useCallback(
    async (bidder: `0x${string}`, auditor: `0x${string}`) => {
      const hash = await writeContractAsync({
        address: auctionAddress,
        abi: AUCTION_ABI,
        functionName: "grantAuditView",
        args: [bidder, auditor],
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      setGrantedMap((prev) => ({ ...prev, [bidder]: true }));
      setModalBidder(null);
    },
    [auctionAddress, writeContractAsync, publicClient]
  );

  const handleDecrypt = useCallback(
    async (bidderArg: string) => {
      const bidder = bidderArg as `0x${string}`;
      const index = bidders.indexOf(bidder);
      const result = data?.[index]?.result as readonly [`0x${string}`, boolean] | undefined;
      if (!result) return;
      const value = await decrypt(result[0]);
      if (value !== null) {
        setDecryptedMap((prev) => ({ ...prev, [bidder]: value }));
      }
    },
    [bidders, data, decrypt]
  );

  const handleRotate = useCallback(async () => {
    const hash = await writeContractAsync({
      address: auctionAddress,
      abi: AUCTION_ABI,
      functionName: "rotateHandles",
    });
    await publicClient?.waitForTransactionReceipt({ hash });
    // Previously-granted auditors are blind to the new handles, and this
    // viewer's own cached plaintext no longer reflects what's on-chain
    // (the handle it was decrypted from is gone) — reset both, matching
    // Task 4 Step 6 exactly.
    setGrantedMap({});
    setDecryptedMap({});
    refetch();
  }, [auctionAddress, writeContractAsync, publicClient, refetch]);

  const rows: AllocationRow[] = bidders.map((bidder) => ({
    bidder,
    isGranted: grantedMap[bidder] ?? false,
    decryptedValue: decryptedMap[bidder],
  }));

  return (
    <>
      <AllocationTable
        rows={rows}
        onGrantAudit={(bidder) => setModalBidder(bidder as `0x${string}`)}
        onDecrypt={handleDecrypt}
        onRotateHandles={handleRotate}
      />
      {isDecrypting ? (
        <p className="mt-4 font-mono text-xs text-muted">Sign to decrypt — no gas required...</p>
      ) : null}
      {decryptError ? <p className="mt-4 font-mono text-xs text-oxblood">{decryptError}</p> : null}
      <GrantAuditModal
        open={modalBidder !== null}
        defaultAuditor={walletClient?.account.address}
        onCancel={() => setModalBidder(null)}
        onConfirm={(auditor) => modalBidder && handleGrant(modalBidder, auditor)}
      />
    </>
  );
}
