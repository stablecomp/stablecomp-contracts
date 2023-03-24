import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
let deployer : SignerWithAddress;

const controllerJson = require('../../../info/deploy_address/scaling_node/controller/sCompControllerContract.json');
const surplusConverterJson = require('../../../info/deploy_address/scaling_node/manageFee/surplusConverterV2.json');
const oracleRouterJson = require('../../../info/deploy_address/scaling_node/oracle/oracleRouter.json');
const timeLockControllerJson = require('../../../info/deploy_address/scaling_node/timelock/sCompTimeLockControllerContract.json');
import {deployScompTask, strategyTask} from "../../01_task/sCompTask";
import {ethers} from "hardhat";

// contract deploy
let sCompVault : Contract;
let sCompStrategy : Contract;

let nameConfig = "frax3crv"
let config: any;

async function main(): Promise<void> {
    [deployer] = await ethers.getSigners();
    console.log("Deployer address: ", deployer.address, " with balance: ", ethers.utils.formatEther(await deployer.getBalance()))
    config = await deployScompTask.getConfig(nameConfig)
}

main()
    .then(async () => {
        sCompVault = await deployScompTask.deployVault(controllerJson.sCompController.address, config.wantAddress, deployer.address, config.feeDeposit);
        sCompStrategy = await deployScompTask.deployStrategy(config.nameStrategy, deployer.address,
            surplusConverterJson.surplusConverterV2Contract.address, controllerJson.sCompController.address, oracleRouterJson.oracleRouter.address,
            config.wantAddress, config.tokenCompoundAddress, config.tokenCompoundPosition, config.pidPool, config.feeGovernance, config.feeStrategist, config.feeWithdraw,
            config.curveSwapAddress, config.nElementPool, timeLockControllerJson.sCompTimelockController.address, config.versionStrategy,
        );

        await strategyTask.setTokenSwapPathConfig(sCompStrategy.address, "crv_frax")
        await strategyTask.setTokenSwapPathConfig(sCompStrategy.address, "cvx_frax")

        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

