import { network } from "hardhat";
import { readFileSync, writeFileSync } from "fs";

async function main() {
  const { ethers } = await network.create();
  const [deployer] = await ethers.getSigners();

  const registry = JSON.parse(readFileSync("deployments/sepolia.json", "utf8"));
  const cusdAddr = registry.contracts.cUSD;
  const cassetAddr = registry.contracts.cAsset;

  console.log(`Deployer:  ${deployer.address}`);
  console.log(`cUSD:      ${cusdAddr}`);
  console.log(`cAsset:    ${cassetAddr}`);

  console.log("\nDeploying AuctionFactory...");
  const Factory = await ethers.getContractFactory("AuctionFactory");
  const factory = await Factory.deploy(cusdAddr, cassetAddr);
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log(`✅ AuctionFactory: ${factoryAddr}`);
  console.log(`   https://sepolia.etherscan.io/address/${factoryAddr}`);

  // Update registry
  registry.contracts.auctionFactory = factoryAddr;
  writeFileSync("deployments/sepolia.json", JSON.stringify(registry, null, 2));
  console.log("\n📝 Updated deployments/sepolia.json");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
