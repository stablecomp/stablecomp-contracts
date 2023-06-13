import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
let deployer : SignerWithAddress;

const controllerJson = require('../../../info/deploy_address/eth_mainnet/controller/sCompControllerContract.json');
//const surplusConverterJson = require('../../../info/deploy_address/eth_mainnet/manageFee/surplusConverterV2.json');
const oracleRouterJson = require('../../../info/deploy_address/eth_mainnet/oracle/oracleRouter.json');
//const timeLockControllerJson = require('../../../info/deploy_address/eth_mainnet/timelock/sCompTimeLockControllerContract.json');
import {ConfigStrategy, deployScompTask, strategyTask} from "../../01_task/sCompTask";
import {ethers} from "hardhat";

// contract deploy
let sCompVault : Contract;
let sCompStrategy : Contract;

let nameConfig = "usdd3crv"
let config: ConfigStrategy;

async function main(): Promise<void> {
    [deployer] = await ethers.getSigners();
    console.log("Deployer address: ", deployer.address, " with balance: ", ethers.utils.formatEther(await deployer.getBalance()))
    config = await deployScompTask.getConfig(nameConfig)
}

main()
    .then(async () => {
        let controllerAddress = controllerJson.sCompController.address;
        let timeLockControllerAddress = ethers.constants.AddressZero
        let oracleRouterAddress = oracleRouterJson.oracleRouter.address;

        let treasuryFee = deployer.address;
        sCompVault = await deployScompTask.deployVault(controllerJson.sCompController.address, config.want, treasuryFee, config.feeDeposit);

        let governance = deployer.address;
        //let strategist = surplusConverterJson.surplusConverterV2Contract.address;
        let strategist = deployer.address

        sCompStrategy = await deployScompTask.deployStrategy(config.name, governance, strategist,
            controllerAddress,
            config.want, config.tokenCompound, config.tokenCompoundPosition, config.pidPool, config.feeGovernance, config.feeStrategist, config.feeWithdraw,
            config.curveSwap, config.nElementPool, config.versionStrategy,
        );
        await strategyTask.setConfig(sCompStrategy.address, config,
            controllerAddress, oracleRouterAddress, timeLockControllerAddress)

        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

