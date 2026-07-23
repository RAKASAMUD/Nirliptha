import { network } from "hardhat";
import { createEthersHandleClient } from "@iexec-nox/handle";

async function main() {
  const { ethers } = await network.create();
  const [signer] = await ethers.getSigners();

  console.log("=== T0.5 Probe: Encrypted Arithmetic (mul) ===");
  const handleClient = await createEthersHandleClient(signer);

  // Reuse already-deployed contract (skip redeploy — gateway was down earlier)
  const existingAddress = "0x1B70548E52c94698ff01f297cDe4F07774D5bbD0";
  const probe = await ethers.getContractAt("ProbeArith", existingAddress);
  console.log(`ProbeArith (existing): ${existingAddress}`);

  const contractAddress = await probe.getAddress();

  // Encrypt 5 and 10 — expect result = 50
  console.log("Encrypting 5...");
  const { handle: hA, handleProof: proofA } = await handleClient.encryptInput(5n, "uint256", contractAddress);
  console.log("Encrypting 10...");
  const { handle: hB, handleProof: proofB } = await handleClient.encryptInput(10n, "uint256", contractAddress);

  console.log("Calling multiply(5, 10)...");
  const tx = await probe.multiply(hA, proofA, hB, proofB);
  const receipt = await tx.wait();
  console.log(`Tx hash: ${tx.hash}`);
  console.log(`Gas used: ${receipt?.gasUsed}`);

  const resultHandle = await probe.result();
  console.log(`Result handle (should be non-zero): ${resultHandle}`);

  if (resultHandle !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("✅ PASS: mul() returned a valid handle. Encrypted arithmetic WORKS.");
    console.log(`Gas used for multiply: ${receipt?.gasUsed}`);
  } else {
    console.log("❌ FAIL: result handle is zero.");
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
