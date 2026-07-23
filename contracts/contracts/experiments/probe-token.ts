import { network } from "hardhat";
import { createEthersHandleClient } from "@iexec-nox/handle";

async function main() {
  const { ethers } = await network.create();
  const [signer] = await ethers.getSigners();

  console.log("=== T0.9 Probe: ERC-7984 Base Extension ===");
  const handleClient = await createEthersHandleClient(signer);

  // Reuse already-deployed contract
  const existingAddress = "0xfe9873287eE7f226Eb6Ec9D9c7bbD0E10133cB81";
  const token = await ethers.getContractAt("ProbeToken", existingAddress);
  console.log(`ProbeToken (existing): ${existingAddress}`);

  // mint already ran — check confidentialBalanceOf directly
  console.log("\nChecking confidentialBalanceOf (ERC7984 uses this, not balanceOf)...");
  const balanceHandle = await token.confidentialBalanceOf(signer.address);
  console.log(`Balance handle: ${balanceHandle}`);

  if (balanceHandle !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("✅ PASS: ERC7984 base can be extended. balanceOf returns handle.");
    console.log("Decision: cUSD & cAsset extend ERC7984 directly (Opsi A).");
  } else {
    console.log("❌ FAIL: balance handle is zero.");
  }

  // Test wrapEncrypted
  console.log("\nTesting wrapEncrypted...");
  const { handle, handleProof } = await handleClient.encryptInput(50n, "uint256", existingAddress);
  const txWrap = await token.wrapEncrypted(handle, handleProof);
  const receiptWrap = await txWrap.wait();
  console.log(`Gas used for wrapEncrypted: ${receiptWrap?.gasUsed}`);
  console.log("✅ wrapEncrypted succeeded.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
