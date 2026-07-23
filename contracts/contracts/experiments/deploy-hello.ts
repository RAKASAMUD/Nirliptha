import { network } from "hardhat";

async function main() {
  console.log("Starting deployment of HelloNox to Sepolia...");
  
  const { ethers } = await network.create();
  const HelloNox = await ethers.getContractFactory("HelloNox");
  const helloNox = await HelloNox.deploy();
  
  await helloNox.waitForDeployment();
  const address = await helloNox.getAddress();
  
  console.log(`HelloNox deployed successfully!`);
  console.log(`Contract Address: ${address}`);
  console.log(`\nSilakan buka Etherscan Sepolia dan cari alamat di atas.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
