import { network } from "hardhat";
import { readFileSync } from "fs";
import { createEthersHandleClient } from "@iexec-nox/handle";

// Demo wallet addresses — isi dengan address wallet demo investor (bukan PRIVATE_KEY wallet)
// Untuk hackathon demo: pakai sub-wallets yang derivasinya diketahui, atau hardcode 3 address teman.
// Default sementara: pakai address deployer sendiri (1 wallet multi-role untuk demo solo).
const DEMO_INVESTORS = [
  process.env.DEMO_INVESTOR_1 || "",
  process.env.DEMO_INVESTOR_2 || "",
  process.env.DEMO_INVESTOR_3 || "",
];

const CUSD_AMOUNT = 10_000n; // 10.000 cUSD per investor
const CASSET_AMOUNT = 100_000n; // 100.000 cAsset ke issuer

async function main() {
  const { ethers } = await network.create();
  const [issuer] = await ethers.getSigners();

  // Validate demo investors (fallback to issuer if not set)
  const investors = DEMO_INVESTORS.map((addr, i) => {
    return addr || issuer.address;
  });

  const registry = JSON.parse(readFileSync("deployments/sepolia.json", "utf8"));
  const cusdAddr = registry.contracts.cUSD;
  const cassetAddr = registry.contracts.cAsset;

  console.log(`cUSD:   ${cusdAddr}`);
  console.log(`cAsset: ${cassetAddr}`);
  console.log(`Issuer: ${issuer.address}`);

  const cusd = await ethers.getContractAt("CUSD", cusdAddr);
  const casset = await ethers.getContractAt("CAsset", cassetAddr);
  const handleClient = await createEthersHandleClient(issuer);

  // Mint cUSD to 3 demo investors
  console.log("\n--- Minting cUSD ---");
  for (const investor of investors) {
    console.log(`Minting ${CUSD_AMOUNT} cUSD → ${investor}`);
    const { handle, handleProof } = await handleClient.encryptInput(CUSD_AMOUNT, "uint256", cusdAddr);
    const tx = await cusd.mint(investor, handle, handleProof);
    await tx.wait();
    console.log(`  ✅ tx: ${tx.hash}`);
  }

  // Mint cAsset to issuer
  console.log("\n--- Minting cAsset ---");
  console.log(`Minting ${CASSET_AMOUNT} cAsset → ${issuer.address} (issuer)`);
  const { handle: hAsset, handleProof: pAsset } = await handleClient.encryptInput(CASSET_AMOUNT, "uint256", cassetAddr);
  const txAsset = await casset.mint(issuer.address, hAsset, pAsset);
  await txAsset.wait();
  console.log(`  ✅ tx: ${txAsset.hash}`);

  console.log("\n=== Summary ===");
  console.log(`cUSD minted to ${investors.length} investors (${CUSD_AMOUNT} each)`);
  console.log(`cAsset minted to issuer (${CASSET_AMOUNT})`);
  console.log("Note: Etherscan will show balances as handle (bytes32 hex), not plaintext numbers.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
