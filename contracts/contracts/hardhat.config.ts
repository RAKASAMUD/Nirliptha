import { HardhatUserConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatMocha from "@nomicfoundation/hardhat-mocha";
import noxPlugin from "@iexec-nox/nox-hardhat-plugin";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  plugins: [hardhatEthers, hardhatMocha, noxPlugin],
  solidity: {
    version: "0.8.35", // Adjust according to Nox docs, usually 0.8.20+ is standard
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true, // Auction.finalize() has too many locals for the legacy pipeline (stack too deep)
    },
  },
  networks: {
    sepolia: {
      type: "http",
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

export default config;
