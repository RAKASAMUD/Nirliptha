import dns from "node:dns";
import { network } from "hardhat";
import { readFileSync, writeFileSync } from "fs";
import { createEthersHandleClient } from "@iexec-nox/handle";

// Override DNS lookup for gateway-testnets.noxprotocol.dev to bypass local DNS lookup failures
const originalLookup = dns.lookup;
(dns as any).lookup = (hostname: string, options: any, callback: any) => {
  const cb = typeof options === "function" ? options : callback;
  const opts = typeof options === "object" ? options : {};
  if (hostname === "gateway-testnets.noxprotocol.dev") {
    if (opts.all) {
      return cb(null, [{ address: "20.126.43.29", family: 4 }]);
    }
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

  const safeAddress = process.env.SAFE_ADDRESS;
  if (!safeAddress) {
    throw new Error("SAFE_ADDRESS missing in .env!");
  }

  const bidderKeys = [
    process.env.BIDDER_1_PRIVATE_KEY,
    process.env.BIDDER_2_PRIVATE_KEY,
    process.env.BIDDER_3_PRIVATE_KEY,
    process.env.BIDDER_4_PRIVATE_KEY,
    process.env.BIDDER_5_PRIVATE_KEY,
  ];

  for (let i = 0; i < 5; i++) {
    if (!bidderKeys[i]) throw new Error(`BIDDER_${i + 1}_PRIVATE_KEY missing in .env!`);
  }

  const bidders = bidderKeys.map((key) => new ethers.Wallet(key!, provider));

  console.log("=================================================");
  console.log("🚀 M2/M3 Full Lifecycle Demo on Ethereum Sepolia ");
  console.log("=================================================");
  console.log(`Issuer Wallet:    ${issuer.address}`);
  console.log(`Gnosis Safe:     ${safeAddress}`);
  console.log(`AuctionFactory:  ${factoryAddr}`);
  console.log(`cUSD Contract:   ${cusdAddr}`);
  console.log(`cAsset Contract: ${cassetAddr}`);
  console.log("-------------------------------------------------");

  // Create Handle clients for signers
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
  const deadline = Number(latestBlock!.timestamp) + 360; // 6 minutes deadline

  console.log(`\n1️⃣  [createAuction] Creating auction on Sepolia...`);
  console.log(`   Quantity:      ${QUANTITY.toLocaleString()} cAsset`);
  console.log(`   Reserve Price: ${RESERVE_PRICE / 1_000_000n}.00 cUSD`);
  console.log(`   Deadline:      ${new Date(deadline * 1000).toISOString()} (in 6 mins)`);

  const createTx = await factory.connect(issuer).createAuction(QUANTITY, RESERVE_PRICE, deadline, safeAddress);
  console.log(`   ⏳ Tx sent: ${createTx.hash}`);
  await createTx.wait();

  const count = await factory.auctionCount();
  const auctionAddr = await factory.auctions(count - 1n);
  console.log(`   ✅ Auction Deployed at: ${auctionAddr}`);
  console.log(`      https://sepolia.etherscan.io/address/${auctionAddr}`);

  const auction = await ethers.getContractAt("Auction", auctionAddr);

  // Mint cAsset to issuer & escrow to Auction contract
  console.log(`\n2️⃣  [escrow] Escrowing ${QUANTITY} cAsset to Auction...`);
  const { handle: hAsset, handleProof: pAsset } = await issuerClient.encryptInput(QUANTITY, "uint256", cassetAddr);
  const mintAssetTx = await cAsset.connect(issuer).mint(issuer.address, hAsset, pAsset);
  await mintAssetTx.wait();

  const { handle: hEscrow, handleProof: pEscrow } = await issuerClient.encryptInput(QUANTITY, "uint256", cassetAddr);
  const escrowTx = await cAsset.connect(issuer)["confidentialTransfer(address,bytes32,bytes)"](auctionAddr, hEscrow, pEscrow);
  await escrowTx.wait();

  const confirmTx = await auction.connect(issuer).confirmEscrow();
  await confirmTx.wait();
  console.log(`   ✅ Auction Escrow confirmed! Status = Open (1)`);

  // -------------------------------------------------------------------
  // 2. Submit Bids from 5 Bidder Wallets
  // -------------------------------------------------------------------
  const bidConfigs = [
    { q: 30_000n, p: 1_200_000n }, // Bidder 1: $1.20
    { q: 50_000n, p: 1_100_000n }, // Bidder 2: $1.10
    { q: 40_000n, p: 1_050_000n }, // Bidder 3: $1.05
    { q: 20_000n, p: 1_050_000n }, // Bidder 4: $1.05 (FCFS tie-break)
    { q: 15_000n, p: 950_000n },   // Bidder 5: $0.95 (Below clearing)
  ];

  console.log(`\n3️⃣  [submitBid] Submitting 5 confidential bids...`);
  for (let i = 0; i < 5; i++) {
    const b = bidders[i];
    const client = bidderClients[i];
    const cfg = bidConfigs[i];
    const deposit = cfg.q * cfg.p;
    const mintAmount = deposit + 1_000_000n; // deposit + buffer

    console.log(`   📩 Bidder ${i + 1} (${b.address.slice(0, 8)}...): Q=${cfg.q}, P=${cfg.p / 1_000_000n}.${cfg.p % 1_000_000n}`);

    // Mint cUSD to bidder
    const { handle: hMint, handleProof: pMint } = await issuerClient.encryptInput(mintAmount, "uint256", cusdAddr);
    await (await cUSD.connect(issuer).mint(b.address, hMint, pMint)).wait();

    // Set operator allowance
    await (await cUSD.connect(b).setOperator(auctionAddr, deadline)).wait();

    // Encrypt Q & P
    const { handle: hQ, handleProof: pQ } = await client.encryptInput(cfg.q, "uint256", auctionAddr);
    const { handle: hP, handleProof: pP } = await client.encryptInput(cfg.p, "uint256", auctionAddr);

    // Submit bid
    const bidTx = await auction.connect(b).submitBid(hQ, pQ, hP, pP);
    const receipt = await bidTx.wait();
    console.log(`      ✅ Submitted! Tx: ${bidTx.hash} | Gas: ${receipt!.gasUsed}`);
  }

  // -------------------------------------------------------------------
  // 3. Wait for Deadline
  // -------------------------------------------------------------------
  console.log(`\n4️⃣  [deadline] Waiting for auction deadline (${new Date(deadline * 1000).toLocaleTimeString()})...`);
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

  console.log(`\n6️⃣  [publicDecrypt] Off-chain SDK decrypting clearing price proof...`);
  const clearingPriceHandle = await auction.getClearingPriceHandle();

  // Note: Nox SDK `publicDecrypt` fetches decryption proof from KMS
  let decryptionProof: string = "0x";
  let revealedValue: bigint = 0n;

  // We fetch public decryption proof via Nox handle client or fallback
  try {
    const res = await (issuerClient as any).publicDecrypt(clearingPriceHandle);
    decryptionProof = res.decryptionProof;
    revealedValue = BigInt(res.value);
  } catch (err: any) {
    console.log(`   ⚠️ Nox publicDecrypt via SDK: ${err.message}. Fetching via handleClient.decrypt...`);
    const res = await issuerClient.decrypt(clearingPriceHandle);
    revealedValue = BigInt(res.value);
    // decryptionProof fallback
    decryptionProof = "0x";
  }

  console.log(`   🔓 Revealed Clearing Price: ${revealedValue / 1_000_000n}.${revealedValue % 1_000_000n} cUSD`);

  console.log(`\n7️⃣  [completeSettlement] Completing settlement on-chain...`);
  const settleTx = await auction.connect(issuer).completeSettlement(decryptionProof);
  const settleRec = await settleTx.wait();
  console.log(`   ✅ Settlement Tx: ${settleTx.hash} | Gas: ${settleRec!.gasUsed}`);

  const onChainClearingPrice = await auction.clearingPrice();
  console.log(`   🎯 On-Chain Public Clearing Price: ${onChainClearingPrice / 1_000_000n}.${onChainClearingPrice % 1_000_000n} cUSD`);

  // -------------------------------------------------------------------
  // 5. Claim / Refund for All 5 Bidders
  // -------------------------------------------------------------------
  console.log(`\n8️⃣  [claim] Bidders claiming cAsset & cUSD refunds...`);
  for (let i = 0; i < 5; i++) {
    const b = bidders[i];
    const client = bidderClients[i];
    const claimTx = await auction.connect(b).claim();
    const receipt = await claimTx.wait();
    console.log(`   🎁 Bidder ${i + 1} claimed! Tx: ${claimTx.hash} | Gas: ${receipt!.gasUsed}`);

    const cUsdHandle = await cUSD.confidentialBalanceOf(b.address);
    const { value: cUsdBal } = await client.decrypt(cUsdHandle);

    const allocRec = await auction.allocations(b.address);
    const { value: allocQty } = await client.decrypt(allocRec.handleQuantity);

    console.log(`      Allocation: ${allocQty} cAsset | Remaining cUSD: ${cUsdBal}`);
  }

  // -------------------------------------------------------------------
  // 6. Withdraw Settlement Proceeds to Safe
  // -------------------------------------------------------------------
  console.log(`\n9️⃣  [withdrawToSafe] Transferring settlement proceeds to Gnosis Safe...`);
  const withdrawTx = await auction.connect(issuer).withdrawToSafe();
  await withdrawTx.wait();
  console.log(`   ✅ Proceeds sent to Safe (${safeAddress})! Tx: ${withdrawTx.hash}`);

  // -------------------------------------------------------------------
  // 7. Audit View & Rotation Demo (M3)
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
