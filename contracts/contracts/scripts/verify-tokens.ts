import { network } from "hardhat";
import { readFileSync } from "fs";
import { createEthersHandleClient } from "@iexec-nox/handle";

async function main() {
  const { ethers } = await network.create();
  const [issuer] = await ethers.getSigners();

  const registry = JSON.parse(readFileSync("deployments/sepolia.json", "utf8"));
  const cusdAddr = registry.contracts.cUSD;
  const cassetAddr = registry.contracts.cAsset;

  const cusd = await ethers.getContractAt("CUSD", cusdAddr);
  const casset = await ethers.getContractAt("CAsset", cassetAddr);
  const provider = ethers.provider;

  const results: { check: string; status: string; detail: string }[] = [];

  // 1. Contracts deployed (have bytecode)
  const cusdCode = await provider.getCode(cusdAddr);
  const cassetCode = await provider.getCode(cassetAddr);
  results.push({
    check: "Contracts deployed",
    status: cusdCode !== "0x" && cassetCode !== "0x" ? "PASS" : "FAIL",
    detail: `cUSD code: ${cusdCode.length} bytes | cAsset code: ${cassetCode.length} bytes`,
  });

  // 2. Metadata correct
  const cusdName = await cusd.name();
  const cusdSymbol = await cusd.symbol();
  const cassetName = await casset.name();
  const cassetSymbol = await casset.symbol();
  const metaOk =
    cusdName === "Confidential USD" &&
    cusdSymbol === "cUSD" &&
    cassetName === "Confidential Asset" &&
    cassetSymbol === "cASSET";
  results.push({
    check: "Metadata correct",
    status: metaOk ? "PASS" : "FAIL",
    detail: `cUSD: "${cusdName}" / "${cusdSymbol}" | cAsset: "${cassetName}" / "${cassetSymbol}"`,
  });

  // 3. Balance is handle (not plaintext)
  const investor1 = process.env.DEMO_INVESTOR_1 || issuer.address;
  const balHandle = await cusd.confidentialBalanceOf(investor1);
  const EXPECTED_PLAINTEXT = "0x0000000000000000000000000000000000000000000002540be400"; // 10000 * 1e6
  const isHandle = balHandle !== "0x0000000000000000000000000000000000000000000000000000000000000000"
    && !balHandle.startsWith(EXPECTED_PLAINTEXT);
  results.push({
    check: "Balance stored as handle",
    status: isHandle ? "PASS" : "FAIL",
    detail: `confidentialBalanceOf(${investor1}) = ${balHandle}`,
  });

  // 4. Holder can decrypt balance
  let decryptResult = "SKIP (holder must run with their own private key)";
  let decryptStatus = "SKIP";
  try {
    const handleClient = await createEthersHandleClient(issuer);
    const { value: decrypted } = await handleClient.decrypt(balHandle);
    // If we fell back to issuer for all 3 mints, balance will be 30,000 instead of 10,000
    const expected = (investor1 === issuer.address && !process.env.DEMO_INVESTOR_1) ? 30_000n : 10_000n;
    decryptResult = `Decrypted: ${decrypted} (expected ${expected})`;
    decryptStatus = decrypted === expected ? "PASS" : "FAIL";
  } catch (e: any) {
    decryptResult = `${e.message}`;
    decryptStatus = "FAIL";
  }
  results.push({ check: "Holder can decrypt balance", status: decryptStatus, detail: decryptResult });

  // 5. Confidential transfer
  const investor2 = process.env.DEMO_INVESTOR_2 || issuer.address;
  let transferStatus = "SKIP";
  let transferDetail = "Skipped — requires investor1 signer";
  if (process.env.DEMO_INVESTOR_1 && process.env.DEMO_INVESTOR_1 !== issuer.address) {
    transferDetail = "investor1 is not the issuer signer — run with investor1 key to test transfer";
  } else {
    // issuer mints to themselves — can test transfer
    try {
      const txTransfer = await cusd.confidentialTransfer(investor2, await cusd.confidentialBalanceOf(investor1));
      await txTransfer.wait();
      transferStatus = "PASS";
      transferDetail = `Transfer from issuer → ${investor2}: tx ${txTransfer.hash}`;
    } catch (e: any) {
      transferStatus = "FAIL";
      transferDetail = e.message;
    }
  }
  results.push({ check: "Confidential transfer works", status: transferStatus, detail: transferDetail });

  // Print report
  console.log("\n=== M1 Verification Report ===");
  let allPass = true;
  for (const r of results) {
    const icon = r.status === "PASS" ? "✅" : r.status === "SKIP" ? "⏭️" : "❌";
    console.log(`${icon} [${r.status}] ${r.check}`);
    console.log(`       ${r.detail}`);
    if (r.status === "FAIL") allPass = false;
  }

  console.log(`\n${allPass ? "🎉 ALL PASS — Gate M2 OPEN" : "❌ FAILURES DETECTED — Fix before M2"}`);
  if (!allPass) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
