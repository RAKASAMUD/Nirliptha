import { nox, NOX_COMPUTE_ADDRESS, handleGatewayUrl } from "@iexec-nox/nox-hardhat-plugin";
import { createEthersHandleClient } from "@iexec-nox/handle";

// `@iexec-nox/handle` types addresses as the branded `0x${string}` (viem-style);
// ethers' `getAddress()` returns a plain `string` with the same runtime shape.
export const hex = (address: string) => address as `0x${string}`;

export async function handleClientFor(signer: any) {
  return createEthersHandleClient(signer, {
    smartContractAddress: NOX_COMPUTE_ADDRESS,
    gatewayUrl: handleGatewayUrl(),
    subgraphUrl: "https://example.com/subgraphs/id/none",
  });
}

// The local Docker-backed chain persists across `it()` blocks in the same run, and
// evm_setNextBlockTimestamp permanently advances its clock. A deadline computed from
// wall-clock Date.now() can end up already in the past relative to chain time once an
// earlier test has fast-forwarded it — so always derive deadlines from the chain itself.
export async function futureDeadline(ethers: any, offsetSeconds: number): Promise<number> {
  const latest = await ethers.provider.getBlock("latest");
  return Number(latest.timestamp) + offsetSeconds;
}

export async function advancePastDeadline(ethers: any, deadline: number) {
  await ethers.provider.send("evm_setNextBlockTimestamp", [deadline + 5]);
  await ethers.provider.send("evm_mine", []);
}

export async function deployAuctionFixture(ethers: any, quantity: bigint, reservePrice: bigint, deadline: number) {
  const [issuer] = await ethers.getSigners();
  const issuerClient = await handleClientFor(issuer);

  const CUSD = await ethers.getContractFactory("CUSD");
  const cUSD: any = await CUSD.connect(issuer).deploy();
  await cUSD.waitForDeployment();
  const cUSDAddr = hex(await cUSD.getAddress());

  const CAsset = await ethers.getContractFactory("CAsset");
  const cAsset: any = await CAsset.connect(issuer).deploy();
  await cAsset.waitForDeployment();
  const cAssetAddr = hex(await cAsset.getAddress());

  {
    const { handle, handleProof } = await issuerClient.encryptInput(quantity, "uint256", cAssetAddr);
    await (await cAsset.connect(issuer).mint(issuer.address, handle, handleProof)).wait();
  }

  return { issuer, issuerClient, cUSD, cUSDAddr, cAsset, cAssetAddr, quantity, reservePrice, deadline };
}

export async function deployAndOpenAuction(
  ethers: any,
  quantity: bigint,
  reservePrice: bigint,
  deadline: number,
  safeAddress?: string
) {
  const fixture = await deployAuctionFixture(ethers, quantity, reservePrice, deadline);
  const { issuer, issuerClient, cUSD, cUSDAddr, cAsset, cAssetAddr } = fixture;

  const Auction = await ethers.getContractFactory("Auction");
  const auction: any = await Auction.connect(issuer).deploy(
    issuer.address,
    cUSDAddr,
    cAssetAddr,
    quantity,
    reservePrice,
    deadline,
    safeAddress ?? issuer.address
  );
  await auction.waitForDeployment();
  const auctionAddr = hex(await auction.getAddress());

  {
    const { handle, handleProof } = await issuerClient.encryptInput(quantity, "uint256", cAssetAddr);
    await (
      await cAsset.connect(issuer)["confidentialTransfer(address,bytes32,bytes)"](auctionAddr, handle, handleProof)
    ).wait();
  }
  await (await auction.connect(issuer).confirmEscrow()).wait();

  return { ...fixture, auction, auctionAddr };
}

/// Deploys AuctionFactory + tokens and creates+opens an Auction instance through the Factory —
/// the real production path (vs. deployAndOpenAuction's direct `new Auction(...)`, used by the
/// unit-level submitBid/finalize/claim tests).
export async function deployAndOpenAuctionViaFactory(
  ethers: any,
  quantity: bigint,
  reservePrice: bigint,
  deadline: number,
  safeAddress?: string
) {
  const fixture = await deployAuctionFixture(ethers, quantity, reservePrice, deadline);
  const { issuer, issuerClient, cUSD, cUSDAddr, cAsset, cAssetAddr } = fixture;
  const safe = safeAddress ?? issuer.address;

  const Factory = await ethers.getContractFactory("AuctionFactory");
  const factory: any = await Factory.connect(issuer).deploy(cUSDAddr, cAssetAddr);
  await factory.waitForDeployment();
  const factoryAddr = hex(await factory.getAddress());

  const createTx = await factory.connect(issuer).createAuction(quantity, reservePrice, deadline, safe);
  await createTx.wait();
  const auctionCount = await factory.auctionCount();
  const auctionAddr = hex(await factory.auctions(auctionCount - 1n));
  const auction: any = await ethers.getContractAt("Auction", auctionAddr);

  {
    const { handle, handleProof } = await issuerClient.encryptInput(quantity, "uint256", cAssetAddr);
    await (
      await cAsset.connect(issuer)["confidentialTransfer(address,bytes32,bytes)"](auctionAddr, handle, handleProof)
    ).wait();
  }
  await (await auction.connect(issuer).confirmEscrow()).wait();

  return { ...fixture, factory, factoryAddr, auction, auctionAddr };
}

export async function fundAndSubmitBid(
  ethers: any,
  cUSD: any,
  cUSDAddr: `0x${string}`,
  auction: any,
  auctionAddr: `0x${string}`,
  issuer: any,
  issuerClient: any,
  bidder: any,
  mintAmount: bigint,
  q: bigint,
  p: bigint,
  deadline: number
) {
  const bidderClient = await handleClientFor(bidder);

  const { handle: hMint, handleProof: pMint } = await issuerClient.encryptInput(mintAmount, "uint256", cUSDAddr);
  await (await cUSD.connect(issuer).mint(bidder.address, hMint, pMint)).wait();

  await (await cUSD.connect(bidder).setOperator(auctionAddr, deadline)).wait();

  const { handle: hQ, handleProof: pQ } = await bidderClient.encryptInput(q, "uint256", auctionAddr);
  const { handle: hP, handleProof: pP } = await bidderClient.encryptInput(p, "uint256", auctionAddr);
  await (await auction.connect(bidder).submitBid(hQ, pQ, hP, pP)).wait();

  return bidderClient;
}

export async function finalizeAndSettle(ethers: any, auction: any) {
  const finalizeTx = await auction.finalize();
  const finalizeReceipt = await finalizeTx.wait();

  const clearingPriceHandle = await auction.getClearingPriceHandle();
  const { decryptionProof } = await nox.publicDecrypt(clearingPriceHandle);

  const settleTx = await auction.completeSettlement(decryptionProof);
  await settleTx.wait();

  return { finalizeGasUsed: finalizeReceipt!.gasUsed as bigint };
}
