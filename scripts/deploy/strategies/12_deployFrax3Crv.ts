import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
let deployer : SignerWithAddress;

const address = require("../../../info/deploy_address/eth_mainnet/address.json");
import {ConfigStrategy, deployScompTask, strategyTask} from "../../01_task/sCompTask";
import {ethers} from "hardhat";

// contract deploy
let sCompVault : Contract;
let sCompStrategy : Contract;

let nameConfig = "frax3crv"
let config: ConfigStrategy;

async function main(): Promise<void> {
    [deployer] = await ethers.getSigners();
    console.log("Deployer address: ", deployer.address, " with balance: ", ethers.utils.formatEther(await deployer.getBalance()))
    config = await deployScompTask.getConfig(nameConfig)
}

main()
    .then(async () => {
        let controllerAddress: string = address.sCompController
        let timeLockControllerAddress = ethers.constants.AddressZero
        let oracleRouterAddress = address.oracleRouter

        let balanceBeforeVault = await deployer.getBalance();

        let treasuryFee = deployer.address;
        sCompVault = await deployScompTask.deployVault(controllerAddress, config.want, treasuryFee, config.feeDeposit);

        let balanceAfterVault = await deployer.getBalance();
        let diff = balanceBeforeVault.sub(balanceAfterVault);

        console.log("Cost deploy vault: " + ethers.utils.formatEther(diff))

        let governance = deployer.address;
        //let strategist = surplusConverterJson.surplusConverterV2Contract.address;
        let strategist = deployer.address

        let balanceBeforeStrategy = await deployer.getBalance();

        sCompStrategy = await deployScompTask.deployStrategy(
            config.name, governance, strategist, controllerAddress,
            config.want, config.tokenCompound, config.tokenCompoundPosition, config.pidPool,
            config.feeGovernance, config.feeStrategist, config.feeWithdraw,
            config.curveSwap, config.nElementPool, config.versionStrategy,
        );

        await strategyTask.setConfig(sCompStrategy.address, config,
            controllerAddress, oracleRouterAddress, timeLockControllerAddress)

        let balanceAfterStrategy = await deployer.getBalance();
        let diffStrategy = balanceBeforeStrategy.sub(balanceAfterStrategy);

        console.log("Cost deploy strategy: " + ethers.utils.formatEther(diffStrategy))

        let totalCost = diff.add(diffStrategy)
        console.log("Total cost: " + ethers.utils.formatEther(totalCost))

        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

