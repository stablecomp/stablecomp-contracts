import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {ConfigStrategy, deployScompTask, strategyTask, vaultTask} from "../../01_task/sCompTask";
import {utilsTask} from "../../01_task/standard/utilsTask";
import {poolCurveTask} from "../../01_task/curve/curveTask";
import {erc20Task} from "../../01_task/standard/erc20Task";
import {oracleRouterTask} from "../../01_task/oracle/oracleRouterTask";
const { ethers } = hardhat;

const tokenInfo = require('../../../info/address_mainnet/tokenInfo.json');
const curveInfo = require('../../../info/address_mainnet/curveAddress.json');
const oracleInfo = require('../../../info/address_mainnet/oracleAddress.json');

async function setupContractBase(config: ConfigStrategy): Promise<any> {

    const [deployer] = await ethers.getSigners();

    let sCompToken = await deployScompTask.deploySCompToken();

    let ve = await deployScompTask.deployVe(sCompToken.address);

    let feeDistribution = await deployScompTask.deployFeeDistribution(sCompToken.address, ve.address, deployer.address, deployer.address);

    let surplusConverterV2 = await deployScompTask.deploySurplusConverterV2(feeDistribution.address, deployer.address, deployer.address, [deployer.address, deployer.address])

    let controller = await deployScompTask.deployController(deployer.address, deployer.address, deployer.address);

    let timelockController = await deployScompTask.deployTimeLockController([deployer.address], [deployer.address]);

    let oracleRouter = await deployScompTask.deployOracleRouter();

    let vault = await deployScompTask.deployVault(controller.address, config.want, deployer.address, config.feeDeposit);

    let strategy = await deployScompTask.deployStrategy(
        config.name, deployer.address, surplusConverterV2.address, controller.address, oracleRouter.address,
        config.want, config.tokenCompound, config.tokenCompoundPosition, config.pidPool, config.feeGovernance, config.feeStrategist, config.feeWithdraw,
        config.curveSwap, config.nElementPool, timelockController.address, config.versionStrategy
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

async function setTokenSwapPath(strategyAddress: string, config: ConfigStrategy): Promise<any> {

    // set token swap path for cvx and crv
    await strategyTask.setTokenSwapPathConfig(strategyAddress, config.crvSwapPath);
    await strategyTask.setTokenSwapPathConfig(strategyAddress, config.cvxSwapPath);

}

async function addFeed(oracleRouterAddress: string, config: ConfigStrategy): Promise<any> {
    let timeUpdate = 100000000
    await oracleRouterTask.addFeed(oracleRouterAddress, tokenInfo.crv.address, oracleInfo.crv_usd.address, 0, timeUpdate, false)
    await oracleRouterTask.addFeed(oracleRouterAddress, tokenInfo.cvx.address, oracleInfo.cvx_usd.address, 0, timeUpdate,false)
    await oracleRouterTask.addFeed(oracleRouterAddress, config.tokenCompound, config.feed, config.priceAdmin, timeUpdate, true)
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
        await poolCurveTask.addLiquidity(accounts[i],
            config.tokenDeposit, config.curveSwap,
            config.pathAddLiquidityCurve, 0,
            "");
    }
}

async function depositVault(accounts: SignerWithAddress[], vaultAddress: string, config: ConfigStrategy): Promise<void> {
    for (let i = 0; i < accounts.length; i++) {
        await erc20Task.approve(config.want, accounts[i], vaultAddress, ethers.constants.MaxUint256);

        let balanceLp = await erc20Task.balanceOf(config.want, accounts[i].address);
        let amountIn = balanceLp.gt(config.amountToDepositVault) ? config.amountToDepositVault : balanceLp;
        await vaultTask.deposit(vaultAddress, accounts[i], amountIn)
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
