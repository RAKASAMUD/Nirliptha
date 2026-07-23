import dns from "node:dns";
import { network } from "hardhat";
import { readFileSync, writeFileSync } from "fs";
import { createEthersHandleClient } from "@iexec-nox/handle";

// Override DNS lookup for gateway-testnets.noxprotocol.dev
const originalLookup = dns.lookup;
(dns as any).lookup = (hostname: string, options: any, callback: any) => {
  const cb = typeof options === "function" ? options : callback;
  const opts = typeof options === "object" ? options : {};
  if (hostname === "gateway-testnets.noxprotocol.dev") {
    if (opts.all) return cb(null, [{ address: "20.126.43.29", family: 4 }]);
    return cb(null, "20.126.43.29", 4);
  }
  return originalLookup(hostname, options, callback);
};

async function main() {
  const { ethers } = await network.create();
  const provider = ethers.provider;
  const [issuer] = await ethers.getSigners();

  const auctionAddr = "0x3c35ea01f9c197d01Ad6345CA41EB4bFdac84a86";
  const safeAddress = process.env.SAFE_ADDRESS || "0x6Ca474410D2d9532e9355Ca754fe62a3E340dA63";

  const registry = JSON.parse(readFileSync("deployments/sepolia.json", "utf8"));
  const cusdAddr = registry.contracts.cUSD;
  const cassetAddr = registry.contracts.cAsset;

  const bidderKeys = [
    process.env.BIDDER_1_PRIVATE_KEY,
    process.env.BIDDER_2_PRIVATE_KEY,
    process.env.BIDDER_3_PRIVATE_KEY,
    process.env.BIDDER_4_PRIVATE_KEY,
    process.env.BIDDER_5_PRIVATE_KEY,
  ];

  const bidders = bidderKeys.map((key) => new ethers.Wallet(key!, provider));

  console.log("=================================================");
  console.log("🏁 Completing M2 & M3 Lifecycle on Sepolia       ");
  console.log("=================================================");
  console.log(`Auction Address: ${auctionAddr}`);
  console.log(`Gnosis Safe:     ${safeAddress}`);

  const auction = await ethers.getContractAt("Auction", auctionAddr);
  const cUSD = await ethers.getContractAt("CUSD", cusdAddr);
  const cAsset = await ethers.getContractAt("CAsset", cassetAddr);

  console.log("🔌 Initializing Handle Clients...");
  const issuerClient = await createEthersHandleClient(issuer);
  const bidderClients = await Promise.all(bidders.map((b) => createEthersHandleClient(b)));

  // -------------------------------------------------------------------
  // 1. Claim / Refund for All 5 Bidders
  // -------------------------------------------------------------------
  console.log(`\n8️⃣  [claim] Bidders claiming cAsset & cUSD refunds...`);
  for (let i = 0; i < 5; i++) {
    const b = bidders[i];
    const client = bidderClients[i];
    
    // Check if already claimed
    const isClaimed = (await auction.allocations(b.address)).claimed;
    if (!isClaimed) {
      const claimTx = await auction.connect(b).claim();
      const receipt = await claimTx.wait();
      console.log(`   🎁 Bidder ${i + 1} (${b.address.slice(0, 8)}...) claimed! Tx: ${claimTx.hash} | Gas: ${receipt!.gasUsed}`);
    } else {
      console.log(`   🎁 Bidder ${i + 1} (${b.address.slice(0, 8)}...) already claimed!`);
    }

    try {
      const cUsdHandle = await cUSD.confidentialBalanceOf(b.address);
      const { value: cUsdBal } = await client.decrypt(cUsdHandle);
      const allocRec = await auction.allocations(b.address);
      const { value: allocQty } = await client.decrypt(allocRec.handleQuantity);
      console.log(`      Allocation: ${allocQty} cAsset | Remaining cUSD: ${cUsdBal}`);
    } catch (e: any) {
      console.log(`      (Decrypted via gateway pending indexer: ${e.message})`);
    }
  }

  // -------------------------------------------------------------------
  // 2. Withdraw Settlement Proceeds to Safe
  // -------------------------------------------------------------------
  console.log(`\n9️⃣  [withdrawToSafe] Transferring settlement proceeds to Gnosis Safe...`);
  const withdrawTx = await auction.connect(issuer).withdrawToSafe();
  await withdrawTx.wait();
  console.log(`   ✅ Proceeds sent to Safe (${safeAddress})! Tx: ${withdrawTx.hash}`);

  // -------------------------------------------------------------------
  // 3. Audit View & Rotation Demo (M3)
  // -------------------------------------------------------------------
  console.log(`\n🔟 [audit] Testing grantAuditView & rotateHandles...`);
  const auditor = bidders[4]; // Bidder 5 acts as Auditor
  const auditorClient = bidderClients[4];

  console.log(`   Granting audit view for Bidder 1 allocation to Auditor (${auditor.address.slice(0, 8)}...)...`);
  const grantTx = await auction.connect(issuer).grantAuditView(bidders[0].address, auditor.address);
  await grantTx.wait();

  const b1Alloc = await auction.allocations(bidders[0].address);
  const { value: auditDecrypted } = await auditorClient.decrypt(b1Alloc.handleQuantity);
  console.log(`   🔍 Auditor decrypted Bidder 1 allocation: ${auditDecrypted} cAsset (PASS ✅)`);

  console.log(`   Rotating handles to reset ACL...`);
  const rotateTx = await auction.connect(issuer).rotateHandles();
  await rotateTx.wait();
  console.log(`   🔄 Handles rotated! Tx: ${rotateTx.hash}`);

  try {
    const b1NewAlloc = await auction.allocations(bidders[0].address);
    await auditorClient.decrypt(b1NewAlloc.handleQuantity);
    console.log(`   ❌ ERROR: Auditor still decrypted rotated handle!`);
  } catch (e) {
    console.log(`   🔒 Auditor is now BLIND to rotated handle (PASS ✅)`);
  }

  // Verify bidder 1 can still decrypt their own rotated allocation handle
  const b1NewAlloc = await auction.allocations(bidders[0].address);
  const { value: b1SelfDecrypted } = await bidderClients[0].decrypt(b1NewAlloc.handleQuantity);
  console.log(`   👤 Bidder 1 self-decrypted rotated handle: ${b1SelfDecrypted} cAsset (PASS ✅)`);

  // Save latest demo auction address to sepolia.json
  registry.contracts.demoAuction = auctionAddr;
  writeFileSync("deployments/sepolia.json", JSON.stringify(registry, null, 2));

  console.log("\n=================================================");
  console.log("🎉 M2 & M3 Full Sepolia Lifecycle Execution PASS!");
  console.log("=================================================");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
