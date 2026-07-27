"use client";

import { CheckCircleIcon } from "./icons";
import { EncryptedValue } from "./EncryptedValue";

export type AllocationRow = {
  bidder: string;
  isGranted: boolean;
  decryptedValue?: bigint; // present once the viewer has decrypted this row
};

type Props = {
  rows: AllocationRow[];
  decimals?: number;
  onGrantAudit?: (bidder: string) => void;
  onDecrypt?: (bidder: string) => void;
  onRotateHandles?: () => void;
};

function shortAddress(addr: string) {
  return addr.length < 10 ? addr : `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// Audit + rotate table per PLAN-FE-frontend.md Task 4. Purely presentational:
// callbacks (onGrantAudit/onDecrypt/onRotateHandles) are supplied by an
// already-client page once the data-wiring task adds the real
// grantAuditView/decrypt/rotateHandles calls + confirmation modal — no
// contract calls or local state live here.
export function AllocationTable({ rows, decimals = 6, onGrantAudit, onDecrypt, onRotateHandles }: Props) {
  const divisor = BigInt(10) ** BigInt(decimals);

  return (
    <section>
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <h3 className="font-display text-2xl text-parchment">Allocations</h3>
        <div className="flex flex-col items-start md:items-end">
          <button
            onClick={onRotateHandles}
            className="rounded-full border border-hairline-strong px-6 py-2 font-body text-sm text-parchment transition-all hover:bg-white/5"
          >
            Rotate handles
          </button>
          <p className="mt-2 max-w-xs text-[12px] text-muted italic md:text-right">
            Rotates all allocation handles. Auditors granted before rotation lose access to the
            new handles.
          </p>
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-hairline-strong">
              <th className="py-4 font-body text-xs font-medium tracking-wider text-muted uppercase">
                Bidder
              </th>
              <th className="py-4 font-body text-xs font-medium tracking-wider text-muted uppercase">
                Allocation
              </th>
              <th className="py-4 text-right font-body text-xs font-medium tracking-wider text-muted uppercase">
                Audit Status
              </th>
            </tr>
          </thead>
          <tbody className="font-body text-sm font-medium">
            {rows.map((row) => (
              <tr
                key={row.bidder}
                className="border-b border-hairline transition-colors hover:bg-white/[0.02]"
              >
                <td className="py-6 font-mono text-parchment">{shortAddress(row.bidder)}</td>
                <td className="py-6">
                  {row.decryptedValue !== undefined ? (
                    <span data-decrypted-cell className="font-body text-parchment font-semibold">
                      {(row.decryptedValue / divisor).toLocaleString("en-US")} cASSET
                    </span>
                  ) : (
                    <EncryptedValue
                      onDecrypt={row.isGranted ? () => onDecrypt?.(row.bidder) : undefined}
                    />
                  )}
                </td>
                <td className="py-6 text-right">
                  {row.isGranted ? (
                    <span data-granted-badge className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-body text-xs font-medium text-emerald-400">
                      <CheckCircleIcon className="h-4 w-4" />
                      <span>GRANTED</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => onGrantAudit?.(row.bidder)}
                      className="rounded-full border border-hairline-strong px-4 py-1.5 font-body text-xs font-medium text-parchment transition-all hover:bg-white hover:text-charcoal cursor-pointer"
                    >
                      Grant audit view
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
