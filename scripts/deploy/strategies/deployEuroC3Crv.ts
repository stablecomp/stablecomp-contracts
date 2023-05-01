import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
let deployer : SignerWithAddress;

const controllerJson = require('../../../info/deploy_address/scaling_node/controller/sCompControllerContract.json');
const surplusConverterJson = require('../../../info/deploy_address/scaling_node/manageFee/surplusConverterV2.json');
const oracleRouterJson = require('../../../info/deploy_address/scaling_node/oracle/oracleRouter.json');
const timeLockControllerJson = require('../../../info/deploy_address/scaling_node/timelock/sCompTimeLockControllerContract.json');
import {ConfigStrategy, deployScompTask, strategyTask} from "../../01_task/sCompTask";
import {ethers} from "hardhat";

// contract deploy
let sCompVault : Contract;
let sCompStrategy : Contract;

let nameConfig = "euroc3crv"
let config: ConfigStrategy;

async function main(): Promise<void> {
    [deployer] = await ethers.getSigners();
    console.log("Deployer address: ", deployer.address, " with balance: ", ethers.utils.formatEther(await deployer.getBalance()))
    config = await deployScompTask.getConfig(nameConfig)
}

main()
    .then(async () => {
        let controllerAddress = controllerJson.sCompController.address;
        let timeLockControllerAddress = timeLockControllerJson.sCompTimelockController.address;
        let oracleRouterAddress = oracleRouterJson.oracleRouter.address;
        let governance = deployer.address;
        let strategist = surplusConverterJson.surplusConverterV2Contract.address;

        sCompVault = await deployScompTask.deployVault(controllerAddress, config.want, governance, config.feeDeposit);
        sCompStrategy = await deployScompTask.deployStrategy(config.name, governance, strategist, controllerAddress,
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

