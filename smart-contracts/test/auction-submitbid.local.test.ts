import { nox } from "@iexec-nox/nox-hardhat-plugin";
import assert from "node:assert/strict";
import { deployAndOpenAuction, fundAndSubmitBid, futureDeadline } from "./helpers/auction-fixtures.js";

// Bid economics for this test: Q=100, P=2 -> intended deposit = 200.
const BID_Q = 100n;
const BID_P = 2n;
const INTENDED_DEPOSIT = BID_Q * BID_P; // 200
const FUNDED_MINT = 500n; // comfortably covers the 200 deposit
const UNDERFUNDED_MINT = 50n; // balance IS initialized, but < 200 -> safeSub fails silently

const QUANTITY = 1_000n; // cAsset escrowed for the auction
const RESERVE_PRICE = 1n; // irrelevant to submitBid, only used by finalize()

describe("M2 — Auction.submitBid (local, real Nox primitives)", () => {
  it("funded bidder locks the full Q×P deposit; under-funded bidder is NOT reverted but actualDeposit=0", async () => {
    const { ethers } = await nox.connect();
    const [issuer, bidderFunded, bidderUnderfunded] = await ethers.getSigners();

    const deadline = await futureDeadline(ethers, 3600);
    const { issuerClient, cUSD, cUSDAddr, auction, auctionAddr } = await deployAndOpenAuction(
      ethers,
      QUANTITY,
      RESERVE_PRICE,
      deadline
    );
    assert.equal(await auction.status(), 1n); // Open

    const fundedClient = await fundAndSubmitBid(
      ethers, cUSD, cUSDAddr, auction, auctionAddr, issuer, issuerClient,
      bidderFunded, FUNDED_MINT, BID_Q, BID_P, deadline
    );

    // Under-funded bidder submits a bid — MUST NOT REVERT (KOREKSI 2). If confidentialTransferFrom
    // reverted on insufficient balance (the old, wrong assumption), this call would throw.
    const underfundedClient = await fundAndSubmitBid(
      ethers, cUSD, cUSDAddr, auction, auctionAddr, issuer, issuerClient,
      bidderUnderfunded, UNDERFUNDED_MINT, BID_Q, BID_P, deadline
    );

    const fundedBidIndex = await auction.bidderIndex(bidderFunded.address);
    const underfundedBidIndex = await auction.bidderIndex(bidderUnderfunded.address);
    assert.equal(fundedBidIndex, 1n); // 1-indexed, first bidder
    assert.equal(underfundedBidIndex, 2n); // 1-indexed, second bidder

    // --- Decrypt handleActualDeposit for both bids as the respective bidder ---
    const fundedBid = await auction.bids(0);
    const underfundedBid = await auction.bids(1);

    const { value: fundedActualDeposit } = await fundedClient.decrypt(fundedBid.handleActualDeposit);
    assert.equal(fundedActualDeposit, INTENDED_DEPOSIT, "funded bidder should have the full 200 locked");

    const { value: underfundedActualDeposit } = await underfundedClient.decrypt(underfundedBid.handleActualDeposit);
    assert.equal(underfundedActualDeposit, 0n, "under-funded bidder's actual deposit must be 0, not reverted");

    // --- Under-funded bidder's cUSD balance must be UNCHANGED (safeSub left it intact) ---
    const remainingBalanceHandle = await cUSD.confidentialBalanceOf(bidderUnderfunded.address);
    const { value: remainingBalance } = await underfundedClient.decrypt(remainingBalanceHandle);
    assert.equal(remainingBalance, UNDERFUNDED_MINT, "under-funded bidder's balance must stay at 50 (no partial deduction)");
  });
});
