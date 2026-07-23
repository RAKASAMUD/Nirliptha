import { nox } from "@iexec-nox/nox-hardhat-plugin";
import assert from "node:assert/strict";
import {
  deployAndOpenAuctionViaFactory,
  fundAndSubmitBid,
  futureDeadline,
  advancePastDeadline,
  finalizeAndSettle,
  handleClientFor,
} from "./helpers/auction-fixtures.js";

const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";

describe("M2 — Task 6: full lifecycle E2E via AuctionFactory (local, real Nox primitives)", () => {
  it("createAuction -> submitBid x5 -> finalize -> completeSettlement -> claim x5 -> withdrawToSafe, 9 plan checkpoints", async () => {
    const { ethers } = await nox.connect();
    const [issuer, safe, b1, b2, b3, b4, b5] = await ethers.getSigners();

    const QUANTITY = 100_000n;
    const RESERVE_PRICE = 1_000_000n; // 1.00 in SCALE=1e6 units
    // createAuction requires deadline > block.timestamp + 5 minutes (strict) — 300s exactly fails.
    const deadline = await futureDeadline(ethers, 600);

    // ---- Checkpoint 1: setup — Factory mints instance, escrow moves it AwaitingEscrow -> Open ----
    const { issuerClient, cUSD, cUSDAddr, cAsset, factory, auction, auctionAddr } = await deployAndOpenAuctionViaFactory(
      ethers,
      QUANTITY,
      RESERVE_PRICE,
      deadline,
      safe.address
    );
    assert.equal(await factory.auctionCount(), 1n);
    assert.notEqual(auctionAddr, "0x0000000000000000000000000000000000000000");
    assert.equal(await auction.status(), 1n); // Open

    // Same demo table as PLAN-M2-auction.md Task 3.
    const bids = [
      { signer: b1, q: 30_000n, p: 1_200_000n },
      { signer: b2, q: 50_000n, p: 1_100_000n },
      { signer: b3, q: 40_000n, p: 1_050_000n },
      { signer: b4, q: 20_000n, p: 1_050_000n },
      { signer: b5, q: 15_000n, p: 950_000n },
    ];

    const submitBidGasUsed: bigint[] = [];
    for (const b of bids) {
      const deposit = b.q * b.p;
      const mintAmount = deposit + 1_000_000n;
      const bidderClient = await handleClientFor(b.signer);
      const { handle: hMint, handleProof: pMint } = await issuerClient.encryptInput(mintAmount, "uint256", cUSDAddr);
      await (await cUSD.connect(issuer).mint(b.signer.address, hMint, pMint)).wait();
      await (await cUSD.connect(b.signer).setOperator(auctionAddr, deadline)).wait();
      const { handle: hQ, handleProof: pQ } = await bidderClient.encryptInput(b.q, "uint256", auctionAddr);
      const { handle: hP, handleProof: pP } = await bidderClient.encryptInput(b.p, "uint256", auctionAddr);
      const tx = await auction.connect(b.signer).submitBid(hQ, pQ, hP, pP);
      const receipt = await tx.wait();
      submitBidGasUsed.push(receipt!.gasUsed as bigint);
    }

    // ---- Checkpoint 2: submitBid privacy — stored handles are opaque, not the plaintext values ----
    for (let i = 0; i < bids.length; i++) {
      const record = await auction.bids(i);
      assert.notEqual(record.handleQ, ZERO_HASH, `bids[${i}].handleQ must be a non-zero handle`);
      assert.notEqual(record.handleP, ZERO_HASH, `bids[${i}].handleP must be a non-zero handle`);
      // A plaintext-leak would show up as the raw value left-padded to 32 bytes; handles are
      // TEE-issued opaque identifiers and never equal that pattern.
      const plaintextQAsBytes32 = "0x" + bids[i].q.toString(16).padStart(64, "0");
      assert.notEqual(record.handleQ.toLowerCase(), plaintextQAsBytes32, `bids[${i}].handleQ must not be plaintext Q`);
    }

    // ---- Checkpoint 3: deposits locked — auction's cUSD balance handle is non-zero ----
    const auctionCusdBalanceHandle = await cUSD.confidentialBalanceOf(auctionAddr);
    assert.notEqual(auctionCusdBalanceHandle, ZERO_HASH, "auction should hold a non-zero cUSD balance handle after 5 deposits");

    await advancePastDeadline(ethers, deadline);
    const { finalizeGasUsed } = await finalizeAndSettle(ethers, auction);

    // ---- Checkpoint 4: finalize succeeded — status Settled, clearingPrice public & correct ----
    assert.equal(await auction.status(), 3n); // Settled
    const clearingPrice = await auction.clearingPrice();
    assert.equal(clearingPrice, 1_050_000n);

    // ---- Checkpoint 5: allocation correctness ----
    const expectedAlloc = [
      { bidder: b1, alloc: 30_000n },
      { bidder: b2, alloc: 50_000n },
      { bidder: b3, alloc: 20_000n },
      { bidder: b4, alloc: 0n },
      { bidder: b5, alloc: 0n },
    ];
    for (const e of expectedAlloc) {
      const record = await auction.allocations(e.bidder.address);
      const client = await handleClientFor(e.bidder);
      const { value } = await client.decrypt(record.handleQuantity);
      assert.equal(value, e.alloc, `allocation mismatch for ${e.bidder.address}`);
    }

    // ---- Checkpoint 6 + 7: refund correctness + claim() indistinguishability ----
    // claim() is a SINGLE function with the same signature/selector regardless of win/loss —
    // structurally indistinguishable from outside; here we confirm all 5 calls succeed via the
    // same entrypoint and land on the exact post-refund balance PLAN-M2-auction.md Task 6 expects.
    const claimGasUsed: bigint[] = [];
    for (let i = 0; i < bids.length; i++) {
      const b = bids[i];
      const deposit = b.q * b.p;
      const mintAmount = deposit + 1_000_000n;
      const tx = await auction.connect(b.signer).claim();
      const receipt = await tx.wait();
      claimGasUsed.push(receipt!.gasUsed as bigint);

      const client = await handleClientFor(b.signer);
      const { value: cUsdBal } = await client.decrypt(await cUSD.confidentialBalanceOf(b.signer.address));
      // Started with `mintAmount`, locked `deposit` as escrow -> (mintAmount - deposit) remaining,
      // then refunded (deposit - owed) on claim -> final = mintAmount - owed.
      const alloc = expectedAlloc[i].alloc;
      const owed = alloc * clearingPrice; // in raw SCALE units, matches contract's Nox.mul(alloc, clearingPrice)
      const expectedFinalBalance = mintAmount - owed;
      assert.equal(cUsdBal, expectedFinalBalance, `final cUSD balance mismatch for bidder ${i}`);
    }

    // ---- Checkpoint 8: Safe balance after withdrawToSafe ----
    await (await auction.connect(issuer).withdrawToSafe()).wait();
    const safeClient = await handleClientFor(safe);
    const { value: safeBal } = await safeClient.decrypt(await cUSD.confidentialBalanceOf(safe.address));
    // quantity_sold * clearingPrice = (30,000 + 50,000 + 20,000) * 1,050,000
    const quantitySold = 30_000n + 50_000n + 20_000n;
    assert.equal(safeBal, quantitySold * clearingPrice, "Safe should receive quantity_sold * clearingPrice");

    // ---- Checkpoint 9: gas budget ----
    console.log(`    [gas] finalize()   = ${finalizeGasUsed} (target < 27M, block limit 30M)`);
    console.log(`    [gas] submitBid    = ${submitBidGasUsed.join(", ")} (target < 700K each)`);
    console.log(`    [gas] claim        = ${claimGasUsed.join(", ")} (target < 700K each)`);
    assert.ok(finalizeGasUsed < 27_000_000n, `finalize() gas ${finalizeGasUsed} exceeds 27M target`);
    for (const g of submitBidGasUsed) assert.ok(g < 700_000n, `submitBid gas ${g} exceeds 700K target`);
    for (const g of claimGasUsed) assert.ok(g < 700_000n, `claim gas ${g} exceeds 700K target`);
  });
});
