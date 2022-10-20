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
    compilers: [{ version: "0.2.15" },{ version: "0.2.4" }, { version: "0.3.0" }],
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
              yul: false
            }
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
              yul: false
            }
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
              yul: false
            }
          },
        },
      },{
        version: "0.5.5",
        settings: {
          optimizer: {
            runs: 200,
            enabled: true,
            details: {
              yul: false
            }
          },
        },
      },
    ],
  },
  networks: {
    mainnet_eth: {
      url: "https://eth-mainnet.nodereal.io/v1/1659dfb40aa24bbb8153a677b98064d7",
      chainId: 1,
      accounts:
          process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    mainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      accounts:
          process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts:
          process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    matic_testnet: {
      chainId: 80001,
      url: "https://matic-mumbai.chainstacklabs.com",
      gasPrice: 30000000000,
      accounts:
          process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    hardhat: {
      forking: {
        //url: "https://mainnet.infura.io/v3/899c81095bc24dc2b06d43b6c2b65b8a",
        //url: "https://dawn-wild-log.discover.quiknode.pro/96a79c024bd930b3378f737417132b40654dd322/",
        url: "https://eth-mainnet.nodereal.io/v1/375a16da699343ee9e7cd67d8a5690d8",
      },
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
