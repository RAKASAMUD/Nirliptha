import { nox } from "@iexec-nox/nox-hardhat-plugin";
import assert from "node:assert/strict";

describe("M2 — Nox local primitive smoke test (via Docker offchain stack)", () => {
  it("Nox.mul() on two encrypted uint256 values returns the correct decrypted product", async () => {
    const { ethers, handleClient } = await nox.connect();
    const [signer] = await ethers.getSigners();

    const Probe = await ethers.getContractFactory("ProbeArith");
    const probe = await Probe.deploy();
    await probe.waitForDeployment();
    const contractAddress = await probe.getAddress();

    const { handle: hA, handleProof: proofA } = await handleClient.encryptInput(5n, "uint256", contractAddress);
    const { handle: hB, handleProof: proofB } = await handleClient.encryptInput(10n, "uint256", contractAddress);

    const tx = await probe.connect(signer).multiply(hA, proofA, hB, proofB);
    await tx.wait();

    const resultHandle = await probe.result();
    assert.notEqual(
      resultHandle,
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      "result handle should be non-zero"
    );

    const { value } = await nox.decrypt(resultHandle);
    assert.equal(value, 50n, "5 * 10 should decrypt to 50");
  });
});
