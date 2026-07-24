"use client";

import { CheckCircleIcon, OpenInNewIcon } from "./icons";

const ETHERSCAN_BASE = "https://sepolia.etherscan.io";

type Props = {
  hash?: string;
  isPending?: boolean;
  isSuccess?: boolean;
  error?: string;
  onRetry?: () => void;
};

// Presentational shell for PLAN-FE Task 1's tx-feedback requirement ("Semua
// tx: tampilkan pending state + link Etherscan setelah confirmed. Jangan
// silent."). No hooks of its own — the wagmi wiring task drives these props
// from useWaitForTransactionReceipt.
export function TxStatus({ hash, isPending, isSuccess, error, onRetry }: Props) {
  if (isPending) {
    return (
      <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.1em] text-muted">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted border-t-oxblood" />
        Waiting for confirmation...
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.1em] text-parchment">
        <CheckCircleIcon className="h-4 w-4 text-oxblood" />
        Confirmed
        {hash ? (
          <a
            href={`${ETHERSCAN_BASE}/tx/${hash}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-oxblood hover:underline"
          >
            View on Etherscan
            <OpenInNewIcon className="h-3 w-3" />
          </a>
        ) : null}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.1em] text-oxblood">
        {error}
        {onRetry ? (
          <button onClick={onRetry} className="underline hover:no-underline">
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  return null;
}
