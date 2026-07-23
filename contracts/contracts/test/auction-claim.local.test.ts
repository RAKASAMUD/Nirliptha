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

describe("M2 — Auction.claim() + withdrawToSafe() (local, real Nox primitives)", () => {
  it("winner gets cAsset + excess refund, marginal winner gets zero refund, reserve-loser gets full refund, issuer sweeps to Safe", async () => {
    const { ethers } = await nox.connect();
    const [issuer, safe, winnerA, winnerC, loserD] = await ethers.getSigners();

    const QUANTITY = 50n;
    const RESERVE_PRICE = 2n;
    const deadline = await futureDeadline(ethers, 300);

    const { issuerClient, cUSD, cUSDAddr, cAsset, auction, auctionAddr } = await deployAndOpenAuction(
      ethers,
      QUANTITY,
      RESERVE_PRICE,
      deadline,
      safe.address
    );

    // A: wins fully at P=3, deposit=90, owed at clearing(2)=60 -> refund 30 (excess).
    // C: wins fully at P=2 (sets the clearing price itself) -> owed==deposit -> refund 0.
    // D: P=1 < reserve(2) -> excluded entirely -> refund = full deposit (10).
    // A.q(30) + C.q(20) == QUANTITY(50) exactly, so both are full winners, no partial.
    await fundAndSubmitBid(ethers, cUSD, cUSDAddr, auction, auctionAddr, issuer, issuerClient, winnerA, 200n, 30n, 3n, deadline);
    await fundAndSubmitBid(ethers, cUSD, cUSDAddr, auction, auctionAddr, issuer, issuerClient, winnerC, 100n, 20n, 2n, deadline);
    await fundAndSubmitBid(ethers, cUSD, cUSDAddr, auction, auctionAddr, issuer, issuerClient, loserD, 50n, 10n, 1n, deadline);

    await advancePastDeadline(ethers, deadline);
    await finalizeAndSettle(ethers, auction);
    assert.equal(await auction.status(), 3n); // Settled
    assert.equal(await auction.clearingPrice(), 2n);

    // --- claim() before/without a bid must revert ---
    const [, , , , , stranger] = await ethers.getSigners();
    await assert.rejects(auction.connect(stranger).claim(), /(No bid found|execution reverted)/);

    // --- Winner A claims: full cAsset(30) + cUSD refund(30) ---
    await (await auction.connect(winnerA).claim()).wait();
    {
      const client = await handleClientFor(winnerA);
      const { value: cAssetBal } = await client.decrypt(await cAsset.confidentialBalanceOf(winnerA.address));
      assert.equal(cAssetBal, 30n, "winner A should receive their full 30 cAsset allocation");
      const { value: cUsdBal } = await client.decrypt(await cUSD.confidentialBalanceOf(winnerA.address));
      // Started with mint 200, locked 90 as deposit -> 110 remaining, +30 refund = 140.
      assert.equal(cUsdBal, 140n, "winner A should be refunded the 30 excess over the clearing price");
    }

    // --- Double-claim reverts ---
    await assert.rejects(auction.connect(winnerA).claim(), /(Already claimed|execution reverted)/);

    // --- Marginal winner C claims: full cAsset(20), zero refund ---
    await (await auction.connect(winnerC).claim()).wait();
    {
      const client = await handleClientFor(winnerC);
      const { value: cAssetBal } = await client.decrypt(await cAsset.confidentialBalanceOf(winnerC.address));
      assert.equal(cAssetBal, 20n, "winner C should receive their full 20 cAsset allocation");
      const { value: cUsdBal } = await client.decrypt(await cUSD.confidentialBalanceOf(winnerC.address));
      // Started with mint 100, locked 40 as deposit -> 60 remaining, +0 refund = 60.
      assert.equal(cUsdBal, 60n, "winner C bid exactly at the clearing price, so refund should be 0");
    }

    // --- Reserve-loser D claims: zero cAsset, full deposit refunded ---
    await (await auction.connect(loserD).claim()).wait();
    {
      const client = await handleClientFor(loserD);
      const { value: cAssetBal } = await client.decrypt(await cAsset.confidentialBalanceOf(loserD.address));
      assert.equal(cAssetBal, 0n, "reserve-loser D should receive no cAsset");
      const { value: cUsdBal } = await client.decrypt(await cUSD.confidentialBalanceOf(loserD.address));
      // Started with mint 50, locked 10 as deposit -> 40 remaining, +10 full refund = 50 (back to start).
      assert.equal(cUsdBal, 50n, "reserve-loser D should be refunded their full deposit");
    }

    // --- withdrawToSafe: non-issuer reverts ---
    await assert.rejects(auction.connect(winnerA).withdrawToSafe(), /(Not issuer|execution reverted)/);

    // --- withdrawToSafe: issuer sweeps remaining cUSD (= quantity_sold * clearingPrice = 50*2 = 100) ---
    await (await auction.connect(issuer).withdrawToSafe()).wait();
    {
      const safeClient = await handleClientFor(safe);
      const { value: safeBal } = await safeClient.decrypt(await cUSD.confidentialBalanceOf(safe.address));
      assert.equal(safeBal, 100n, "Safe should receive exactly quantity_sold * clearingPrice = 50 * 2 = 100");
    }
  });
});
