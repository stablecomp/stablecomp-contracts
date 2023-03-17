import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {deployScompTask, strategyTask, vaultTask} from "../../01_task/sCompTask";
import {utilsTask} from "../../01_task/standard/utilsTask";
import {poolCurveTask} from "../../01_task/curve/curveTask";
import {erc20Task} from "../../01_task/standard/erc20Task";
const { ethers } = hardhat;

const boosterABI = require('../../../info/abi/booster.json');
const tokenInfo = require('../../../info/address_mainnet/tokenInfo.json');
const routerInfo = require('../../../info/address_mainnet/routerAddress.json');
const curveInfo = require('../../../info/address_mainnet/curveAddress.json');

async function setupContractBase(config: any): Promise<any> {

    const [deployer] = await ethers.getSigners();

    let sCompToken = await deployScompTask.deploySCompToken();

    let ve = await deployScompTask.deployVe(sCompToken.address);

    let feeDistribution = await deployScompTask.deployFeeDistribution(sCompToken.address, ve.address, deployer.address, deployer.address);

    let surplusConverterV2 = await deployScompTask.deploySurplusConverterV2(feeDistribution.address, deployer.address, deployer.address, [deployer.address, deployer.address])

    let controller = await deployScompTask.deployController(deployer.address, deployer.address, deployer.address);

    let timelockController = await deployScompTask.deployTimeLockController([deployer.address], [deployer.address]);

    let vault = await deployScompTask.deployVault(controller.address, config.wantAddress, deployer.address, config.feeDeposit);

    let strategy = await deployScompTask.deployStrategy(
        config.nameStrategy, deployer.address, surplusConverterV2.address, controller.address,
        config.wantAddress, config.tokenCompoundAddress, config.tokenCompoundPosition, config.pidPool, config.feeGovernance, config.feeStrategist, config.feeWithdraw,
        config.curveSwapAddress, config.nElementPool, timelockController.address
    );

    return {sCompToken, ve, feeDistribution, surplusConverterV2, controller, timelockController, vault, strategy}
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

async function setupVaultAndStrategy(config: any, controllerAddress: string, surplusConverterAddress: string, timelockControllerAddress: string): Promise<any> {

    const [deployer] = await ethers.getSigners();

    let vault = await deployScompTask.deployVault(controllerAddress, config.wantAddress, deployer.address, config.feeDeposit);

    let strategy = await deployScompTask.deployStrategy(
        config.nameStrategy, deployer.address, surplusConverterAddress, controllerAddress,
        config.wantAddress, config.tokenCompoundAddress, config.tokenCompoundPosition, config.pidPool, config.feeGovernance, config.feeStrategist, config.feeWithdraw,
        config.curveSwapAddress, config.nElementPool, timelockControllerAddress
    );

    return {vault, strategy}
}

async function setTokenSwapPath(strategyAddress: string, config: any): Promise<any> {

    // set token swap path for cvx and crv
    await strategyTask.setTokenSwapPathConfig(strategyAddress, config.crvSwapPath);
    await strategyTask.setTokenSwapPathConfig(strategyAddress, config.cvxSwapPath);

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
        await vaultTask.deposit(vaultAddress, config.wantAddress, accounts[i], config.amountToDepositVault)
    }
}

async function withdrawVault(accounts: SignerWithAddress[], vaultAddress: string): Promise<void> {
    for (let i = 0; i < accounts.length; i++) {

        await vaultTask.withdrawAll(vaultAddress, accounts[i]);

    }
}


