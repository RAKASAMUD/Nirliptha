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

describe("M3 — Auction.grantAuditView() + rotateHandles() (local, real Nox primitives)", () => {
  let ethers: any;
  let issuer: any, bidder1: any, stranger: any, auditor1: any, auditor2: any;
  let auction: any;
  let capturedOldHandle: string;

  before(async () => {
    ({ ethers } = await nox.connect());
    [issuer, bidder1, stranger, auditor1, auditor2] = await ethers.getSigners();

    const QUANTITY = 100n;
    const RESERVE_PRICE = 1n;
    const deadline = await futureDeadline(ethers, 300);

    const fixture = await deployAndOpenAuction(ethers, QUANTITY, RESERVE_PRICE, deadline);
    auction = fixture.auction;

    await fundAndSubmitBid(
      ethers, fixture.cUSD, fixture.cUSDAddr, fixture.auction, fixture.auctionAddr,
      fixture.issuer, fixture.issuerClient, bidder1, 1_000n, 100n, 5n, deadline
    );

    await advancePastDeadline(ethers, deadline);
    await finalizeAndSettle(ethers, auction);
    assert.equal(await auction.status(), 3n); // Settled — bidder1 wins the full 100 (sole bidder)
  });

  it("Test 1: grantAuditView lets the auditor decrypt; a random wallet still can't", async () => {
    await (await auction.connect(issuer).grantAuditView(bidder1.address, auditor1.address)).wait();

    const record = await auction.allocations(bidder1.address);
    capturedOldHandle = record.handleQuantity;

    const auditorClient = await handleClientFor(auditor1);
    const { value } = await auditorClient.decrypt(record.handleQuantity);
    assert.equal(value, 100n, "auditor should see bidder1's true allocation (100)");

    const strangerClient = await handleClientFor(stranger);
    await assert.rejects(strangerClient.decrypt(record.handleQuantity), "stranger must NOT be able to decrypt");
  });

  it("Test 2: rotateHandles gives a fresh handle; old auditor is blind to it, bidder keeps access", async () => {
    await (await auction.connect(issuer).rotateHandles()).wait();

    const record = await auction.allocations(bidder1.address);
    assert.notEqual(record.handleQuantity, capturedOldHandle, "handle must change after rotation");

    const auditor1Client = await handleClientFor(auditor1);
    await assert.rejects(auditor1Client.decrypt(record.handleQuantity), "old auditor must be blind to the NEW handle");

    // The OLD handle still exists on-chain (just unreferenced) and auditor1's earlier grant on it
    // still stands — rotation doesn't retroactively revoke past grants on the handle it replaces.
    const { value: oldValue } = await auditor1Client.decrypt(capturedOldHandle);
    assert.equal(oldValue, 100n, "old handle should still be decryptable by the previously-granted auditor");

    const bidderClient = await handleClientFor(bidder1);
    const { value: newValue } = await bidderClient.decrypt(record.handleQuantity);
    assert.equal(newValue, 100n, "bidder should still be able to decrypt their own NEW handle after rotation");
  });

  it("Test 3: grantAuditView after rotation — new auditor sees, old auditor stays blind", async () => {
    await (await auction.connect(issuer).grantAuditView(bidder1.address, auditor2.address)).wait();

    const record = await auction.allocations(bidder1.address);
    const auditor2Client = await handleClientFor(auditor2);
    const { value } = await auditor2Client.decrypt(record.handleQuantity);
    assert.equal(value, 100n);

    const auditor1Client = await handleClientFor(auditor1);
    await assert.rejects(auditor1Client.decrypt(record.handleQuantity), "auditor1 must remain blind to the current handle");
  });

  it("Test 4: access control — non-issuer reverts on both functions", async () => {
    await assert.rejects(
      auction.connect(stranger).grantAuditView(bidder1.address, auditor1.address),
      /(Not issuer|execution reverted)/
    );
    await assert.rejects(
      auction.connect(stranger).rotateHandles(),
      /(Not issuer|execution reverted)/
    );
  });

  it("Test 5: double rotate — first auditor blind to the second rotation's handle too", async () => {
    const before = await auction.allocations(bidder1.address);
    await (await auction.connect(issuer).rotateHandles()).wait();
    const after = await auction.allocations(bidder1.address);
    assert.notEqual(after.handleQuantity, before.handleQuantity);

    // auditor2 was granted before this (second) rotation -> must be blind to the newest handle.
    const auditor2Client = await handleClientFor(auditor2);
    await assert.rejects(auditor2Client.decrypt(after.handleQuantity));

    const bidderClient = await handleClientFor(bidder1);
    const { value } = await bidderClient.decrypt(after.handleQuantity);
    assert.equal(value, 100n, "bidder should still read the correct value after a second rotation");
  });

  it("grantAuditView before Settled reverts", async () => {
    const { ethers: ethers2 } = await nox.connect();
    const deadline = await futureDeadline(ethers2, 300);
    const { auction: openAuction } = await deployAndOpenAuction(ethers2, 100n, 1n, deadline);
    assert.equal(await openAuction.status(), 1n); // Open, not Settled

    await assert.rejects(
      openAuction.connect(issuer).grantAuditView(bidder1.address, auditor1.address),
      /(Not settled|execution reverted)/
    );
  });
});
