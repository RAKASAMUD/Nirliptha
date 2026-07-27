"use client";

import { useCallback, useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { decryptHandle } from "@/lib/nox";
import { getOrFetchWalletClient } from "@/lib/wallet-helper";

// Wraps lib/nox.ts:decryptHandle with loading/error state
export function useDecrypt() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decrypt = useCallback(
    async (handle: `0x${string}`): Promise<bigint | null> => {
      const activeWalletClient = await getOrFetchWalletClient(walletClient, address);
      if (!activeWalletClient) {
        setError("Connect your wallet first.");
        return null;
      }
      setIsDecrypting(true);
      setError(null);
      try {
        return await decryptHandle(activeWalletClient, handle);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const rejected = /reject|denied/i.test(message);
        setError(rejected ? "Signature required to decrypt." : message);
        return null;
      } finally {
        setIsDecrypting(false);
      }
    },
    [walletClient, address]
  );

  return { decrypt, isDecrypting, error };
}
