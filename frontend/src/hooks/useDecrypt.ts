"use client";

import { useCallback, useState } from "react";
import { useWalletClient } from "wagmi";
import { decryptHandle } from "@/lib/nox";

// Wraps lib/nox.ts:decryptHandle with loading/error state, per
// PLAN-FE-frontend.md Task 3. Returns `bigint | null` rather than the plan's
// sketched `Promise<bigint>` — the plan was written before decryptHandle's
// real failure modes (no wallet connected, user rejects the EIP-712
// signature) were known; resolving to null on failure lets call sites do
// `const v = await decrypt(handle); if (v === null) return;` without a
// try/catch at every call site, while `error` still carries the message for
// display.
export function useDecrypt() {
  const { data: walletClient } = useWalletClient();
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decrypt = useCallback(
    async (handle: `0x${string}`): Promise<bigint | null> => {
      if (!walletClient) {
        setError("Connect your wallet first.");
        return null;
      }
      setIsDecrypting(true);
      setError(null);
      try {
        return await decryptHandle(walletClient, handle);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const rejected = /reject|denied/i.test(message);
        setError(rejected ? "Signature required to decrypt." : message);
        return null;
      } finally {
        setIsDecrypting(false);
      }
    },
    [walletClient]
  );

  return { decrypt, isDecrypting, error };
}
