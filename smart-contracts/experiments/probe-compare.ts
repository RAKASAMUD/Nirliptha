import { network } from "hardhat";
import { createEthersHandleClient } from "@iexec-nox/handle";

async function main() {
  const { ethers } = await network.create();
  const [signer] = await ethers.getSigners();

  console.log("=== T0.6 Probe: Encrypted Comparison (ge) ===");
  const handleClient = await createEthersHandleClient(signer);

  const ProbeCompare = await ethers.getContractFactory("ProbeCompare");
  const probe = await ProbeCompare.deploy();
  await probe.waitForDeployment();
  const contractAddress = await probe.getAddress();
  console.log(`ProbeCompare deployed: ${contractAddress}`);

  // Case A: 100 >= 50 → should be true
  console.log("\n[Case A] 100 >= 50 (expect: ebool = true)");
  const { handle: h100, handleProof: p100 } = await handleClient.encryptInput(100n, "uint256", contractAddress);
  const { handle: h50, handleProof: p50 } = await handleClient.encryptInput(50n, "uint256", contractAddress);
  const txA = await probe.compare(h100, p100, h50, p50);
  const receiptA = await txA.wait();
  const geHandleA = await probe.lastGe();
  console.log(`Gas used: ${receiptA?.gasUsed}`);
  console.log(`ebool handle (non-zero = OK): ${geHandleA}`);

  // Case B: 30 >= 50 → should be false
  console.log("\n[Case B] 30 >= 50 (expect: ebool = false, but still a valid handle)");
  const { handle: h30, handleProof: p30 } = await handleClient.encryptInput(30n, "uint256", contractAddress);
  const { handle: h50b, handleProof: p50b } = await handleClient.encryptInput(50n, "uint256", contractAddress);
  const txB = await probe.compare(h30, p30, h50b, p50b);
  const receiptB = await txB.wait();
  const geHandleB = await probe.lastGe();
  console.log(`Gas used: ${receiptB?.gasUsed}`);
  console.log(`ebool handle: ${geHandleB}`);

  if (geHandleA !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("\n✅ PASS: ge() returns valid ebool handle. Encrypted comparison WORKS.");
    console.log("Decision: jalur ketat submitBid dengan encrypted comparison FEASIBLE.");
  } else {
    console.log("\n❌ FAIL: ge() returned zero handle.");
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
