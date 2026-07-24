import { createViemHandleClient } from "@iexec-nox/handle";
import type { HandleClient } from "@iexec-nox/handle";
import type { WalletClient } from "viem";

// PLAN-FE-frontend.md sketched `getHandleClient(): Promise<HandleClient>` as
// a no-argument singleton, written before this SDK had ever been used
// browser-side. In practice `createViemHandleClient` needs the connected
// account's viem WalletClient (from wagmi's `useWalletClient()`), so the
// signature below takes it explicitly and caches by connected address
// instead — same "init once, reuse" intent, adjusted to the real API.
let cached: { client: HandleClient; account: string } | null = null;

async function getHandleClient(walletClient: WalletClient): Promise<HandleClient> {
  const account = walletClient.account?.address;
  if (!account) {
    throw new Error("Wallet client has no connected account");
  }
  if (cached && cached.account === account) {
    return cached.client;
  }
  // Network config (gatewayUrl/smartContractAddress/subgraphUrl) is
  // auto-resolved from the connected chainId — Sepolia (11155111) is a
  // built-in entry, see @iexec-nox/handle/src/config/networks.ts.
  const client = await createViemHandleClient(walletClient);
  cached = { client, account };
  return client;
}

/** Encrypts a uint256 client-side for use as a bid Q/P, mint amount, etc. */
export async function encryptUint(
  walletClient: WalletClient,
  value: bigint,
  applicationContract: `0x${string}`
) {
  const client = await getHandleClient(walletClient);
  return client.encryptInput(value, "uint256", applicationContract);
}

/**
 * Decrypts a handle the connected wallet is authorized to view (own balance,
 * own bid, an allocation the issuer granted audit access to). Prompts an
 * EIP-712 signature in the wallet — gasless, but not silent; callers should
 * tell the user to expect a signature request before calling this.
 */
export async function decryptHandle(walletClient: WalletClient, handle: `0x${string}`): Promise<bigint> {
  const client = await getHandleClient(walletClient);
  const { value } = await client.decrypt(handle);
  return value as bigint;
}

/**
 * Resolves a handle marked via `Nox.allowPublicDecryption` (e.g. the
 * clearing price) to its plaintext value + the proof `completeSettlement`
 * needs on-chain. This is the off-chain half of Auction.sol's two-step
 * reveal (finalize() marks the handle -> this call -> completeSettlement(proof)).
 */
export async function publicDecryptHandle(walletClient: WalletClient, handle: `0x${string}`) {
  const client = await getHandleClient(walletClient);
  const { value, decryptionProof } = await client.publicDecrypt(handle);
  return { value: value as bigint, proof: decryptionProof };
}
