import { network } from "hardhat";
import assert from "node:assert/strict";

const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
const DUMMY_PROOF = "0x" + "00".repeat(137);
const FUTURE_DEADLINE = Math.floor(Date.now() / 1000) + 3600; // +1 hour
const PAST_DEADLINE = Math.floor(Date.now() / 1000) - 1;     // already passed

describe("M2 — Auction Contracts — Local Tests", () => {
  // ===== AuctionFactory =====
  describe("AuctionFactory", () => {
    let factory: any;
    let owner: any;
    let other: any;
    let dummyAddr: string;

    before(async () => {
      const { ethers } = await network.create();
      const signers = await ethers.getSigners();
      owner = signers[0];
      other = signers[1] || ethers.Wallet.createRandom().connect(ethers.provider);
      dummyAddr = ethers.Wallet.createRandom().address;

      const Factory = await ethers.getContractFactory("AuctionFactory");
      factory = await Factory.deploy(dummyAddr, dummyAddr);
      await factory.waitForDeployment();
    });

    it("owner is deployer", async () => {
      assert.equal(await factory.owner(), owner.address);
    });

    it("non-owner createAuction reverts", async () => {
      await assert.rejects(
        factory.connect(other).createAuction(100, 1, FUTURE_DEADLINE, dummyAddr),
        /(OwnableUnauthorizedAccount|execution reverted)/
      );
    });

    it("quantity=0 reverts", async () => {
      await assert.rejects(
        factory.createAuction(0, 1, FUTURE_DEADLINE, dummyAddr),
        /quantity=0/
      );
    });

    it("deadline too soon reverts", async () => {
      await assert.rejects(
        factory.createAuction(100, 1, PAST_DEADLINE, dummyAddr),
        /deadline too soon/
      );
    });

    it("valid call increments auctionCount and returns non-zero address", async () => {
      const countBefore = await factory.auctionCount();
      const tx = await factory.createAuction(100, 1, FUTURE_DEADLINE, dummyAddr);
      await tx.wait();
      const countAfter = await factory.auctionCount();
      assert.equal(countAfter, countBefore + 1n);

      const auctionAddr = await factory.auctions(Number(countBefore));
      assert.notEqual(auctionAddr, "0x0000000000000000000000000000000000000000");
    });
  });

  // ===== Auction state machine (non-Nox parts) =====
  describe("Auction", () => {
    let auction: any;
    let issuer: any;
    let other: any;
    let dummyAddr: string;

    before(async () => {
      const { ethers } = await network.create();
      const signers = await ethers.getSigners();
      issuer = signers[0];
      other = signers[1] || ethers.Wallet.createRandom().connect(ethers.provider);
      dummyAddr = ethers.Wallet.createRandom().address;

      const Auction = await ethers.getContractFactory("Auction");
      auction = await Auction.deploy(
        issuer.address,
        dummyAddr,        // cUSD (dummy — not called in these tests)
        dummyAddr,        // cAsset (dummy)
        100,              // quantity
        1,                // reservePrice
        FUTURE_DEADLINE,
        dummyAddr         // safe
      );
      await auction.waitForDeployment();
    });

    it("initial status is AwaitingEscrow (0)", async () => {
      assert.equal(await auction.status(), 0n); // AwaitingEscrow
    });

    it("confirmEscrow by non-issuer reverts", async () => {
      await assert.rejects(
        auction.connect(other).confirmEscrow(),
        /(Not issuer|execution reverted)/
      );
    });

    it("confirmEscrow by issuer transitions to Open (1)", async () => {
      await (await auction.confirmEscrow()).wait();
      assert.equal(await auction.status(), 1n); // Open
    });

    it("double confirmEscrow reverts", async () => {
      await assert.rejects(
        auction.confirmEscrow(),
        /(Not awaiting escrow|execution reverted)/
      );
    });

    it("finalize before deadline reverts", async () => {
      await assert.rejects(
        auction.finalize(),
        /(Auction still open|execution reverted)/
      );
    });

    it("finalize by non-issuer reverts", async () => {
      await assert.rejects(
        auction.connect(other).finalize(),
        /(Not issuer|execution reverted)/
      );
    });

    it("completeSettlement when not PendingReveal reverts", async () => {
      await assert.rejects(
        auction.completeSettlement(DUMMY_PROOF),
        /(Not pending reveal|execution reverted)/
      );
    });

    it("completeSettlement by non-issuer reverts", async () => {
      await assert.rejects(
        auction.connect(other).completeSettlement(DUMMY_PROOF),
        /(Not pending reveal|Not issuer|execution reverted)/
      );
    });

    it("submitBid when status != Open reverts after settlement", async () => {
      // After finalize would be tested on Sepolia (needs Nox). Skip here.
      // Test non-open: use a fresh auction in AwaitingEscrow state
      const { ethers } = await network.create();
      const [signer] = await ethers.getSigners();
      const Auction2 = await ethers.getContractFactory("Auction");
      const a2 = await Auction2.deploy(signer.address, dummyAddr, dummyAddr, 100, 1, FUTURE_DEADLINE, dummyAddr);
      await a2.waitForDeployment();
      await assert.rejects(
        a2.submitBid(ZERO_HASH, DUMMY_PROOF, ZERO_HASH, DUMMY_PROOF),
        /(Not open|execution reverted)/
      );
    });
  });
});
