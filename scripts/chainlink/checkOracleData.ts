import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { ethers } = hardhat;

const oracleABI = require('../../info/abi/oracleABI.json')

const oracleInfo = require('../../info/address_mainnet/oracleAddress.json');

let deployer : SignerWithAddress;

// contract
let oracleCrvUsd : Contract
let oracleCvxUsd : Contract
let oracleBusdUsd : Contract
let oracleDaiUsd : Contract
let oracleFraxUsd : Contract
let oracleMimUsd : Contract
let oracleTetherEurUsd : Contract
let oracleTetherUsdUsd : Contract
let oracleTusdUsd : Contract
let oracleUsdcUsd : Contract
let oracleBtcUsd : Contract
let oracleEthUsd : Contract

async function main(): Promise<void> {
  [deployer] = await ethers.getSigners();

  oracleCrvUsd = await new ethers.Contract(oracleInfo.crv_usd.address, oracleABI, ethers.provider);
  oracleCvxUsd = await new ethers.Contract(oracleInfo.cvx_usd.address, oracleABI, ethers.provider);
  oracleBusdUsd = await new ethers.Contract(oracleInfo.busd_usd.address, oracleABI, ethers.provider);
  oracleDaiUsd = await new ethers.Contract(oracleInfo.dai_usd.address, oracleABI, ethers.provider);
  oracleFraxUsd = await new ethers.Contract(oracleInfo.frax_usd.address, oracleABI, ethers.provider);
  oracleMimUsd = await new ethers.Contract(oracleInfo.mim_usd.address, oracleABI, ethers.provider);
  oracleTetherEurUsd = await new ethers.Contract(oracleInfo.tetherEur_usd.address, oracleABI, ethers.provider);
  oracleTetherUsdUsd = await new ethers.Contract(oracleInfo.tetherUsd_usd.address, oracleABI, ethers.provider);
  oracleTusdUsd = await new ethers.Contract(oracleInfo.tusd_usd.address, oracleABI, ethers.provider);
  oracleUsdcUsd = await new ethers.Contract(oracleInfo.usdc_usd.address, oracleABI, ethers.provider);
  oracleBtcUsd = await new ethers.Contract(oracleInfo.btc_usd.address, oracleABI, ethers.provider);
  oracleEthUsd = await new ethers.Contract(oracleInfo.eth_usd.address, oracleABI, ethers.provider);

}
async function checkOracleData(contract: Contract, initialTimestamp: any): Promise<void> {

    let info = await contract.latestRoundData();
    console.log("Round Id: ", + info.roundId);
    console.log("Answered in round : ", + info.answeredInRound);
    console.log("Started at: ", + info.startedAt);
    console.log("Updated at: ", + info.updatedAt);
    console.log("Price: ", + info.answer);
    console.log("Diff timestamp: ", initialTimestamp - info.startedAt)


}

  main()
    .then(async () => {
        console.log("Deployer address: ",  deployer.address)
        let initialBalance:any = await deployer.getBalance();
        console.log("Initial balance: ", initialBalance)

        let actualBlock = await ethers.provider.getBlockNumber();
        let block = await ethers.provider.getBlock(actualBlock);
        let initialTimestamp = block.timestamp;
        console.log("Actual block blockchain is: ", actualBlock, " with timestamp: ", block.timestamp);

        console.log(" --- CRV USD --- ")
        await checkOracleData(oracleCrvUsd, initialTimestamp);
        console.log(" --- CVX USD --- ")
        await checkOracleData(oracleCvxUsd, initialTimestamp);
        console.log(" --- BUSD USD --- ")
        await checkOracleData(oracleBusdUsd, initialTimestamp);
        console.log(" --- DAI USD --- ")
        await checkOracleData(oracleDaiUsd, initialTimestamp);
        console.log(" --- FRAX USD --- ")
        await checkOracleData(oracleFraxUsd, initialTimestamp);
        console.log(" --- MIM USD --- ")
        await checkOracleData(oracleMimUsd, initialTimestamp);
        console.log(" --- TETHER EUR USD --- ")
        await checkOracleData(oracleTetherEurUsd, initialTimestamp);
        console.log(" --- TETHER USD USD --- ")
        await checkOracleData(oracleTetherUsdUsd, initialTimestamp);
        console.log(" --- TUSD USD --- ")
        await checkOracleData(oracleTusdUsd, initialTimestamp);
        console.log(" --- USDC USD --- ")
        await checkOracleData(oracleUsdcUsd, initialTimestamp);
        console.log(" --- WBTC USD --- ")
        await checkOracleData(oracleBtcUsd, initialTimestamp);
        console.log(" --- WETH USD --- ")
        await checkOracleData(oracleEthUsd, initialTimestamp);

        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

