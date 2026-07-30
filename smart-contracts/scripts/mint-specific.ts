import { network } from 'hardhat';
import { readFileSync } from 'fs';
import { createEthersHandleClient } from '@iexec-nox/handle';

const TARGET_ADDRESS = '0xf7819d970C694931e2424080c5153B8Fa72C3afE';
const CUSD_AMOUNT = 100000000000n; // 100,000 cUSD

async function main() {
  const { ethers } = await network.create();
  const [issuer] = await ethers.getSigners();

  const registry = JSON.parse(readFileSync('deployments/sepolia.json', 'utf8'));
  const cusdAddr = registry.contracts.cUSD;
  
  const cusd = await ethers.getContractAt('CUSD', cusdAddr);
  const handleClient = await createEthersHandleClient(issuer);

  console.log('Minting ' + CUSD_AMOUNT + ' cUSD to ' + TARGET_ADDRESS);
  const { handle, handleProof } = await handleClient.encryptInput(CUSD_AMOUNT, 'uint256', cusdAddr);
  const tx = await cusd.mint(TARGET_ADDRESS, handle, handleProof);
  console.log('Tx sent: ' + tx.hash);
  await tx.wait();
  console.log('Done!');
}
main().catch(console.error);