async function getConfig(name: string): Promise<any> {
    if (name == "3eur" ) {
        return {
            nameStrategy: "3Eur",
            wantAddress: curveInfo.lp.threeEur,
            tokenCompoundAddress: tokenInfo.eurT.address,
            tokenCompoundPosition: 1,
            curveSwapAddress: curveInfo.pool.threeEur,
            tokenDepositAddress: tokenInfo.eurT.address,
            accountDepositAddress1: "0x8ff006ECdD4867F9670e8d724243f7E0619ABb66",
            accountDepositAddress2: "0xc6fBD88378cF798f90B66084350fA38eed6a8645",
            accountDepositAddress3: "0x103090A6141ae2F3cB1734F2D0D2D8f8924b3A5d",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("0", 18), ethers.utils.parseUnits("1000", tokenInfo.tetherEur.decimals), ethers.utils.parseUnits("0", 18)],
            baseRewardPoolAddress: curveInfo.baseRewardPool.threeEur,
            pidPool: curveInfo.pid.threeEur,
            nElementPool: curveInfo.nCoins.threeEur,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_eurT",
            cvxSwapPath: "cvx_eurT",
            amountToDepositVault: ethers.utils.parseEther("500")
        }
    }
    else if (name == "busd3crv" ) {
        return {
            nameStrategy: "Busd3Crv",
            wantAddress: curveInfo.lp.busd3crv,
            tokenCompoundAddress: tokenInfo.busd.address,
            tokenCompoundPosition: 0,
            curveSwapAddress: curveInfo.pool.busd3crv,
            tokenDepositAddress: tokenInfo.busd.address,
            accountDepositAddress1: "0xf6deeb3fd7f9ab00b8ba2b0428611bebb4740aab",
            accountDepositAddress2: "0xf9211FfBD6f741771393205c1c3F6D7d28B90F03",
            accountDepositAddress3: "0x0c01e95c161c3025d1874b5734c250449036b32a",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("1000", tokenInfo.busd.decimals), ethers.utils.parseUnits("0", 18)],
            baseRewardPoolAddress: curveInfo.baseRewardPool.busd3crv,
            pidPool: curveInfo.pid.busd3crv,
            nElementPool: curveInfo.nCoins.busd3crv,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_busd",
            cvxSwapPath: "cvx_busd",
            amountToDepositVault: ethers.utils.parseEther("500")

        }
    }
    else if (name == "dola3crv" ) {
        return {
            nameStrategy: "Dola3Crv",
            wantAddress: curveInfo.lp.dola3crv,
            tokenCompoundAddress: tokenInfo.dola.address,
            tokenCompoundPosition: 0,
            curveSwapAddress: curveInfo.pool.dola3crv,
            tokenDepositAddress: tokenInfo.dola.address,
            accountDepositAddress1: "0x16ec2aea80863c1fb4e13440778d0c9967fc51cb",
            accountDepositAddress2: "0x35Ba260cED73d3d8A880BF6B0912EdFB87BfA04C",
            accountDepositAddress3: "0x1ef6d167a6c03cad53a3451fd526a5f434e70b91",
            baseRewardPoolAddress: curveInfo.baseRewardPool.dola3crv,
            pathAddLiquidityCurve: [ethers.utils.parseUnits("1000", tokenInfo.dola.decimals), ethers.utils.parseUnits("0", 18)],
            pidPool: curveInfo.pid.dola3crv,
            nElementPool: curveInfo.nCoins.dola3crv,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_dola",
            cvxSwapPath: "cvx_dola",
            amountToDepositVault: ethers.utils.parseEther("500")
        }
    }
    else if (name == "euroc3crv" ) {
        return {
            nameStrategy: "EuroC3Crv",
            wantAddress: curveInfo.lp.euroc3crv,
            tokenCompoundAddress: tokenInfo.euroC.address,
            curveSwapAddress: curveInfo.pool.euroc3crv,
            tokenDepositAddress: tokenInfo.euroC.address,
            accountDepositAddress1: "0x23a8f11291462aa71a7cf104c1b7894c77047493",
            accountDepositAddress2: "0xffc78585108382a7ad1a6786512a3b53847c7c74",
            accountDepositAddress3: "0x0697FDd0b945e327882d787C8eD8afB5a8565A7d",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("1000", tokenInfo.euroC.decimals), ethers.utils.parseUnits("0", 18)],
            baseRewardPoolAddress: curveInfo.baseRewardPool.euroc3crv,
            pidPool: curveInfo.pid.euroc3crv,
            nElementPool: curveInfo.nCoins.euroc3crv,
            tokenCompoundPosition: 0,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_euroC",
            cvxSwapPath: "cvx_euroC",
            amountToDepositVault: ethers.utils.parseEther("250")
        }
    }
    else if (name == "frax3crv" ) {
        return {
            nameStrategy: "Frax3Crv",
            wantAddress: curveInfo.lp.frax3crv,
            tokenCompoundAddress: tokenInfo.frax.address,
            curveSwapAddress: curveInfo.pool.frax3crv,
            tokenDepositAddress: tokenInfo.frax.address,
            accountDepositAddress1: "0x183d0dc5867c01bfb1dbbc41d6a9d3de6e044626",
            accountDepositAddress2: "0xa4ee464ce1a9058b44a8831085d1413ee235d10f",
            accountDepositAddress3: "0xaf297dec752c909092a117a932a8ca4aaaff9795",
            baseRewardPoolAddress: curveInfo.baseRewardPool.frax3crv,
            pathAddLiquidityCurve: [ethers.utils.parseUnits("1000", tokenInfo.frax.decimals), ethers.utils.parseUnits("0", 18)],
            pidPool: curveInfo.pid.frax3crv,
            nElementPool: curveInfo.nCoins.frax3crv,
            tokenCompoundPosition: 0,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_frax",
            cvxSwapPath: "cvx_frax",
            amountToDepositVault: ethers.utils.parseEther("500")
        }
    }
    else if (name == "fraxusdc" ) {
        return {
            nameStrategy: "FraxUsdc",
            wantAddress: curveInfo.lp.fraxUsdc,
            tokenCompoundAddress: tokenInfo.usdc.address,
            curveSwapAddress: curveInfo.pool.fraxUsdc,
            tokenDepositAddress: tokenInfo.usdc.address,
            accountDepositAddress1: "0x1F376c00176b4Af9F0143067D58e135d05D65C81",
            accountDepositAddress2: "0x3B2A1234378745f53Cf8cC0Aa1f53786c8709B78",
            accountDepositAddress3: "0xeb26a7F7a356C0A96DA7157501eC372cBbe98f6D",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("0", 18), ethers.utils.parseUnits("1000", tokenInfo.usdc.decimals)],
            baseRewardPoolAddress: curveInfo.baseRewardPool.fraxUsdc,
            pidPool: curveInfo.pid.fraxUsdc,
            nElementPool: curveInfo.nCoins.fraxUsdc,
            tokenCompoundPosition: 1,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_usdc",
            cvxSwapPath: "cvx_usdc",
            amountToDepositVault: ethers.utils.parseEther("500")
        }
    }
    else if (name == "ibeurseur" ) {
        return {
            nameStrategy: "ibEurSEur",
            wantAddress: curveInfo.lp.ibEurSEur,
            tokenCompoundAddress: tokenInfo.ibEur.address,
            curveSwapAddress: curveInfo.pool.ibEurSEur,
            tokenDepositAddress: tokenInfo.ibEur.address,
            accountDepositAddress1: "0x07b01E611D9f51d08e4d6D08249413AFde2BcFd8",
            accountDepositAddress2: "0xA049801Ae55847eEb67DB8E1D7F9b6747d307e4E",
            accountDepositAddress3: "0x2B774AE83B165BFc48f91004c4AE146189d249aa",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("1000", tokenInfo.ibEur.decimals), ethers.utils.parseUnits("0", 18)],
            baseRewardPoolAddress: curveInfo.baseRewardPool.ibEurSEur,
            pidPool: curveInfo.pid.ibEurSEur,
            nElementPool: curveInfo.nCoins.ibEurSEur,
            tokenCompoundPosition: 0,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_ibEur",
            cvxSwapPath: "cvx_ibEur",
            amountToDepositVault: ethers.utils.parseEther("500")
        }
    }
    else if (name == "mim3crv" ) {
        return {
            nameStrategy: "Mim3Crv",
            wantAddress: curveInfo.lp.mim3crv,
            tokenCompoundAddress: tokenInfo.mim.address,
            curveSwapAddress: curveInfo.pool.mim3crv,
            tokenDepositAddress: tokenInfo.mim.address,
            accountDepositAddress1: "0xd7efcbb86efdd9e8de014dafa5944aae36e817e4",
            accountDepositAddress2: "0x2bbdca89491e6f0c0f49412d38d893aea394fd02",
            accountDepositAddress3: "0x5EeDA5BDF0A647a7089329428009eCc9CB9451cc",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("1000", tokenInfo.mim.decimals), ethers.utils.parseUnits("0", 18)],
            baseRewardPoolAddress: curveInfo.baseRewardPool.mim3crv,
            pidPool: curveInfo.pid.mim3crv,
            nElementPool: curveInfo.nCoins.mim3crv,
            tokenCompoundPosition: 0,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_mim",
            cvxSwapPath: "cvx_mim",
            amountToDepositVault: ethers.utils.parseEther("500")
        }
    }
    else if (name == "tusd3crv" ) {
        return {
            nameStrategy: "Tusd3Crv",
            wantAddress: curveInfo.lp.tusdc3crv,
            tokenCompoundAddress: tokenInfo.tusd.address,
            curveSwapAddress: curveInfo.pool.tusdc3crv,
            tokenDepositAddress: tokenInfo.tusd.address,
            accountDepositAddress1: "0x270cd0b43f6fE2512A32597C7A05FB01eE6ec8E1",
            accountDepositAddress2: "0x662353d1A53C88c85E546d7C4A72CE8fE1018e72",
            accountDepositAddress3: "0x5aC8D87924255A30FEC53793c1e976E501d44c78",
            pathAddLiquidityCurve: [ethers.utils.parseUnits("1000", tokenInfo.tusd.decimals), ethers.utils.parseUnits("0", 18)],
            baseRewardPoolAddress: curveInfo.baseRewardPool.tusdc3crv,
            pidPool: curveInfo.pid.tusdc3crv,
            nElementPool: curveInfo.nCoins.tusdc3crv,
            tokenCompoundPosition: 0,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_tusd",
            cvxSwapPath: "cvx_tusd",
            amountToDepositVault: ethers.utils.parseEther("500")
        }
    }
    else if (name == "usdd3crv" ) {
        return {
            nameStrategy: "Usdd3Crv",
            wantAddress: curveInfo.lp.usdd3crv,
            tokenCompoundAddress: tokenInfo.usdd.address,
            curveSwapAddress: curveInfo.pool.usdd3crv,
            tokenDepositAddress: tokenInfo.usdd.address,
            accountDepositAddress1: "0x611F97d450042418E7338CBDd19202711563DF01",
            accountDepositAddress2: "0xee5B5B923fFcE93A870B3104b7CA09c3db80047A",
            accountDepositAddress3: "0x44aa0930648738B39a21d66C82f69E45B2ce3B47",
            baseRewardPoolAddress: curveInfo.baseRewardPool.usdd3crv,
            pathAddLiquidityCurve: [ethers.utils.parseUnits("1000", tokenInfo.mim.decimals), ethers.utils.parseUnits("0", 18)],
            pidPool: curveInfo.pid.usdd3crv,
            nElementPool: curveInfo.nCoins.usdd3crv,
            tokenCompoundPosition: 0,
            feeGovernance: 500,
            feeStrategist: 500,
            feeWithdraw: 20,
            feeDeposit: 0,
            crvSwapPath: "crv_usdd",
            cvxSwapPath: "cvx_usdd",
            amountToDepositVault: ethers.utils.parseEther("500")
        }
    }
}

export const testStrategyTask = {
    setupContractBase: async function (config: any): Promise<any>{
        return await setupContractBase(config);
    },
    setupContractPartial: async function (): Promise<any>{
        return await setupContractPartial();
    },
    setupVaultAndStrategy: async function (config: any, controllerAddress: string, surplusConverterAddress: string, timelockControllerAddress: string): Promise<any>{
        return await setupVaultAndStrategy(config, controllerAddress, surplusConverterAddress, timelockControllerAddress);
    },
    impersonateAccount: async function (config: any): Promise<any>{
        return await impersonateAccount(config);
    },
    setTokenSwapPath: async function (strategyAddress: string, config: any): Promise<any>{
        return await setTokenSwapPath(strategyAddress, config);
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
    getConfig: async function (name: string): Promise<any>{
        return await getConfig(name);
    },
};
