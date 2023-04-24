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

let nameConfig = "busd3crv"
let config: ConfigStrategy;

async function main(): Promise<void> {
    [deployer] = await ethers.getSigners();
    console.log("Account 1 addresss: ", deployer.address, " with balance: ", ethers.utils.formatEther(await deployer.getBalance()))

    config = await deployScompTask.getConfig(nameConfig)
}

main()
    .then(async () => {
        sCompVault = await deployScompTask.deployVault(controllerJson.sCompController.address, config.want, deployer.address, config.feeDeposit);
        sCompStrategy = await deployScompTask.deployStrategy(config.name, deployer.address,
            surplusConverterJson.surplusConverterV2Contract.address, controllerJson.sCompController.address, oracleRouterJson.oracleRouter.address,
            config.want, config.tokenCompound, config.tokenCompoundPosition, config.pidPool, config.feeGovernance, config.feeStrategist, config.feeWithdraw,
            config.curveSwap, config.nElementPool, timeLockControllerJson.sCompTimelockController.address, config.versionStrategy,
        );

        await strategyTask.setTokenSwapPathConfig(sCompStrategy.address, "crv_busd")
        await strategyTask.setTokenSwapPathConfig(sCompStrategy.address, "cvx_busd")

        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

