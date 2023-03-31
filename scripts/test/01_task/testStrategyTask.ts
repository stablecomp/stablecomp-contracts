import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {deployScompTask, strategyTask, vaultTask} from "../../01_task/sCompTask";
import {utilsTask} from "../../01_task/standard/utilsTask";
import {poolCurveTask} from "../../01_task/curve/curveTask";
import {erc20Task} from "../../01_task/standard/erc20Task";
import {oracleRouterTask} from "../../01_task/oracle/oracleRouterTask";
const { ethers } = hardhat;

const tokenInfo = require('../../../info/address_mainnet/tokenInfo.json');
const curveInfo = require('../../../info/address_mainnet/curveAddress.json');
const oracleInfo = require('../../../info/address_mainnet/oracleAddress.json');

async function setupContractBase(config: any): Promise<any> {

    const [deployer] = await ethers.getSigners();

    let sCompToken = await deployScompTask.deploySCompToken();

    let ve = await deployScompTask.deployVe(sCompToken.address);

    let feeDistribution = await deployScompTask.deployFeeDistribution(sCompToken.address, ve.address, deployer.address, deployer.address);

    let surplusConverterV2 = await deployScompTask.deploySurplusConverterV2(feeDistribution.address, deployer.address, deployer.address, [deployer.address, deployer.address])

    let controller = await deployScompTask.deployController(deployer.address, deployer.address, deployer.address);

    let timelockController = await deployScompTask.deployTimeLockController([deployer.address], [deployer.address]);

    let oracleRouter = await deployScompTask.deployOracleRouter();

    let vault = await deployScompTask.deployVault(controller.address, config.wantAddress, deployer.address, config.feeDeposit);

    let strategy = await deployScompTask.deployStrategy(
        config.nameStrategy, deployer.address, surplusConverterV2.address, controller.address, oracleRouter.address,
        config.wantAddress, config.tokenCompoundAddress, config.tokenCompoundPosition, config.pidPool, config.feeGovernance, config.feeStrategist, config.feeWithdraw,
        config.curveSwapAddress, config.nElementPool, timelockController.address, config.versionStrategy
    );



    return {sCompToken, ve, feeDistribution, surplusConverterV2, controller, timelockController, oracleRouter, vault, strategy}
}

async function setupContractPartial(): Promise<any> {

    const [deployer] = await ethers.getSigners();

    let sCompToken = await deployScompTask.deploySCompToken();

    let ve = await deployScompTask.deployVe(sCompToken.address);

    let feeDistribution = await deployScompTask.deployFeeDistribution(sCompToken.address, ve.address, deployer.address, deployer.address);

    let surplusConverterV2 = await deployScompTask.deploySurplusConverterV2(feeDistribution.address, deployer.address, deployer.address, [deployer.address, deployer.address])

    let controller = await deployScompTask.deployController(deployer.address, deployer.address, deployer.address);

    let timelockController = await deployScompTask.deployTimeLockController([deployer.address], [deployer.address]);

    return {sCompToken, ve, feeDistribution, surplusConverterV2, controller, timelockController}
}

async function setupVaultAndStrategy(config: any, controllerAddress: string, surplusConverterAddress: string, timelockControllerAddress: string, oracleRouterAddress: string): Promise<any> {

    const [deployer] = await ethers.getSigners();

    let vault = await deployScompTask.deployVault(controllerAddress, config.wantAddress, deployer.address, config.feeDeposit);

    let strategy = await deployScompTask.deployStrategy(
        config.nameStrategy, deployer.address, surplusConverterAddress, controllerAddress, oracleRouterAddress,
        config.wantAddress, config.tokenCompoundAddress, config.tokenCompoundPosition, config.pidPool, config.feeGovernance, config.feeStrategist, config.feeWithdraw,
        config.curveSwapAddress, config.nElementPool, timelockControllerAddress, config.versionStrategy
    );

    return {vault, strategy}
}

async function setTokenSwapPath(strategyAddress: string, config: any): Promise<any> {

    // set token swap path for cvx and crv
    await strategyTask.setTokenSwapPathConfig(strategyAddress, config.crvSwapPath);
    await strategyTask.setTokenSwapPathConfig(strategyAddress, config.cvxSwapPath);

}

async function addFeed(oracleRouterAddress: string, config: any): Promise<any> {
    let timeUpdate = 100000000
    await oracleRouterTask.addFeed(oracleRouterAddress, tokenInfo.crv.address, oracleInfo.crv_usd.address, 0, timeUpdate, false)
    await oracleRouterTask.addFeed(oracleRouterAddress, tokenInfo.cvx.address, oracleInfo.cvx_usd.address, 0, timeUpdate,false)
    await oracleRouterTask.addFeed(oracleRouterAddress, config.tokenCompoundAddress, config.feedAddress, config.priceAdmin, timeUpdate, true)
}

async function impersonateAccount(config: any): Promise<any> {

    let acc1 = await utilsTask.impersonateAccountLocalNode(config.accountDepositAddress1);
    let acc2 = await utilsTask.impersonateAccountLocalNode(config.accountDepositAddress2);
    let acc3 = await utilsTask.impersonateAccountLocalNode(config.accountDepositAddress3);

    return {acc1, acc2, acc3}
}

async function addLiquidity(accounts: SignerWithAddress[], config: any): Promise<void> {

    for (let i = 0; i < accounts.length; i++) {
        await poolCurveTask.addLiquidity(accounts[i],
            config.tokenDepositAddress, config.curveSwapAddress,
            config.pathAddLiquidityCurve, 0,
            "");
    }
}

async function depositVault(accounts: SignerWithAddress[], vaultAddress: string, config: any): Promise<void> {
    for (let i = 0; i < accounts.length; i++) {
        await erc20Task.approve(config.wantAddress, accounts[i], vaultAddress, ethers.constants.MaxUint256);
        await vaultTask.deposit(vaultAddress, accounts[i], config.amountToDepositVault)
    }
}

async function withdrawVault(accounts: SignerWithAddress[], vaultAddress: string): Promise<void> {
    for (let i = 0; i < accounts.length; i++) {

        await vaultTask.withdrawAll(vaultAddress, accounts[i]);

    }
}

export const testStrategyTask = {
    setupContractBase: async function (config: any): Promise<any>{
        return await setupContractBase(config);
    },
    setupContractPartial: async function (): Promise<any>{
        return await setupContractPartial();
    },
    setupVaultAndStrategy: async function (config: any, controllerAddress: string, surplusConverterAddress: string, timelockControllerAddress: string, oracleRouterAddress: string): Promise<any>{
        return await setupVaultAndStrategy(config, controllerAddress, surplusConverterAddress, timelockControllerAddress, oracleRouterAddress);
    },
    impersonateAccount: async function (config: any): Promise<any>{
        return await impersonateAccount(config);
    },
    setTokenSwapPath: async function (strategyAddress: string, config: any): Promise<any>{
        return await setTokenSwapPath(strategyAddress, config);
    },
    addFeed: async function (oracleRouterAddress: string, config: any): Promise<any>{
        return await addFeed(oracleRouterAddress, config);
    },
    addLiquidity: async function (accounts: SignerWithAddress[], config: any): Promise<any>{
        return await addLiquidity(accounts, config);
    },
    depositVault: async function (accounts: SignerWithAddress[], vaultAddress: string, config: any): Promise<any>{
        return await depositVault(accounts, vaultAddress, config);
    },
    withdrawVault: async function (accounts: SignerWithAddress[], vaultAddress: string): Promise<any>{
        return await withdrawVault(accounts, vaultAddress);
    },
};
