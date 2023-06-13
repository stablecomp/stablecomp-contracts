import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {ethers} from "hardhat";
let deployer : SignerWithAddress;

const controllerJson = require('../../../info/deploy_address/eth_mainnet/controller/sCompControllerContract.json');
const surplusConverterJson = require('../../../info/deploy_address/eth_mainnet/manageFee/surplusConverterV2.json');
const oracleRouterJson = require('../../../info/deploy_address/eth_mainnet/oracle/oracleRouter.json');
const timeLockControllerJson = require('../../../info/deploy_address/eth_mainnet/timelock/sCompTimeLockControllerContract.json');
import {ConfigStrategy, deployScompTask, strategyTask} from "../../01_task/sCompTask";

// contract deploy
let sCompVault : Contract;
let sCompStrategy : Contract;

let nameConfig = "usdp3crv"
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

        let balanceBefore = await deployer.getBalance();

        let treasuryFee = deployer.address;
        sCompVault = await deployScompTask.deployVault(controllerJson.sCompController.address, config.want, treasuryFee, config.feeDeposit);

        let governanceStrategy = deployer.address;
        //let strategist = surplusConverterJson.surplusConverterV2Contract.address;
        let strategist = deployer.address

        sCompStrategy = await deployScompTask.deployStrategy(config.name, governanceStrategy, strategist,
            controllerAddress,
            config.want, config.tokenCompound, config.tokenCompoundPosition, config.pidPool, config.feeGovernance, config.feeStrategist, config.feeWithdraw,
            config.curveSwap, config.nElementPool, config.versionStrategy,
        );


        await strategyTask.setConfig(sCompStrategy.address, config,
            controllerAddress, oracleRouterAddress, timeLockControllerAddress)

        let balanceAfter = await deployer.getBalance();
        let diff = balanceBefore.sub(balanceAfter);

        console.log("Cost deploy vault/strategy: " + diff)

        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

