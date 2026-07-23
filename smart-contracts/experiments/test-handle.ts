import { network } from "hardhat";
import { createEthersHandleClient } from "@iexec-nox/handle";

async function main() {
  const { ethers } = await network.create();
  const [signer] = await ethers.getSigners();
  
  console.log("Initialize Handle Client...");
  
  let handleClient;
  try {
    handleClient = await createEthersHandleClient(signer);
  } catch (error: any) {
    console.log("Failed without config, trying to find default if any...", error.message);
    throw error;
  }
  
  const contractAddress = "0x8c53fa7828026639742A47cc23a26Bb2e1Af5de0";
  const HelloNox = await ethers.getContractAt("HelloNox", contractAddress);
  
  console.log("Encrypting value 42...");
  const { handle, handleProof } = await handleClient.encryptInput(
    42n,
    "uint256",
    contractAddress
  );
  
  console.log(`Handle created: ${handle}`);
  
  console.log("Calling setValue on HelloNox contract...");
  const tx = await HelloNox.setValue(handle, handleProof);
  console.log(`Tx hash: ${tx.hash}`);
  
  await tx.wait();
  console.log("Value stored successfully!");
  
  console.log("Fetching value from contract...");
  const storedHandle = await HelloNox.encryptedValue();
  console.log(`Stored Handle: ${storedHandle}`);
  
  if (storedHandle === handle) {
    console.log("MATCH! Toolchain OK.");
  } else {
    console.log("MISMATCH!");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
