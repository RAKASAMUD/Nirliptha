import { network } from "hardhat";
import { writeFileSync, existsSync, readFileSync } from "fs";
import { mkdirSync } from "fs";

const DEPLOYMENTS_FILE = "deployments/sepolia.json";

async function main() {
  const { ethers } = await network.create();
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  // Warn if re-deploying over existing addresses
  if (existsSync(DEPLOYMENTS_FILE)) {
    const existing = JSON.parse(readFileSync(DEPLOYMENTS_FILE, "utf8"));
    if (existing.contracts?.cUSD || existing.contracts?.cAsset) {
      console.warn("⚠️  deployments/sepolia.json already has addresses:");
      console.warn(`   cUSD:   ${existing.contracts.cUSD}`);
      console.warn(`   cAsset: ${existing.contracts.cAsset}`);
      console.warn("   Overwriting with new addresses...");
    }
  }

  // Deploy CUSD
  console.log("\nDeploying CUSD...");
  const CUSD = await ethers.getContractFactory("CUSD");
  const cusd = await CUSD.deploy();
  await cusd.waitForDeployment();
  const cusdAddress = await cusd.getAddress();
  console.log(`✅ CUSD: ${cusdAddress}`);
  console.log(`   https://sepolia.etherscan.io/address/${cusdAddress}`);

  // Deploy CAsset
  console.log("\nDeploying CAsset...");
  const CAsset = await ethers.getContractFactory("CAsset");
  const casset = await CAsset.deploy();
  await casset.waitForDeployment();
  const cassetAddress = await casset.getAddress();
  console.log(`✅ CAsset: ${cassetAddress}`);
  console.log(`   https://sepolia.etherscan.io/address/${cassetAddress}`);

  // Write registry
  mkdirSync("deployments", { recursive: true });
  const registry = {
    network: "sepolia",
    chainId: 11155111,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      cUSD: cusdAddress,
      cAsset: cassetAddress,
    },
  };
  writeFileSync(DEPLOYMENTS_FILE, JSON.stringify(registry, null, 2));
  console.log(`\n📝 Saved: ${DEPLOYMENTS_FILE}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
