import * as dotenv from "dotenv";

import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-vyper";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomiclabs/hardhat-web3";
import "hardhat-contract-sizer";
import "@openzeppelin/hardhat-upgrades";

dotenv.config();

const config: HardhatUserConfig = {
  vyper: {
    compilers: [
      { version: "0.2.15" },
      { version: "0.2.4" },
      { version: "0.2.7" },
      { version: "0.3.0" },
    ],
  },
  solidity: {
    compilers: [
      {
        version: "0.8.13",
        settings: {
          optimizer: {
            runs: 200,
            enabled: true,
            details: {
              yul: false,
            },
          },
        },
      },
      {
        version: "0.8.2",
        settings: {
          optimizer: {
            runs: 200,
            enabled: true,
            details: {
              yul: false,
            },
          },
        },
      },
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            runs: 200,
            enabled: true,
            details: {
              yul: false,
            },
          },
        },
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            runs: 200,
            enabled: true,
            details: {
              yul: false,
            },
          },
        },
      },
      {
        version: "0.5.5",
        settings: {
          optimizer: {
            runs: 200,
            enabled: true,
            details: {
              yul: false,
            },
          },
        },
      },
    ],
  },
  networks: {
    eth_mainnet: {
      url: "https://eth-mainnet.g.alchemy.com/v2/VA0iJJN6a26rGrc0GT4_qmHvuDu5_vWe",
      chainId: 1,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    bsc_mainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    bsc_testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    matic_testnet: {
      chainId: 80001,
      url: "https://matic-mumbai.chainstacklabs.com",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    scaling_node: {
      chainId: 31337,
      url: "https://johnchain.org",
      accounts:
        //process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        ["0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"],
    },
    local_node: {
      url: "http://127.0.0.1:8545/",
      //accounts:
      //process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      //["0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"],
    },
    hardhat: {
      forking: {
        url: "https://mainnet.infura.io/v3/899c81095bc24dc2b06d43b6c2b65b8a",
        //url: "https://eth-mainnet.g.alchemy.com/v2/VA0iJJN6a26rGrc0GT4_qmHvuDu5_vWe",
        //url: "https://eth-mainnet.nodereal.io/v1/375a16da699343ee9e7cd67d8a5690d8",
        //url: "https://red-lively-flower.quiknode.pro/d9fdbf99be306441445a56cd45479a6e5a277759/",
        //url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      },
      allowUnlimitedContractSize: true,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
  },
};

export default config;
