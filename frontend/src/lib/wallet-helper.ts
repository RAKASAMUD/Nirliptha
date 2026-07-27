import type { WalletClient } from "viem";

/**
 * Ensures a valid Viem WalletClient is available even if wagmi's useWalletClient()
 * hook is still resolving asynchronously.
 */
export async function getOrFetchWalletClient(
  walletClientData: WalletClient | undefined | null,
  address: string | undefined
): Promise<WalletClient | null> {
  if (walletClientData) return walletClientData;
  if (!address) return null;

  if (typeof window !== "undefined") {
    const win = window as any;
    const provider = win.rabby || win.phantom?.ethereum || win.ethereum;
    if (provider) {
      const { createWalletClient, custom } = await import("viem");
      const { sepolia } = await import("viem/chains");
      return createWalletClient({
        account: address as `0x${string}`,
        chain: sepolia,
        transport: custom(provider),
      }) as unknown as WalletClient;
    }
  }
  return null;
}
