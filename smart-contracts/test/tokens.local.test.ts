import { network } from "hardhat";
import assert from "node:assert/strict";

// Local tests only — tests that DO NOT call Nox primitives (those require live TEE gateway).
// Tests: name/symbol/owner metadata + access control revert.

const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
const DUMMY_PROOF = "0x" + "00".repeat(137); // proof format: 137 bytes

describe("Token Contracts — Local Tests", () => {
  // ===== CUSD =====
  describe("CUSD", () => {
    let cusd: any;
    let owner: any;
    let other: any;

    before(async () => {
      const { ethers } = await network.create();
      const signers = await ethers.getSigners();
      owner = signers[0];
      // On Sepolia with 1 private key, signers[1] is undefined. Create a random signer for 'other'.
      other = signers[1] || ethers.Wallet.createRandom().connect(ethers.provider);
      const CUSD = await ethers.getContractFactory("CUSD");
      cusd = await CUSD.deploy();
      await cusd.waitForDeployment();
    });

    it("deploys with correct name & symbol", async () => {
      assert.equal(await cusd.name(), "Confidential USD");
      assert.equal(await cusd.symbol(), "cUSD");
    });

    it("deployer is owner", async () => {
      assert.equal(await cusd.owner(), owner.address);
    });

    it("mint reverts when called by non-owner", async () => {
      // onlyOwner check fires BEFORE Nox.fromExternal — dummy proof/handle OK here
      await assert.rejects(
        cusd.connect(other).mint(other.address, ZERO_HASH, DUMMY_PROOF),
        /(OwnableUnauthorizedAccount|execution reverted)/
      );
    });
  });

  // ===== CAsset =====
  describe("CAsset", () => {
    let casset: any;
    let owner: any;
    let other: any;

    before(async () => {
      const { ethers } = await network.create();
      const signers = await ethers.getSigners();
      owner = signers[0];
      other = signers[1] || ethers.Wallet.createRandom().connect(ethers.provider);
      const CAsset = await ethers.getContractFactory("CAsset");
      casset = await CAsset.deploy();
      await casset.waitForDeployment();
    });

    it("deploys with correct name & symbol", async () => {
      assert.equal(await casset.name(), "Confidential Asset");
      assert.equal(await casset.symbol(), "cASSET");
    });

    it("deployer is owner", async () => {
      assert.equal(await casset.owner(), owner.address);
    });

    it("mint reverts when called by non-owner", async () => {
      await assert.rejects(
        casset.connect(other).mint(other.address, ZERO_HASH, DUMMY_PROOF),
        /(OwnableUnauthorizedAccount|execution reverted)/
      );
    });
  });
});
