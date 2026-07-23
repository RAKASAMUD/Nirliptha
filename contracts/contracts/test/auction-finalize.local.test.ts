import { nox } from "@iexec-nox/nox-hardhat-plugin";
import assert from "node:assert/strict";
import {
  deployAndOpenAuction,
  fundAndSubmitBid,
  futureDeadline,
  advancePastDeadline,
  finalizeAndSettle,
  handleClientFor,
} from "./helpers/auction-fixtures.js";

describe("M2 — Auction.finalize() + completeSettlement() (local, real Nox primitives)", () => {
  it("5-bidder scenario from PLAN-M2-auction.md: correct clearing price, allocations, FCFS tie-break, reserve filter", async () => {
    const { ethers } = await nox.connect();
    const signers = await ethers.getSigners();
    const [issuer, b1, b2, b3, b4, b5] = signers;

    const QUANTITY = 100_000n;
    const RESERVE_PRICE = 1_000_000n; // 1.00 in SCALE=1e6 units
    const deadline = await futureDeadline(ethers, 300);

    const { issuerClient, cUSD, cUSDAddr, auction, auctionAddr } = await deployAndOpenAuction(
      ethers,
      QUANTITY,
      RESERVE_PRICE,
      deadline
    );

    // Bids from PLAN-M2-auction.md Task 3 demo table.
    // bidder | Q       | P (SCALE=1e6) | deposit = Q*P     | expected outcome
    // b1     | 30,000  | 1,200,000     | 36,000,000,000    | full win 30,000
    // b2     | 50,000  | 1,100,000     | 55,000,000,000    | full win 50,000
    // b3     | 40,000  | 1,050,000     | 42,000,000,000    | partial win 20,000 (FCFS: bidIndex 2 < 3)
    // b4     | 20,000  | 1,050,000     | 21,000,000,000    | loses (FCFS: bidIndex 3 > 2, quota exhausted)
    // b5     | 15,000  | 950,000       | 14,250,000,000    | loses (below reserve 1,000,000)
    const bids = [
      { signer: b1, q: 30_000n, p: 1_200_000n },
      { signer: b2, q: 50_000n, p: 1_100_000n },
      { signer: b3, q: 40_000n, p: 1_050_000n },
      { signer: b4, q: 20_000n, p: 1_050_000n },
      { signer: b5, q: 15_000n, p: 950_000n },
    ];

    for (const b of bids) {
      const deposit = b.q * b.p;
      const mintAmount = deposit + 1_000_000n; // comfortable headroom, all fully funded
      await fundAndSubmitBid(
        ethers, cUSD, cUSDAddr, auction, auctionAddr, issuer, issuerClient,
        b.signer, mintAmount, b.q, b.p, deadline
      );
    }

    await advancePastDeadline(ethers, deadline);
    const { finalizeGasUsed } = await finalizeAndSettle(ethers, auction);
    assert.equal(await auction.status(), 3n); // Settled

    console.log(`    [gas] finalize() used ${finalizeGasUsed} gas (target < 27M, block limit 30M)`);
    assert.ok(finalizeGasUsed < 30_000_000n, `finalize() gas ${finalizeGasUsed} exceeds Sepolia block limit`);

    const clearingPrice = await auction.clearingPrice();
    assert.equal(clearingPrice, 1_050_000n, "clearing price should be 1.05 (marginal bid's price)");

    const expected = [
      { bidder: b1, alloc: 30_000n },
      { bidder: b2, alloc: 50_000n },
      { bidder: b3, alloc: 20_000n }, // partial FCFS winner
      { bidder: b4, alloc: 0n }, // FCFS loser at the margin
      { bidder: b5, alloc: 0n }, // below reserve
    ];

    // Re-authenticate a fresh handle client right before each decrypt rather than reusing the
    // one created at bid-submission time: the gateway issues a short-lived session token, and
    // this loop runs well after the heavy finalize() computation — a client held that long can
    // hit a "token is not active or expired" 401 from the gateway.
    for (const e of expected) {
      const record = await auction.allocations(e.bidder.address);
      const freshClient = await handleClientFor(e.bidder);
      const { value } = await freshClient.decrypt(record.handleQuantity);
      assert.equal(value, e.alloc, `allocation mismatch for ${e.bidder.address}`);
    }
  });

  it("under-funded bidder is excluded from allocation even when their price would otherwise win (paidFull gate)", async () => {
    const { ethers } = await nox.connect();
    const [issuer, richButUnderfunded, honest] = await ethers.getSigners();

    // NOTE: quantity is deliberately much larger than either bid's Q. cumQ/rank ranking is
    // computed purely from price BEFORE the paidFull gate is applied, so a disqualified
    // high-price bid still "occupies" quota in that ranking pass. With a tight quantity (e.g.
    // == honest's Q), the disqualified bidder's phantom-ranked Q would push honest's cumAbove
    // to exactly Q_total, misclassifying honest as a loser too. Generous headroom avoids that.
    const QUANTITY = 1_000n;
    const RESERVE_PRICE = 1n;
    const deadline = await futureDeadline(ethers, 300);

    const { issuerClient, cUSD, cUSDAddr, auction, auctionAddr } = await deployAndOpenAuction(
      ethers,
      QUANTITY,
      RESERVE_PRICE,
      deadline
    );

    // richButUnderfunded bids a HIGH price (would win outright by sort order) but is only
    // funded for a fraction of the required Q×P deposit -> must end up with allocation 0.
    await fundAndSubmitBid(
      ethers, cUSD, cUSDAddr, auction, auctionAddr, issuer, issuerClient,
      richButUnderfunded, 5n, // mint far less than the 100*10=1000 required deposit
      100n, 10n, deadline
    );

    await fundAndSubmitBid(
      ethers, cUSD, cUSDAddr, auction, auctionAddr, issuer, issuerClient,
      honest, 1_000n, 100n, 2n, deadline
    );

    await advancePastDeadline(ethers, deadline);
    await finalizeAndSettle(ethers, auction);
    assert.equal(await auction.status(), 3n); // Settled

    // Fresh clients here too — see the comment on the same pattern in the 5-bidder test above.
    const underfundedAlloc = await auction.allocations(richButUnderfunded.address);
    const underfundedClient = await handleClientFor(richButUnderfunded);
    const { value: underfundedValue } = await underfundedClient.decrypt(underfundedAlloc.handleQuantity);
    assert.equal(underfundedValue, 0n, "under-funded bidder must be disqualified despite the highest price");

    const honestAlloc = await auction.allocations(honest.address);
    const honestClient = await handleClientFor(honest);
    const { value: honestValue } = await honestClient.decrypt(honestAlloc.handleQuantity);
    assert.equal(honestValue, 100n, "honest bidder should win their full bid quantity — unaffected by the disqualification");

    const clearingPrice = await auction.clearingPrice();
    assert.equal(clearingPrice, 2n, "clearing price should be the honest bidder's price, not the disqualified one's");
  });
});
