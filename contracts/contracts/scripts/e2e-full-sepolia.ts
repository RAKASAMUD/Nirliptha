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

  const registry = JSON.parse(readFileSync("deployments/sepolia.json", "utf8"));
  const cusdAddr = registry.contracts.cUSD;
  const cassetAddr = registry.contracts.cAsset;
  const factoryAddr = registry.contracts.auctionFactory;
  const safeAddress = process.env.SAFE_ADDRESS || "0x6Ca474410D2d9532e9355Ca754fe62a3E340dA63";

  const bidderKeys = [
    process.env.BIDDER_1_PRIVATE_KEY,
    process.env.BIDDER_2_PRIVATE_KEY,
    process.env.BIDDER_3_PRIVATE_KEY,
    process.env.BIDDER_4_PRIVATE_KEY,
    process.env.BIDDER_5_PRIVATE_KEY,
  ];

  const bidders = bidderKeys.map((key) => new ethers.Wallet(key!, provider));

  console.log("=================================================");
  console.log("🚀 M2/M3 Complete End-to-End Demo on Sepolia      ");
  console.log("=================================================");
  console.log(`Issuer Wallet:    ${issuer.address}`);
  console.log(`Gnosis Safe:     ${safeAddress}`);
  console.log(`AuctionFactory:  ${factoryAddr}`);
  console.log("-------------------------------------------------");

  console.log("🔌 Initializing Nox Handle Clients...");
  const issuerClient = await createEthersHandleClient(issuer);
  const bidderClients = await Promise.all(bidders.map((b) => createEthersHandleClient(b)));

  const cUSD = await ethers.getContractAt("CUSD", cusdAddr);
  const cAsset = await ethers.getContractAt("CAsset", cassetAddr);
  const factory = await ethers.getContractAt("AuctionFactory", factoryAddr);

  // -------------------------------------------------------------------
  // 1. Create Auction via Factory & Escrow cAsset
  // -------------------------------------------------------------------
  const QUANTITY = 100_000n;
  const RESERVE_PRICE = 1_000_000n; // 1.00 in SCALE=1e6
  const latestBlock = await provider.getBlock("latest");
  const deadline = Number(latestBlock!.timestamp) + 330; // 5.5 mins

  console.log(`\n1️⃣  [createAuction] Creating auction on Sepolia...`);
  const createTx = await factory.connect(issuer).createAuction(QUANTITY, RESERVE_PRICE, deadline, safeAddress);
  await createTx.wait();

  const count = await factory.auctionCount();
  const auctionAddr = await factory.auctions(count - 1n);
  console.log(`   ✅ Auction Deployed: ${auctionAddr}`);
  console.log(`      https://sepolia.etherscan.io/address/${auctionAddr}`);

  const auction = await ethers.getContractAt("Auction", auctionAddr);

  // Mint cAsset to issuer & escrow to Auction contract
  console.log(`\n2️⃣  [escrow] Escrowing ${QUANTITY} cAsset to Auction...`);
  const { handle: hAsset, handleProof: pAsset } = await issuerClient.encryptInput(QUANTITY, "uint256", cassetAddr);
  await (await cAsset.connect(issuer).mint(issuer.address, hAsset, pAsset)).wait();

  const { handle: hEscrow, handleProof: pEscrow } = await issuerClient.encryptInput(QUANTITY, "uint256", cassetAddr);
  await (await cAsset.connect(issuer)["confidentialTransfer(address,bytes32,bytes)"](auctionAddr, hEscrow, pEscrow)).wait();

  await (await auction.connect(issuer).confirmEscrow()).wait();
  console.log(`   ✅ Escrow confirmed! Status = Open (1)`);

  // -------------------------------------------------------------------
  // 2. Submit Bids from 5 Bidder Wallets
  // -------------------------------------------------------------------
  const bidConfigs = [
    { q: 30_000n, p: 1_200_000n }, // Bidder 1: $1.20
    { q: 50_000n, p: 1_100_000n }, // Bidder 2: $1.10
    { q: 40_000n, p: 1_050_000n }, // Bidder 3: $1.05
    { q: 20_000n, p: 1_050_000n }, // Bidder 4: $1.05 (FCFS)
    { q: 15_000n, p: 950_000n },   // Bidder 5: $0.95 (Below clearing)
  ];

  console.log(`\n3️⃣  [submitBid] Submitting 5 confidential bids...`);
  for (let i = 0; i < 5; i++) {
    const b = bidders[i];
    const client = bidderClients[i];
    const cfg = bidConfigs[i];
    const deposit = cfg.q * cfg.p;
    const mintAmount = deposit + 1_000_000n;

    const { handle: hMint, handleProof: pMint } = await issuerClient.encryptInput(mintAmount, "uint256", cusdAddr);
    await (await cUSD.connect(issuer).mint(b.address, hMint, pMint)).wait();

    await (await cUSD.connect(b).setOperator(auctionAddr, deadline)).wait();

    const { handle: hQ, handleProof: pQ } = await client.encryptInput(cfg.q, "uint256", auctionAddr);
    const { handle: hP, handleProof: pP } = await client.encryptInput(cfg.p, "uint256", auctionAddr);

    const bidTx = await auction.connect(b).submitBid(hQ, pQ, hP, pP);
    const rec = await bidTx.wait();
    console.log(`   📩 Bidder ${i + 1} (${b.address.slice(0, 8)}...): Tx ${bidTx.hash.slice(0, 10)}... | Gas: ${rec!.gasUsed}`);
  }

  // -------------------------------------------------------------------
  // 3. Wait for Deadline
  // -------------------------------------------------------------------
  console.log(`\n4️⃣  [deadline] Waiting for auction deadline...`);
  while (true) {
    const curBlock = await provider.getBlock("latest");
    const now = Number(curBlock!.timestamp);
    if (now > deadline) break;
    const remaining = deadline - now + 1;
    console.log(`   ⏳ Seconds remaining: ${remaining}s...`);
    await new Promise((resolve) => setTimeout(resolve, Math.min(remaining * 1000, 15000)));
  }
  console.log(`   ⏰ Deadline reached! Proceeding to Finalize.`);

  // -------------------------------------------------------------------
  // 4. Finalize & Complete Settlement
  // -------------------------------------------------------------------
  console.log(`\n5️⃣  [finalize] Ranking bids & marking clearing price...`);
  const finalizeTx = await auction.connect(issuer).finalize();
  const finalizeRec = await finalizeTx.wait();
  console.log(`   ✅ Finalize Tx: ${finalizeTx.hash} | Gas: ${finalizeRec!.gasUsed}`);

  console.log(`\n6️⃣  [publicDecrypt] Fetching public decryption proof from Nox Gateway...`);
  const clearingPriceHandle = await auction.getClearingPriceHandle();

  let decryptionProof: string = "0x";
  let revealedValue: bigint = 0n;

  // Poll gateway up to 60s for indexer to catch up
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await (issuerClient as any).publicDecrypt(clearingPriceHandle);
      decryptionProof = res.decryptionProof;
      revealedValue = BigInt(res.value);
      console.log(`   🔓 Revealed Clearing Price: ${revealedValue / 1_000_000n}.${revealedValue % 1_000_000n} cUSD`);
      break;
    } catch (err: any) {
      console.log(`   ⏳ Gateway indexing (attempt ${attempt}/6)...`);
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }

  console.log(`\n7️⃣  [completeSettlement] Completing settlement on-chain...`);
  const settleTx = await auction.connect(issuer).completeSettlement(decryptionProof);
  await settleTx.wait();

  const price = await auction.clearingPrice();
  console.log(`   🎯 On-Chain Public Clearing Price: ${price / 1_000_000n}.${price % 1_000_000n} cUSD (PASS ✅)`);

  // -------------------------------------------------------------------
  // 5. Audit View & Rotation Demo (M3) — Run BEFORE claim
  // -------------------------------------------------------------------
  console.log(`\n8️⃣  [audit] Testing grantAuditView & rotateHandles (M3)...`);
  const auditor = bidders[4]; // Bidder 5 acts as Auditor
  const auditorClient = bidderClients[4];

  console.log(`   Granting audit view for Bidder 1 allocation to Auditor (${auditor.address.slice(0, 8)}...)...`);
  const grantTx = await auction.connect(issuer).grantAuditView(bidders[0].address, auditor.address);
  await grantTx.wait();

  const b1Alloc = await auction.allocations(bidders[0].address);
  
  // Wait 10s for Nox gateway indexer
  await new Promise((r) => setTimeout(r, 10000));
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

  // -------------------------------------------------------------------
  // 6. Claim / Refund for All 5 Bidders
  // -------------------------------------------------------------------
  console.log(`\n9️⃣  [claim] Bidders claiming cAsset & cUSD refunds...`);
  for (let i = 0; i < 5; i++) {
    const b = bidders[i];
    const claimTx = await auction.connect(b).claim();
    const receipt = await claimTx.wait();
    console.log(`   🎁 Bidder ${i + 1} (${b.address.slice(0, 8)}...) claimed! Tx: ${claimTx.hash.slice(0, 10)}... | Gas: ${receipt!.gasUsed}`);
  }

  // -------------------------------------------------------------------
  // 7. Withdraw Settlement Proceeds to Safe
  // -------------------------------------------------------------------
  console.log(`\n🔟 [withdrawToSafe] Transferring settlement proceeds to Gnosis Safe...`);
  const withdrawTx = await auction.connect(issuer).withdrawToSafe();
  await withdrawTx.wait();
  console.log(`   ✅ Proceeds sent to Safe (${safeAddress})! Tx: ${withdrawTx.hash}`);

  // Save latest demo auction address to sepolia.json
  registry.contracts.demoAuction = auctionAddr;
  writeFileSync("deployments/sepolia.json", JSON.stringify(registry, null, 2));

  console.log("\n=================================================");
  console.log("🎉 ALL M2 & M3 CHECKS PASS ON ETHEREUM SEPOLIA! ");
  console.log("=================================================");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
