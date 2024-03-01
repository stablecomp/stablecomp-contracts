import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const { ethers } = hardhat;
import {ConfigStrategy, deployScompTask, strategyTask, vaultTask} from "../../01_task/sCompTask";
import {utilsTask} from "../../01_task/standard/utilsTask";
import {taskPoolCurve} from "../../01_task/curve/curveTask";
import {erc20Task} from "../../01_task/standard/erc20Task";

let tokenInfo = require('../../../info/address_mainnet/tokenInfo.json')

async function setupContractBase(config: ConfigStrategy): Promise<any> {

    const [deployer] = await ethers.getSigners();

    let sCompToken = await deployScompTask.deploySCompToken();

    let ve = await deployScompTask.deployVe(sCompToken.address);

    let feeDistribution = await deployScompTask.deployFeeDistribution(sCompToken.address, ve.address, deployer.address, deployer.address);

    let surplusConverter = await deployScompTask.deploySurplusConverter(feeDistribution.address, tokenInfo.weth.address, deployer.address, deployer.address, [deployer.address, deployer.address])

    let controller = await deployScompTask.deployController(deployer.address, deployer.address, deployer.address);

    let timelockController = await deployScompTask.deployTimeLockController([deployer.address], [deployer.address]);

    let oracleRouter = await deployScompTask.deployOracleRouter();

    let vault = await deployScompTask.deployVault(controller.address, config.want, deployer.address, config.feeDeposit);

    let strategy = await deployScompTask.deployStrategy(
        config.name, deployer.address, surplusConverter.address, controller.address,
        config.want, config.tokenCompound, config.tokenCompoundPosition, config.pidPool, config.feeGovernance, config.feeStrategist, config.feeWithdraw,
        config.curveSwap, config.nElementPool, config.versionStrategy
    );

    await strategyTask.setConfig(strategy.address, config, controller.address, oracleRouter.address, timelockController.address);

    return {sCompToken, ve, feeDistribution, surplusConverter, controller, timelockController, oracleRouter, vault, strategy}
}

async function setupContractPartial(): Promise<any> {

    const [deployer] = await ethers.getSigners();

    let sCompToken = await deployScompTask.deploySCompToken();

    let ve = await deployScompTask.deployVe(sCompToken.address);

    let feeDistribution = await deployScompTask.deployFeeDistribution(sCompToken.address, ve.address, deployer.address, deployer.address);

    let surplusConverterV2 = await deployScompTask.deploySurplusConverter(feeDistribution.address, tokenInfo.weth.address, deployer.address, deployer.address, [deployer.address, deployer.address])

    let controller = await deployScompTask.deployController(deployer.address, deployer.address, deployer.address);

    let timelockController = await deployScompTask.deployTimeLockController([deployer.address], [deployer.address]);

    return {sCompToken, ve, feeDistribution, surplusConverterV2, controller, timelockController}
}

async function impersonateAccount(config: ConfigStrategy): Promise<any> {

    let acc1 = await utilsTask.impersonateAccountLocalNode(config.account1);
    let acc2 = await utilsTask.impersonateAccountLocalNode(config.account2);
    let acc3 = await utilsTask.impersonateAccountLocalNode(config.account3);

    return {acc1, acc2, acc3}
}

async function addLiquidity(accounts: SignerWithAddress[], config: ConfigStrategy): Promise<void> {

    for (let i = 0; i < accounts.length; i++) {
        console.log("accounts: ", accounts[i].address)
        await taskPoolCurve.addLiquidity(accounts[i],
            config.tokenDeposit, config.curveSwap,
            config.pathAddLiquidityCurve, 0);
    }
}

async function depositVault(accounts: SignerWithAddress[], vaultAddress: string, config: ConfigStrategy): Promise<void> {
    for (let i = 0; i < accounts.length; i++) {
        await erc20Task.approve(config.want, accounts[i], vaultAddress, ethers.constants.MaxUint256);

        let balanceLp = await erc20Task.balanceOf(config.want, accounts[i].address);
        let amountIn = balanceLp.gt(config.amountToDepositVault) ? config.amountToDepositVault : balanceLp;

        console.log("Account : ", i , " with address: ", accounts[i].address, " deposit: ", ethers.utils.formatEther(amountIn));
        await vaultTask.deposit(vaultAddress, accounts[i], amountIn)
    }
}

async function withdrawVault(accounts: SignerWithAddress[], vaultAddress: string): Promise<void> {
    for (let i = 0; i < accounts.length; i++) {

        await vaultTask.withdrawAll(vaultAddress, accounts[i]);

    }
}

export const testStrategyTask = {
    setupContractBase: async function (config: ConfigStrategy): Promise<any>{
        return await setupContractBase(config);
    },
    setupContractPartial: async function (): Promise<any>{
        return await setupContractPartial();
    },
    impersonateAccount: async function (config: ConfigStrategy): Promise<any>{
        return await impersonateAccount(config);
    },
    addLiquidity: async function (accounts: SignerWithAddress[], config: ConfigStrategy): Promise<any>{
        return await addLiquidity(accounts, config);
    },
    depositVault: async function (accounts: SignerWithAddress[], vaultAddress: string, config: ConfigStrategy): Promise<any>{
        return await depositVault(accounts, vaultAddress, config);
    },
    withdrawVault: async function (accounts: SignerWithAddress[], vaultAddress: string): Promise<any>{
        return await withdrawVault(accounts, vaultAddress);
    },
};
