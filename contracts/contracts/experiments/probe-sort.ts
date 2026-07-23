import { network } from "hardhat";
import { createEthersHandleClient } from "@iexec-nox/handle";

async function main() {
  const { ethers } = await network.create();
  const [signer] = await ethers.getSigners();

  console.log("=== T0.7 Probe: Encrypted Sorting Capacity ===");
  const handleClient = await createEthersHandleClient(signer);

  const ProbeSort = await ethers.getContractFactory("ProbeSort");
  const probe = await ProbeSort.deploy();
  await probe.waitForDeployment();
  const contractAddress = await probe.getAddress();
  console.log(`ProbeSort deployed: ${contractAddress}`);

  // Test with N=5 bids, values: [30, 70, 10, 50, 20] — min should be 10
  const bids = [30n, 70n, 10n, 50n, 20n];
  console.log(`\nSubmitting ${bids.length} encrypted bids: [${bids}]`);

  const submitGasUsed: bigint[] = [];
  for (const val of bids) {
    const { handle, handleProof } = await handleClient.encryptInput(val, "uint256", contractAddress);
    const tx = await probe.submitBid(handle, handleProof);
    const receipt = await tx.wait();
    submitGasUsed.push(receipt?.gasUsed ?? 0n);
    process.stdout.write(".");
  }
  console.log("\nAll bids submitted.");
  console.log(`Avg gas per submitBid: ${submitGasUsed.reduce((a, b) => a + b, 0n) / BigInt(bids.length)}`);

  console.log("\nCalling findMin()...");
  const txFind = await probe.findMin();
  const receiptFind = await txFind.wait();
  console.log(`Gas used for findMin() over N=${bids.length}: ${receiptFind?.gasUsed}`);

  const minHandle = await probe.minBid();
  if (minHandle !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log(`✅ PASS: minBid handle is non-zero.`);
    console.log(`findMin gas (N=5): ${receiptFind?.gasUsed}`);
    console.log("Observe: gas scales linearly with N (N-1 comparisons). Extrapolate for N=10, N=20.");
  } else {
    console.log("❌ FAIL: minBid handle is zero.");
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
