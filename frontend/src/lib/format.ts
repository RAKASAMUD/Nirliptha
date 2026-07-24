import { ETHERSCAN_BASE } from "./config";

/** Raw on-chain integer -> human-readable string, given the token's real decimals. */
export function formatToken(raw: bigint, decimals: number): string {
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = raw / divisor;
  const fraction = raw % divisor;
  if (fraction === BigInt(0)) return whole.toLocaleString("en-US");
  const fractionStr = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole.toLocaleString("en-US")}.${fractionStr}`;
}

/** Human-readable decimal string/number -> raw on-chain integer, given decimals. */
export function parseToken(value: string | number, decimals: number): bigint {
  const [whole, fraction = ""] = String(value).split(".");
  const paddedFraction = (fraction + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole || "0") * BigInt(10) ** BigInt(decimals) + BigInt(paddedFraction || "0");
}

export function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatCountdown(deadlineTs: number, nowTs: number = Math.floor(Date.now() / 1000)): string {
  const secondsLeft = deadlineTs - nowTs;
  if (secondsLeft <= 0) return "Deadline passed";
  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = Math.floor(secondsLeft % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
    .toString()
    .padStart(2, "0")}`;
}

export function etherscanTx(hash: string): string {
  return `${ETHERSCAN_BASE}/tx/${hash}`;
}

export function etherscanAddress(addr: string): string {
  return `${ETHERSCAN_BASE}/address/${addr}`;
}
