import dns from "node:dns";
import { network } from "hardhat";

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
  console.log(`Issuer: ${issuer.address}`);
  console.log(`Auction Issuer: ${await auction.issuer()}`);
  console.log(`Auction Status: ${await auction.status()} (3 = Settled)`);

  const bidder1Addr = process.env.DEMO_INVESTOR_1!;
  const auditorAddr = process.env.DEMO_INVESTOR_5!;

  const allocRec = await auction.allocations(bidder1Addr);
  console.log(`Bidder 1 Allocation Handle: ${allocRec.handleQuantity}`);
  console.log(`Bidder 1 Claimed: ${allocRec.claimed}`);

  try {
    const callRes = await auction.grantAuditView.staticCall(bidder1Addr, auditorAddr, { from: issuer.address });
    console.log("staticCall succeeded!", callRes);
  } catch (err: any) {
    console.error("staticCall failed error:", err);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
