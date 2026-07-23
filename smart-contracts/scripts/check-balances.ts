import { network } from "hardhat";
import { readFileSync } from "fs";

async function main() {
  const { ethers } = await network.create();
  const [issuer] = await ethers.getSigners();
  const provider = ethers.provider;

  console.log("=== Sepolia Wallet Balance Check ===");
  const issuerBal = await provider.getBalance(issuer.address);
  console.log(`Issuer (${issuer.address}): ${ethers.formatEther(issuerBal)} ETH`);

  const keys = [
    process.env.BIDDER_1_PRIVATE_KEY,
    process.env.BIDDER_2_PRIVATE_KEY,
    process.env.BIDDER_3_PRIVATE_KEY,
    process.env.BIDDER_4_PRIVATE_KEY,
    process.env.BIDDER_5_PRIVATE_KEY,
  ];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (!key) {
      console.log(`BIDDER_${i+1}: Private key missing in .env`);
      continue;
    }
    const wallet = new ethers.Wallet(key, provider);
    const bal = await provider.getBalance(wallet.address);
    console.log(`BIDDER_${i+1} (${wallet.address}): ${ethers.formatEther(bal)} ETH`);
  }

  const safeAddr = process.env.SAFE_ADDRESS;
  console.log(`Safe Treasury (${safeAddr})`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
