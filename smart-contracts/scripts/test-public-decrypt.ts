import dns from "node:dns";
import { network } from "hardhat";
import { createEthersHandleClient } from "@iexec-nox/handle";

// Override DNS lookup for gateway-testnets.noxprotocol.dev
const originalLookup = dns.lookup;
(dns as any).lookup = (hostname: string, options: any, callback: any) => {
  const cb = typeof options === "function" ? options : callback;
  const opts = typeof options === "object" ? options : {};
  if (hostname === "gateway-testnets.noxprotocol.dev") {
    if (opts.all) return cb(null, [{ address: "20.126.43.29", family: 4 }]);
    return cb(null, "20.126.43.29", 4);
  }
  return originalLookup(hostname, options, callback);
};

async function main() {
  const { ethers } = await network.create();
  const [issuer] = await ethers.getSigners();
  const auctionAddr = "0x75779b747342382dC6fB4f85555119DE484b68F5";

  const auction = await ethers.getContractAt("Auction", auctionAddr);
  const status = await auction.status();
  console.log(`Auction Address: ${auctionAddr}`);
  console.log(`Current Status:  ${status} (2 = PendingReveal)`);

  const clearingPriceHandle = await auction.getClearingPriceHandle();
  console.log(`Clearing Price Handle: ${clearingPriceHandle}`);

  const issuerClient = await createEthersHandleClient(issuer);
  console.log("Fetching publicDecrypt proof from Nox Handle Gateway...");

  try {
    const res = await (issuerClient as any).publicDecrypt(clearingPriceHandle);
    console.log(`✅ Success! Value: ${res.value}, Proof Length: ${res.decryptionProof?.length}`);
    
    console.log("Calling completeSettlement on-chain...");
    const tx = await auction.connect(issuer).completeSettlement(res.decryptionProof);
    await tx.wait();
    console.log(`🎉 completeSettlement Tx Mined: ${tx.hash}`);

    const price = await auction.clearingPrice();
    console.log(`🎯 On-chain Clearing Price: ${price}`);
  } catch (err: any) {
    console.error(`❌ Failed:`, err);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
