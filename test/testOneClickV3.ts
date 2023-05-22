import hardhat  from "hardhat";
import {expect} from "chai";
const { ethers } = hardhat;
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {Contract} from "@ethersproject/contracts";

import {exception} from "./utils/exceptions"
import {erc20Task} from "../scripts/01_task/standard/erc20Task";
import {ConfigStrategy, deployScompTask, oneClickTask, strategyTask, vaultTask} from "../scripts/01_task/sCompTask";
import {utilsTask} from "../scripts/01_task/standard/utilsTask";
import {uniswapSdkTask} from "../scripts/01_task/uniswap/sdkTask";
import {BestQuoteStruct, taskPoolCurve, taskSdkCurve} from "../scripts/01_task/curve/curveTask";

const curveInfo = require('../info/address_mainnet/curveAddress.json');
const tokenInfo = require('../info/address_mainnet/tokenInfo.json');
const routerInfo = require('../info/address_mainnet/routerAddress.json');

let deployer: SignerWithAddress;
let admin: SignerWithAddress;
let account2: SignerWithAddress;
let account3: SignerWithAddress;
let account4: SignerWithAddress;

let oneClick : Contract;
let controller : Contract;
let surplusConvert : Contract;
let oracleRouter : Contract;
let timeLockController : Contract;
let vault3Eur : Contract;
let strategy3Eur : Contract;
let vaultBusd3Crv : Contract;
let strategyBusd3Crv : Contract;
let vaultDola3Crv : Contract;
let strategyDola3Crv : Contract;
let vaultEuroC3Crv : Contract;
let strategyEuroC3Crv : Contract;
let vaultFrax3Crv : Contract;
let strategyFrax3Crv : Contract;
let vaultFraxUsdc : Contract;
let strategyFraxUsdc : Contract;
let vaultIbEurSEur : Contract;
let strategyIbEurSEur : Contract;
let vaultMim3Crv : Contract;
let strategyMim3Crv : Contract;
let vaultTusd3Crv : Contract;
let strategyTusd3Crv : Contract;
let vaultUsdd3Crv : Contract;
let strategyUsdd3Crv : Contract;
let config3eur: ConfigStrategy;
let configBusd3crv: ConfigStrategy;
let configDola3crv: ConfigStrategy;
let configEuroC3crv: ConfigStrategy;
let configFrax3crv: ConfigStrategy;
let configFraxUsdc: ConfigStrategy;
let configIbEurSEur: ConfigStrategy;
let configMim3crv: ConfigStrategy;
let configTusd3Crv: ConfigStrategy;
let configUsdd3Crv: ConfigStrategy;

let tokenIn: any;
let tokenOut: any;
let amountInNumberGlobal: any;
let amountInGlobal: any;

let accountWhaleWbtcAddress = "0x6daB3bCbFb336b29d06B9C793AEF7eaA57888922";

async function getBestQuoteOneClickIn(_tokenIn: any, vaultAddress: any, versionStrategy: string, amountInNumber: any,
                                      listAverageSwap: any[], listSlippage: any[], slippageAddLiquidity: any, listTypeGetQuote: any[] = []): Promise<any> {

    let listAmountSwap : any = getListAmountNumberByAverage(amountInNumber, listAverageSwap);

    let curvePoolInfo: any = await vaultTask.getCurvePoolInfoFromVault(vaultAddress);

    let listCoin = await taskPoolCurve.getCoinsOfCurvePool(curvePoolInfo.swap);

    let listPathData = [];
    let listAddress = [];
    let listAmountOutMin = [];
    let listTypeSwap = [];
    let listRouterAddress = [];

    // get best path for each coin
    for (let i = 0; i < listAmountSwap.length; i++) {
        if (listAmountSwap[i] == 0) {
            listPathData.push(ethers.constants.AddressZero);
            listAddress.push(ethers.constants.AddressZero);
            listAmountOutMin.push(0);
            listTypeSwap.push(0);
            listRouterAddress.push(ethers.constants.AddressZero);
            continue;
        }

        let coinPath, feePath, versionProtocol, rawQuote, pathEncoded;
        let bestQuote: BestQuoteStruct;
        switch (listTypeGetQuote[i]) {
            case undefined:
            case 0:
                bestQuote = await uniswapSdkTask.getBestQuoteSwapOneClick(_tokenIn, listCoin[i], listAmountSwap[i]);
                rawQuote = bestQuote.output;
                if (bestQuote.coinPath.length == 0 ) {
                    bestQuote = await taskSdkCurve.getBestQuoteSwapOneClick(tokenIn, listCoin[i], listAmountSwap[i]);
                    rawQuote = ethers.utils.parseUnits(bestQuote.output, await erc20Task.getDecimals(listCoin[i]));
                }
                break;
            case 1:
                bestQuote = await uniswapSdkTask.getBestQuoteSwapOneClick(_tokenIn, listCoin[i], listAmountSwap[i]);
                rawQuote = bestQuote.output;
                break;
            case 2:
                bestQuote = await taskSdkCurve.getBestQuoteSwapOneClick(tokenIn, listCoin[i], listAmountSwap[i]);
                rawQuote = ethers.utils.parseUnits(bestQuote.output, await erc20Task.getDecimals(listCoin[i]));
                break;
        }
        coinPath = bestQuote.coinPath;
        pathEncoded = bestQuote.pathEncoded;
        versionProtocol = bestQuote.versionProtocol;

        if (coinPath.length > 0) {
            // prepare list
            listAddress.push(coinPath);
            listPathData.push(pathEncoded);

            // slippage
            listAmountOutMin.push(rawQuote.div(100).mul(listSlippage[i]));

            if (versionProtocol == "V2") {
                listTypeSwap.push(0);
                listRouterAddress.push(routerInfo.uniswapV2)
                } else if(versionProtocol == "V3") {
                listTypeSwap.push(1);
                listRouterAddress.push(routerInfo.uniswapV3)
            } else {
                listTypeSwap.push(2);
                listRouterAddress.push(routerInfo.curve);
            }
            /*console.log("Version: ", versionProtocol, " , Coin ", await erc20Task.getSymbol(listCoin[i]))
              console.log(coinPath)
              console.log(pathEncoded)*/
        } else {
            throw new Error("Quote not exist");
        }

    }

    // call amountOutMinLp
    let amountOutMinLp = await taskPoolCurve.calcAmountOutMinAdd(curvePoolInfo.swap, versionStrategy, listAmountOutMin, slippageAddLiquidity);

    return {listAddress, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, amountOutMinLp}
}

/**
 *
 * @param _tokenOut
 * @param vaultAddress
 * @param versionStrategy
 * @param amountShare
 * @param listAverageRemoveLiquidity can only be 50-50 or oneCoin 0-100 / 100-0
 * @param listSlippage
 * @param listTypeGetQuote
 */
async function getBestQuoteOneClickOut(_tokenOut: any, vaultAddress: string, versionStrategy: any, amountShare: any,
                                       listAverageRemoveLiquidity: any[], listSlippage: any[], listTypeGetQuote: any[] = []): Promise<any> {

    let pricePerFullShare = await vaultTask.getPricePerFullShare(vaultAddress);
    let amountLp = amountShare.mul(pricePerFullShare).div(ethers.utils.parseEther("1"));
    console.log("amount share: " + amountShare)
    console.log("amount lp: " + amountLp)

    let listAmountRemoveLiquidity : any = getListAmountByAverage(amountLp, listAverageRemoveLiquidity);

    let curvePool: any = await vaultTask.getCurvePoolInfoFromVault(vaultAddress);
    let listCoin = await taskPoolCurve.getCoinsOfCurvePool(curvePool.swap);
    let amountsOutMinCurve = await taskPoolCurve.calcAmountsOutMinRemove(curvePool.swap, listAmountRemoveLiquidity, listSlippage, versionStrategy);

    let listPathData = [];
    let listAddress = [];
    let listAmountOutMin = [];
    let listTypeSwap = [];
    let listRouterAddress = [];

    // get best path for each coin
    for (let i = 0; i < amountsOutMinCurve.length; i++) {
        if (amountsOutMinCurve[i] == 0) {
            listPathData.push(ethers.constants.AddressZero);
            listAddress.push(ethers.constants.AddressZero);
            listAmountOutMin.push(0);
            listTypeSwap.push(0);
            listRouterAddress.push(ethers.constants.AddressZero);
            continue;
        }

        let coinPath, feePath, versionProtocol, rawQuote, pathEncoded;
        let bestQuote: BestQuoteStruct;
        let amountOutMinString: any;
        switch (listTypeGetQuote[i]) {
            case undefined:
            case 0:
                amountOutMinString = ethers.utils.formatUnits(amountsOutMinCurve[i], await erc20Task.getDecimals(listCoin[i]));
                bestQuote = await uniswapSdkTask.getBestQuoteSwapOneClick(listCoin[i], tokenOut, +amountOutMinString);
                rawQuote = bestQuote.output;
                if (bestQuote.coinPath.length == 0 ) {
                    bestQuote = await taskSdkCurve.getBestQuoteSwapOneClick(listCoin[i], tokenOut, +amountOutMinString);
                    rawQuote = ethers.utils.parseUnits(bestQuote.output, await erc20Task.getDecimals(tokenOut));
                }
                break;
            case 1:
                amountOutMinString = ethers.utils.formatUnits(amountsOutMinCurve[i], await erc20Task.getDecimals(listCoin[i]));
                bestQuote = await uniswapSdkTask.getBestQuoteSwapOneClick(listCoin[i], tokenOut, +amountOutMinString);
                rawQuote = bestQuote.output;
                break;
            case 2:
                amountOutMinString = ethers.utils.formatUnits(amountsOutMinCurve[i], await erc20Task.getDecimals(listCoin[i]));
                bestQuote = await taskSdkCurve.getBestQuoteSwapOneClick(listCoin[i], tokenOut, +amountOutMinString);
                rawQuote = ethers.utils.parseUnits(bestQuote.output, await erc20Task.getDecimals(tokenOut));
                break;
        }
        coinPath = bestQuote.coinPath;
        pathEncoded = bestQuote.pathEncoded;
        versionProtocol = bestQuote.versionProtocol;

        if (coinPath && coinPath.length > 0) {
            // prepare list
            listAddress.push(coinPath);
            listPathData.push(pathEncoded);

            // slippage
            listAmountOutMin.push(rawQuote.div(100).mul(listSlippage[i]));

            if (versionProtocol == "V2") {
                listTypeSwap.push(0);
                listRouterAddress.push(routerInfo.uniswapV2)
            } else if(versionProtocol == "V3") {
                listTypeSwap.push(1);
                listRouterAddress.push(routerInfo.uniswapV3)
            } else {
                listTypeSwap.push(2);
                listRouterAddress.push(routerInfo.curve);
            }

            /*console.log("Version: ", versionProtocol, " , Coin ", await erc20Task.getSymbol(listCoin[i]))
            console.log(coinPath)
            console.log(pathEncoded)*/
        } else {
            console.log("!!!!!!!!! Quote not exist !!!!!!!")
        }

    }

    return {amountsOutMinCurve, listAddress, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress}
}

function getListAmountNumberByAverage(amountInNumber: any, listAverageSwap: any[]): any {

    let listAmountSwap : any = []
    let counterAverage = 0;
    for (let i = 0; i < listAverageSwap.length; i++) {
        counterAverage += listAverageSwap[i];
        if (counterAverage > 100) {
            throw new Error("Average invalid");
        }
        let amountToSwap = amountInNumber / 100 * listAverageSwap[i];
        listAmountSwap.push(amountToSwap);
    }

    return listAmountSwap;
}

function getListAmountByAverage(amountIn: any, listAverageSwap: any[]): any {

    let listAmountSwap : any = []
    let counterAverage = 0;
    for (let i = 0; i < listAverageSwap.length; i++) {
        counterAverage += listAverageSwap[i];
        if (counterAverage > 100) {
            throw new Error("Average invalid");
        }
        let amountToSwap = amountIn.div(100).mul(listAverageSwap[i]);
        listAmountSwap.push(amountToSwap);
    }

    return listAmountSwap;
}


async function getBestQuoteOneClickOutOneCoin(tokenOut: any, curvePoolAddress: string, amountLp: any, nCoins: any, indexCoin: any): Promise<any> {
    let amountsOutMin: any[] = [];
    for (let i = 0; i < nCoins; i++) {
        if (i == indexCoin) {
            let amountOut = taskPoolCurve.calcAmountsOutMinOneCoin(curvePoolAddress, amountInGlobal, indexCoin);
            amountsOutMin.push(amountOut);
        } else {
            amountsOutMin.push(0);
        }
    }
    console.log(amountsOutMin);

    let listCoin = await taskPoolCurve.getCoinsOfCurvePool(curvePoolAddress);

}

before(async function () {
    [deployer, admin, account2, account3, account4] = await ethers.getSigners();
    console.log("main script start with deployer address: ", deployer.address)
});

describe.only("Testing one click", async function () {

    describe('Setup', async () => {

        it('Get config', async () => {
            config3eur = await deployScompTask.getConfig("3eur")
            configBusd3crv= await deployScompTask.getConfig("busd3crv")
            configDola3crv= await deployScompTask.getConfig("dola3crv")
            configEuroC3crv= await deployScompTask.getConfig("euroc3crv")
            configFrax3crv= await deployScompTask.getConfig("frax3crv")
            configFraxUsdc= await deployScompTask.getConfig("fraxusdc")
            configIbEurSEur= await deployScompTask.getConfig("ibeurseur")
            configMim3crv = await deployScompTask.getConfig("mim3crv")
            configTusd3Crv= await deployScompTask.getConfig("tusd3crv")
            configUsdd3Crv= await deployScompTask.getConfig("usdd3crv")

        });

        it('Deploy main', async () => {
            oneClick = await deployScompTask.deployOneClick();
            controller = await deployScompTask.deployController(deployer.address, deployer.address, deployer.address)
            surplusConvert = await deployScompTask.deploySurplusConverter(deployer.address, tokenInfo.weth.address, deployer.address,  deployer.address, [deployer.address, deployer.address])
            oracleRouter = await deployScompTask.deployOracleRouter();
            timeLockController = await deployScompTask.deployTimeLockController([deployer.address], [deployer.address]);
        });

        it('Deploy vault', async () => {
            vault3Eur = await deployScompTask.deployVault(controller.address, config3eur.want, deployer.address,0)
            vaultBusd3Crv = await deployScompTask.deployVault(controller.address, configBusd3crv.want, deployer.address,0)
            vaultDola3Crv = await deployScompTask.deployVault(controller.address, configDola3crv.want, deployer.address,0)
            vaultEuroC3Crv = await deployScompTask.deployVault(controller.address, configEuroC3crv.want, deployer.address,0)
            vaultFrax3Crv = await deployScompTask.deployVault(controller.address, configFrax3crv.want, deployer.address,0)
            vaultFraxUsdc = await deployScompTask.deployVault(controller.address, configFraxUsdc.want, deployer.address,0)
            vaultIbEurSEur = await deployScompTask.deployVault(controller.address, configIbEurSEur.want, deployer.address,0)
            vaultMim3Crv = await deployScompTask.deployVault(controller.address, configMim3crv.want, deployer.address,0)
            vaultTusd3Crv = await deployScompTask.deployVault(controller.address, configTusd3Crv.want, deployer.address,0)
            vaultUsdd3Crv = await deployScompTask.deployVault(controller.address, configUsdd3Crv.want, deployer.address,0)
        });

        it('Deploy strategies', async () => {
            strategy3Eur = await deployScompTask.deployStrategy(config3eur.name, deployer.address, surplusConvert.address, controller.address,
                config3eur.want, config3eur.tokenCompound, config3eur.tokenCompoundPosition, config3eur.pidPool, config3eur.feeGovernance, config3eur.feeStrategist, config3eur.feeWithdraw,
                config3eur.curveSwap, config3eur.nElementPool,  config3eur.versionStrategy)
            strategyBusd3Crv = await deployScompTask.deployStrategy(configBusd3crv.name, deployer.address, surplusConvert.address, controller.address,
                configBusd3crv.want, configBusd3crv.tokenCompound, configBusd3crv.tokenCompoundPosition, configBusd3crv.pidPool, configBusd3crv.feeGovernance, configBusd3crv.feeStrategist, configBusd3crv.feeWithdraw,
                configBusd3crv.curveSwap, configBusd3crv.nElementPool,  configBusd3crv.versionStrategy)
            strategyDola3Crv = await deployScompTask.deployStrategy(configDola3crv.name, deployer.address, surplusConvert.address, controller.address,
                configDola3crv.want, configDola3crv.tokenCompound, configDola3crv.tokenCompoundPosition, configDola3crv.pidPool, configDola3crv.feeGovernance, configDola3crv.feeStrategist, configDola3crv.feeWithdraw,
                configDola3crv.curveSwap, configDola3crv.nElementPool,  configDola3crv.versionStrategy)
            strategyEuroC3Crv = await deployScompTask.deployStrategy(configEuroC3crv.name, deployer.address, surplusConvert.address, controller.address,
                configEuroC3crv.want, configEuroC3crv.tokenCompound, configEuroC3crv.tokenCompoundPosition, configEuroC3crv.pidPool, configEuroC3crv.feeGovernance, configEuroC3crv.feeStrategist, configEuroC3crv.feeWithdraw,
                configEuroC3crv.curveSwap, configEuroC3crv.nElementPool,  configEuroC3crv.versionStrategy)
            strategyFrax3Crv = await deployScompTask.deployStrategy(configFrax3crv.name, deployer.address, surplusConvert.address, controller.address,
                configFrax3crv.want, configFrax3crv.tokenCompound, configFrax3crv.tokenCompoundPosition, configFrax3crv.pidPool, configFrax3crv.feeGovernance, configFrax3crv.feeStrategist, configFrax3crv.feeWithdraw,
                configFrax3crv.curveSwap, configFrax3crv.nElementPool,  configFrax3crv.versionStrategy)
            strategyFraxUsdc = await deployScompTask.deployStrategy(configFraxUsdc.name, deployer.address, surplusConvert.address, controller.address,
                configFraxUsdc.want, configFraxUsdc.tokenCompound, configFraxUsdc.tokenCompoundPosition, configFraxUsdc.pidPool, configFraxUsdc.feeGovernance, configFraxUsdc.feeStrategist, configFraxUsdc.feeWithdraw,
                configFraxUsdc.curveSwap, configFraxUsdc.nElementPool,  configFraxUsdc.versionStrategy)
            strategyIbEurSEur = await deployScompTask.deployStrategy(configIbEurSEur.name, deployer.address, surplusConvert.address, controller.address,
                configIbEurSEur.want, configIbEurSEur.tokenCompound, configIbEurSEur.tokenCompoundPosition, configIbEurSEur.pidPool, configIbEurSEur.feeGovernance, configIbEurSEur.feeStrategist, configIbEurSEur.feeWithdraw,
                configIbEurSEur.curveSwap, configIbEurSEur.nElementPool,  configIbEurSEur.versionStrategy)
            strategyMim3Crv = await deployScompTask.deployStrategy(configMim3crv.name, deployer.address, surplusConvert.address, controller.address,
                configMim3crv.want, configMim3crv.tokenCompound, configMim3crv.tokenCompoundPosition, configMim3crv.pidPool, configMim3crv.feeGovernance, configMim3crv.feeStrategist, configMim3crv.feeWithdraw,
                configMim3crv.curveSwap, configMim3crv.nElementPool,  configMim3crv.versionStrategy)
            strategyTusd3Crv = await deployScompTask.deployStrategy(configTusd3Crv.name, deployer.address, surplusConvert.address, controller.address,
                configTusd3Crv.want, configTusd3Crv.tokenCompound, configTusd3Crv.tokenCompoundPosition, configTusd3Crv.pidPool, configTusd3Crv.feeGovernance, configTusd3Crv.feeStrategist, configTusd3Crv.feeWithdraw,
                configTusd3Crv.curveSwap, configTusd3Crv.nElementPool,  configTusd3Crv.versionStrategy)
            strategyUsdd3Crv = await deployScompTask.deployStrategy(configUsdd3Crv.name, deployer.address, surplusConvert.address, controller.address,
                configUsdd3Crv.want, configUsdd3Crv.tokenCompound, configUsdd3Crv.tokenCompoundPosition, configUsdd3Crv.pidPool, configUsdd3Crv.feeGovernance, configUsdd3Crv.feeStrategist, configUsdd3Crv.feeWithdraw,
                configUsdd3Crv.curveSwap, configUsdd3Crv.nElementPool,  configUsdd3Crv.versionStrategy)
        });

        it('Set config', async () => {
            await strategyTask.setConfig(strategyMim3Crv.address, configMim3crv, controller.address, oracleRouter.address, timeLockController.address);
            await strategyTask.setConfig(strategy3Eur.address, config3eur, controller.address, oracleRouter.address, timeLockController.address);
            await strategyTask.setConfig(strategyBusd3Crv.address, configBusd3crv, controller.address, oracleRouter.address, timeLockController.address);
            await strategyTask.setConfig(strategyDola3Crv.address, configDola3crv, controller.address, oracleRouter.address, timeLockController.address);
            await strategyTask.setConfig(strategyEuroC3Crv.address, configEuroC3crv, controller.address, oracleRouter.address, timeLockController.address);
            await strategyTask.setConfig(strategyFrax3Crv.address, configFrax3crv, controller.address, oracleRouter.address, timeLockController.address);
            await strategyTask.setConfig(strategyFraxUsdc.address, configFraxUsdc, controller.address, oracleRouter.address, timeLockController.address);
            await strategyTask.setConfig(strategyIbEurSEur.address, configIbEurSEur, controller.address, oracleRouter.address, timeLockController.address);
            await strategyTask.setConfig(strategyTusd3Crv.address, configTusd3Crv, controller.address, oracleRouter.address, timeLockController.address);
            await strategyTask.setConfig(strategyUsdd3Crv.address, configUsdd3Crv, controller.address, oracleRouter.address, timeLockController.address);
        });

    });

    describe('Check oneClickIn tokenIn == wbtc', async () => {

        it("set token in", async () => {
            tokenIn = tokenInfo.wbtc.address;
            amountInNumberGlobal = 0.01
            amountInGlobal = ethers.utils.parseUnits(amountInNumberGlobal.toString(), tokenInfo.wbtc.decimals);
        })

        it("fund deployer", async () => {
            let accountWbtc = await utilsTask.impersonateAccountLocalNode(accountWhaleWbtcAddress);
            let amountToFund = ethers.utils.parseUnits("1", tokenInfo.wbtc.decimals);
            await utilsTask.fundAccountToken(tokenInfo.wbtc.address, accountWbtc, deployer.address, amountToFund);
            let balanceWbtc = await erc20Task.balanceOf(tokenInfo.wbtc.address, deployer.address);
            console.log("Balance wbtc deployer is: ", ethers.utils.formatUnits(balanceWbtc, tokenInfo.wbtc.decimals))
        })

        it.skip("should call one click in 3eur", async () => {
            let listAverageSwap = [33, 33, 34];
            let listSlippage = [90,90,90]
            let slippageAddLiquidity = 90

            let {listAddress, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, amountOutMinLp} =
                await getBestQuoteOneClickIn(tokenIn, vault3Eur.address, config3eur.versionStrategy, amountInNumberGlobal,
                    listAverageSwap, listSlippage, slippageAddLiquidity);

            let balanceTokenInBefore = await erc20Task.balanceOf(tokenIn, deployer.address);
            await erc20Task.approve(tokenIn, deployer, oneClick.address, amountInGlobal);
            await oneClickTask.oneClickIn(oneClick.address, amountOutMinLp,
                tokenIn, amountInGlobal,
                listAverageSwap, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vault3Eur.address
            );

            // revert if amount in is zero
            await exception.catchRevert(oneClickTask.oneClickIn(oneClick.address, 0,
                tokenIn, 0,
                listAverageSwap, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vault3Eur.address
            ));

            // revert if listAverage is invalid
            listAverageSwap = [33, 34, 34];
            await exception.catchRevert(oneClickTask.oneClickIn(oneClick.address, 0,
                tokenIn, amountInGlobal,
                listAverageSwap, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vault3Eur.address
            ));

            let balanceTokenInAfter = await erc20Task.balanceOf(tokenIn, deployer.address);
            expect(balanceTokenInBefore.toString()).to.be.equal(balanceTokenInAfter.add(amountInGlobal).toString());
        }).timeout(300000)

        it.skip("should call one click in busd/3crv", async () => {
            let listAverageSwap = [50, 50];
            let listSlippage = [90,90]
            let slippageAddLiquidity = 90

            let {listAddress, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, amountOutMinLp} =
                await getBestQuoteOneClickIn(tokenIn, vaultBusd3Crv.address, configBusd3crv.versionStrategy, amountInNumberGlobal,
                    listAverageSwap, listSlippage, slippageAddLiquidity);

            let balanceTokenInBefore = await erc20Task.balanceOf(tokenIn, deployer.address);

            await erc20Task.approve(tokenIn, deployer, oneClick.address, amountInGlobal);
            await oneClickTask.oneClickIn(oneClick.address, amountOutMinLp,
                tokenIn, amountInGlobal,
                listAverageSwap, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vaultBusd3Crv.address
            );

            let balanceTokenInAfter = await erc20Task.balanceOf(tokenIn, deployer.address);
            expect(balanceTokenInBefore.toString()).to.be.equal(balanceTokenInAfter.add(amountInGlobal).toString());
        }).timeout(100000)

        it.skip("should call one click in dola/3crv", async () => {
            let listAverageSwap = [50, 50];

            let listSlippage = [90,90]
            let slippageAddLiquidity = 90

            let {listAddress, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, amountOutMinLp} =
                await getBestQuoteOneClickIn(tokenIn, vaultDola3Crv.address, configDola3crv.versionStrategy, amountInNumberGlobal,
                    listAverageSwap, listSlippage, slippageAddLiquidity);

            let balanceTokenInBefore = await erc20Task.balanceOf(tokenIn, deployer.address);
            await erc20Task.approve(tokenIn, deployer, oneClick.address, amountInGlobal);
            await oneClickTask.oneClickIn(oneClick.address, amountOutMinLp,
                tokenIn, amountInGlobal,
                listAverageSwap, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vaultDola3Crv.address
            );
            let balanceTokenInAfter = await erc20Task.balanceOf(tokenIn, deployer.address);
            expect(balanceTokenInBefore.toString()).to.be.equal(balanceTokenInAfter.add(amountInGlobal).toString());
        }).timeout(100000)

        it.skip("should call one click in EuroC/3crv",async () => {
            let listAverageSwap = [50, 50];

            let listSlippage = [90,90]
            let slippageAddLiquidity = 90

            let {listAddress, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, amountOutMinLp} =
                await getBestQuoteOneClickIn(tokenIn, vaultEuroC3Crv.address, configEuroC3crv.versionStrategy, amountInNumberGlobal,
                    listAverageSwap, listSlippage, slippageAddLiquidity, [0,0]);

            let balanceTokenInBefore = await erc20Task.balanceOf(tokenIn, deployer.address);
            await erc20Task.approve(tokenIn, deployer, oneClick.address, amountInGlobal);
            await oneClickTask.oneClickIn(oneClick.address, amountOutMinLp,
                tokenIn, amountInGlobal,
                listAverageSwap, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vaultEuroC3Crv.address
            );
            let balanceTokenInAfter = await erc20Task.balanceOf(tokenIn, deployer.address);
            expect(balanceTokenInBefore.toString()).to.be.equal(balanceTokenInAfter.add(amountInGlobal).toString());
        }).timeout(100000)

        it.skip("should call one click in frax/3crv", async () => {
            let listAverageSwap = [50, 50];

            let listSlippage = [90,90]
            let slippageAddLiquidity = 90

            let {listAddress, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, amountOutMinLp} =
                await getBestQuoteOneClickIn(tokenIn, vaultFrax3Crv.address, configFrax3crv.versionStrategy, amountInNumberGlobal,
                    listAverageSwap, listSlippage, slippageAddLiquidity,[1, 1]);

            let balanceTokenInBefore = await erc20Task.balanceOf(tokenIn, deployer.address);
            await erc20Task.approve(tokenIn, deployer, oneClick.address, amountInGlobal);
            await oneClickTask.oneClickIn(oneClick.address, amountOutMinLp,
                tokenIn, amountInGlobal,
                listAverageSwap, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vaultFrax3Crv.address
            );
            let balanceTokenInAfter = await erc20Task.balanceOf(tokenIn, deployer.address);
            expect(balanceTokenInBefore.toString()).to.be.equal(balanceTokenInAfter.add(amountInGlobal).toString());
        }).timeout(100000)

        it.skip("should call one click in frax/usdc", async () => {
            let listAverageSwap = [50, 50];

            let listSlippage = [90,90]
            let slippageAddLiquidity = 90

            let {listAddress, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, amountOutMinLp} =
                await getBestQuoteOneClickIn(tokenIn, vaultFraxUsdc.address, configFraxUsdc.versionStrategy, amountInNumberGlobal,
                    listAverageSwap, listSlippage, slippageAddLiquidity,[2, 2]);

            let balanceTokenInBefore = await erc20Task.balanceOf(tokenIn, deployer.address);
            await erc20Task.approve(tokenIn, deployer, oneClick.address, amountInGlobal);
            await oneClickTask.oneClickIn(oneClick.address, amountOutMinLp,
                tokenIn, amountInGlobal,
                listAverageSwap, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vaultFraxUsdc.address
            );
            let balanceTokenInAfter = await erc20Task.balanceOf(tokenIn, deployer.address);
            expect(balanceTokenInBefore.toString()).to.be.equal(balanceTokenInAfter.add(amountInGlobal).toString());
        }).timeout(100000)

        it("should call one click in ibEur/sEur",async () => {
            let listAverageSwap = [0, 100];

            let listSlippage = [90,90]
            let slippageAddLiquidity = 90

            let {listAddress, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, amountOutMinLp} =
                await getBestQuoteOneClickIn(tokenIn, vaultIbEurSEur.address, configIbEurSEur.versionStrategy, amountInNumberGlobal,
                    listAverageSwap, listSlippage, slippageAddLiquidity,[2,2]);

            let balanceTokenInBefore = await erc20Task.balanceOf(tokenIn, deployer.address);
            await erc20Task.approve(tokenIn, deployer, oneClick.address, amountInGlobal);
            await oneClickTask.oneClickIn(oneClick.address, amountOutMinLp,
                tokenIn, amountInGlobal,
                listAverageSwap, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vaultIbEurSEur.address
            );
            let balanceTokenInAfter = await erc20Task.balanceOf(tokenIn, deployer.address);
            expect(balanceTokenInBefore.toString()).to.be.equal(balanceTokenInAfter.add(amountInGlobal).toString());
        }).timeout(100000)

        it.skip("should call one click in mim/3crv",async () => {
            let listAverageSwap = [50, 50];

            let listSlippageSwap = [90,90]
            let slippageAddLiquidity = 90

            let {listAddress, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, amountOutMinLp} =
                await getBestQuoteOneClickIn(tokenIn, vaultMim3Crv.address, configMim3crv.versionStrategy, amountInNumberGlobal,
                    listAverageSwap, listSlippageSwap, slippageAddLiquidity);

            let balanceTokenInBefore = await erc20Task.balanceOf(tokenIn, deployer.address);
            await erc20Task.approve(tokenIn, deployer, oneClick.address, amountInGlobal);
            await oneClickTask.oneClickIn(oneClick.address, amountOutMinLp,
                tokenIn, amountInGlobal,
                listAverageSwap, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vaultMim3Crv.address
            );
            let balanceTokenInAfter = await erc20Task.balanceOf(tokenIn, deployer.address);
            expect(balanceTokenInBefore.toString()).to.be.equal(balanceTokenInAfter.add(amountInGlobal).toString());
        }).timeout(100000)

        it.skip("should call one click in tusd/3crv", async () => {
            let listAverageSwap = [50, 50];

            let listSlippage = [90,90]
            let slippageAddLiquidity = 90

            let {listAddress, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, amountOutMinLp} =
                await getBestQuoteOneClickIn(tokenIn, vaultTusd3Crv.address, configTusd3Crv.versionStrategy, amountInNumberGlobal,
                    listAverageSwap, listSlippage, slippageAddLiquidity);

            let balanceTokenInBefore = await erc20Task.balanceOf(tokenIn, deployer.address);
            await erc20Task.approve(tokenIn, deployer, oneClick.address, amountInGlobal);
            await oneClickTask.oneClickIn(oneClick.address, amountOutMinLp,
                tokenIn, amountInGlobal,
                listAverageSwap, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vaultTusd3Crv.address
            );
            let balanceTokenInAfter = await erc20Task.balanceOf(tokenIn, deployer.address);
            expect(balanceTokenInBefore.toString()).to.be.equal(balanceTokenInAfter.add(amountInGlobal).toString());
        }).timeout(100000)

        it.skip("should call one click in usdd/3crv", async () => {
            let listAverageSwap = [50, 50];
            let curvePool = curveInfo.pool.usdd3crv
            let lpCurve = curveInfo.lp.usdd3crv

            let listSlippage = [90,90]
            let slippageAddLiquidity = 90

            let {listAddress, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, amountOutMinLp} =
                await getBestQuoteOneClickIn(tokenIn, vaultUsdd3Crv.address, configUsdd3Crv.versionStrategy, amountInNumberGlobal,
                    listAverageSwap, listSlippage, slippageAddLiquidity);

            let balanceTokenInBefore = await erc20Task.balanceOf(tokenIn, deployer.address);
            await erc20Task.approve(tokenIn, deployer, oneClick.address, amountInGlobal);
            await oneClickTask.oneClickIn(oneClick.address, amountOutMinLp,
                tokenIn, amountInGlobal,
                listAverageSwap, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vaultUsdd3Crv.address
            );
            let balanceTokenInAfter = await erc20Task.balanceOf(tokenIn, deployer.address);
            expect(balanceTokenInBefore.toString()).to.be.equal(balanceTokenInAfter.add(amountInGlobal).toString());
        }).timeout(100000)

    });

    describe('Check oneClickOut tokenOut == wbtc', async () => {

        it("set token out", async () => {
            tokenOut = tokenInfo.wbtc.address;
        })

        it.skip("should call one click out 3eur",async () => {
            let vault = vault3Eur;
            let config: ConfigStrategy = config3eur;
            let amountShare = await erc20Task.balanceOf(vault.address, deployer.address);
            let listAverageRemoveLiquidity = [100,0,0];
            let listSlippageRemoveLiquidity = [80,0,0];
            let typeRemoveLiquidity = 0;

            let {amountsOutMinCurve, listAddress, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress} =
                await getBestQuoteOneClickOut(tokenOut, vault.address, config.versionStrategy, amountShare, listAverageRemoveLiquidity, listSlippageRemoveLiquidity);

            let balanceShareBefore = await erc20Task.balanceOf(vault.address, deployer.address);
            let balanceTokenOutBefore = await erc20Task.balanceOf(tokenOut, deployer.address);
            await erc20Task.approve(vault.address, deployer, oneClick.address, amountShare);
            await oneClickTask.oneClickOut(oneClick.address, tokenOut, amountShare,
                amountsOutMinCurve, typeRemoveLiquidity, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vault.address
            );
            let balanceShareAfter = await erc20Task.balanceOf(vault.address, deployer.address);
            let balanceTokenOutAfter = await erc20Task.balanceOf(tokenOut, deployer.address);
            expect(balanceShareAfter.toString()).to.be.equal(balanceShareBefore.sub(amountShare).toString())
            //expect(balanceTokenOutAfter.toString()).to.be.equal(balanceTokenOutBefore.add(amountIn).toString())

            console.log("Balance token out before" + balanceTokenOutBefore)
            console.log("Balance token out after" + balanceTokenOutAfter)

        }).timeout(300000)

        it.skip("should call one click out busd/3crv",async () => {
            let vault = vaultBusd3Crv;
            let config: ConfigStrategy = configBusd3crv;
            let amountShare = await erc20Task.balanceOf(vault.address, deployer.address);
            let listAverageRemoveLiquidity = [0,100];
            let listSlippageRemoveLiquidity = [0,90];
            let typeRemoveLiquidity = 0;

            let {amountsOutMinCurve, listAddress, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress} =
                await getBestQuoteOneClickOut(tokenOut, vault.address, config.versionStrategy, amountShare, listAverageRemoveLiquidity, listSlippageRemoveLiquidity);

            let balanceShareBefore = await erc20Task.balanceOf(vault.address, deployer.address);
            let balanceTokenOutBefore = await erc20Task.balanceOf(tokenOut, deployer.address);
            await erc20Task.approve(vault.address, deployer, oneClick.address, amountShare);
            await oneClickTask.oneClickOut(oneClick.address, tokenOut, amountShare,
                amountsOutMinCurve, typeRemoveLiquidity, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vault.address
            );
            let balanceShareAfter = await erc20Task.balanceOf(vault.address, deployer.address);
            let balanceTokenOutAfter = await erc20Task.balanceOf(tokenOut, deployer.address);
            expect(balanceShareAfter.toString()).to.be.equal(balanceShareBefore.sub(amountShare).toString())
            //expect(balanceTokenOutAfter.toString()).to.be.equal(balanceTokenOutBefore.add(amountIn).toString())

            console.log("Balance token out before" + balanceTokenOutBefore)
            console.log("Balance token out after" + balanceTokenOutAfter)

        }).timeout(300000)

        it.skip("should call one click out dola/3crv",async () => {
            let vault = vaultDola3Crv;
            let config: ConfigStrategy = configDola3crv;
            let amountShare = await erc20Task.balanceOf(vault.address, deployer.address);
            let listAverageRemoveLiquidity = [100,0];
            let listSlippageRemoveLiquidity = [80,0];
            let typeRemoveLiquidity = 0;

            let {amountsOutMinCurve, listAddress, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress} =
                await getBestQuoteOneClickOut(tokenOut, vault.address, config.versionStrategy, amountShare,
                    listAverageRemoveLiquidity, listSlippageRemoveLiquidity);

            let balanceShareBefore = await erc20Task.balanceOf(vault.address, deployer.address);
            let balanceTokenOutBefore = await erc20Task.balanceOf(tokenOut, deployer.address);
            await erc20Task.approve(vault.address, deployer, oneClick.address, amountShare);
            await oneClickTask.oneClickOut(oneClick.address, tokenOut, amountShare,
                amountsOutMinCurve, typeRemoveLiquidity, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vault.address
            );
            let balanceShareAfter = await erc20Task.balanceOf(vault.address, deployer.address);
            let balanceTokenOutAfter = await erc20Task.balanceOf(tokenOut, deployer.address);
            expect(balanceShareAfter.toString()).to.be.equal(balanceShareBefore.sub(amountShare).toString())
            //expect(balanceTokenOutAfter.toString()).to.be.equal(balanceTokenOutBefore.add(amountIn).toString())

            console.log("Balance token out before" + balanceTokenOutBefore)
            console.log("Balance token out after" + balanceTokenOutAfter)

        }).timeout(300000)

        it.skip("should call one click out EuroC/3crv",async () => {
            let vault = vaultEuroC3Crv;
            let config: ConfigStrategy = configEuroC3crv;
            let amountShare = await erc20Task.balanceOf(vault.address, deployer.address);
            let listAverageRemoveLiquidity = [50,50];
            let listSlippageRemoveLiquidity = [90,90];
            let typeRemoveLiquidity = 0;

            let {amountsOutMinCurve, listAddress, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress} =
                await getBestQuoteOneClickOut(tokenOut, vault.address, config.versionStrategy, amountShare,
                    listAverageRemoveLiquidity, listSlippageRemoveLiquidity);

            let balanceShareBefore = await erc20Task.balanceOf(vault.address, deployer.address);
            let balanceTokenOutBefore = await erc20Task.balanceOf(tokenOut, deployer.address);
            await erc20Task.approve(vault.address, deployer, oneClick.address, amountShare);
            await oneClickTask.oneClickOut(oneClick.address, tokenOut, amountShare,
                [0,0], typeRemoveLiquidity, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vault.address
            );
            let balanceShareAfter = await erc20Task.balanceOf(vault.address, deployer.address);
            let balanceTokenOutAfter = await erc20Task.balanceOf(tokenOut, deployer.address);
            expect(balanceShareAfter.toString()).to.be.equal(balanceShareBefore.sub(amountShare).toString())
            //expect(balanceTokenOutAfter.toString()).to.be.equal(balanceTokenOutBefore.add(amountIn).toString())

            console.log("Balance token out before" + balanceTokenOutBefore)
            console.log("Balance token out after" + balanceTokenOutAfter)

        }).timeout(300000)

        it.skip("should call one click out frax/3crv",async () => {
            let vault = vaultFrax3Crv;
            let config: ConfigStrategy = configFrax3crv;
            let amountShare = await erc20Task.balanceOf(vault.address, deployer.address);
            let listAverageRemoveLiquidity = [100,0];
            let listSlippageRemoveLiquidity = [80,0];
            let typeRemoveLiquidity = 0;

            let {amountsOutMinCurve, listAddress, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress} =
                await getBestQuoteOneClickOut(tokenOut, vault.address, config.versionStrategy, amountShare,
                    listAverageRemoveLiquidity, listSlippageRemoveLiquidity);

            let balanceShareBefore = await erc20Task.balanceOf(vault.address, deployer.address);
            let balanceTokenOutBefore = await erc20Task.balanceOf(tokenOut, deployer.address);
            await erc20Task.approve(vault.address, deployer, oneClick.address, amountShare);
            await oneClickTask.oneClickOut(oneClick.address, tokenOut, amountShare,
                amountsOutMinCurve, typeRemoveLiquidity, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vault.address
            );
            let balanceShareAfter = await erc20Task.balanceOf(vault.address, deployer.address);
            let balanceTokenOutAfter = await erc20Task.balanceOf(tokenOut, deployer.address);
            expect(balanceShareAfter.toString()).to.be.equal(balanceShareBefore.sub(amountShare).toString())
            //expect(balanceTokenOutAfter.toString()).to.be.equal(balanceTokenOutBefore.add(amountIn).toString())

            console.log("Balance token out before" + balanceTokenOutBefore)
            console.log("Balance token out after" + balanceTokenOutAfter)

        }).timeout(300000)

        it.skip("should call one click out frax/usdc",async () => {
            let vault = vaultFraxUsdc;
            let config: ConfigStrategy = configFraxUsdc;
            let amountShare = await erc20Task.balanceOf(vault.address, deployer.address);
            let listAverageRemoveLiquidity = [0,100];
            let listSlippageRemoveLiquidity = [0,80];
            let typeRemoveLiquidity = 0;

            let {amountsOutMinCurve, listAddress, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress} =
                await getBestQuoteOneClickOut(tokenOut, vault.address, config.versionStrategy, amountShare, listAverageRemoveLiquidity, listSlippageRemoveLiquidity);

            let balanceShareBefore = await erc20Task.balanceOf(vault.address, deployer.address);
            let balanceTokenOutBefore = await erc20Task.balanceOf(tokenOut, deployer.address);
            await erc20Task.approve(vault.address, deployer, oneClick.address, amountShare);
            await oneClickTask.oneClickOut(oneClick.address, tokenOut, amountShare,
                amountsOutMinCurve, typeRemoveLiquidity, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vault.address
            );
            let balanceShareAfter = await erc20Task.balanceOf(vault.address, deployer.address);
            let balanceTokenOutAfter = await erc20Task.balanceOf(tokenOut, deployer.address);
            expect(balanceShareAfter.toString()).to.be.equal(balanceShareBefore.sub(amountShare).toString())
            //expect(balanceTokenOutAfter.toString()).to.be.equal(balanceTokenOutBefore.add(amountIn).toString())

            console.log("Balance token out before" + balanceTokenOutBefore)
            console.log("Balance token out after" + balanceTokenOutAfter)

        }).timeout(300000)

        it.skip("should call one click out ibEur/sEur",async () => {
            let vault = vaultIbEurSEur;
            let config: ConfigStrategy = configIbEurSEur;
            let amountShare = await erc20Task.balanceOf(vault.address, deployer.address);
            let listAverageRemoveLiquidity = [100,0];
            let listSlippageRemoveLiquidity = [80,0];
            let typeRemoveLiquidity = 0;

            let {amountsOutMinCurve, listAddress, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress} =
                await getBestQuoteOneClickOut(tokenOut, vault.address, config.versionStrategy, amountShare,
                    listAverageRemoveLiquidity, listSlippageRemoveLiquidity);

            let balanceShareBefore = await erc20Task.balanceOf(vault.address, deployer.address);
            let balanceTokenOutBefore = await erc20Task.balanceOf(tokenOut, deployer.address);
            await erc20Task.approve(vault.address, deployer, oneClick.address, amountShare);
            await oneClickTask.oneClickOut(oneClick.address, tokenOut, amountShare,
                amountsOutMinCurve, typeRemoveLiquidity, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vault.address
            );
            let balanceShareAfter = await erc20Task.balanceOf(vault.address, deployer.address);
            let balanceTokenOutAfter = await erc20Task.balanceOf(tokenOut, deployer.address);
            expect(balanceShareAfter.toString()).to.be.equal(balanceShareBefore.sub(amountShare).toString())
            //expect(balanceTokenOutAfter.toString()).to.be.equal(balanceTokenOutBefore.add(amountIn).toString())

            console.log("Balance token out before" + balanceTokenOutBefore)
            console.log("Balance token out after" + balanceTokenOutAfter)

        }).timeout(300000)

        it("should call one click out mim/3crv",async () => {
            let vault = vaultMim3Crv;
            let config: ConfigStrategy = configMim3crv;
            let amountShare = await erc20Task.balanceOf(vault.address, deployer.address);
            let listAverageRemoveLiquidity = [50,50];
            let listSlippageRemoveLiquidity = [90,90];
            let typeRemoveLiquidity = 0;

            let {amountsOutMinCurve, listAddress, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress} =
                await getBestQuoteOneClickOut(tokenOut, vault.address, config.versionStrategy, amountShare,
                    listAverageRemoveLiquidity, listSlippageRemoveLiquidity);

            let balanceShareBefore = await erc20Task.balanceOf(vault.address, deployer.address);
            let balanceTokenOutBefore = await erc20Task.balanceOf(tokenOut, deployer.address);
            await erc20Task.approve(vault.address, deployer, oneClick.address, amountShare);
            await oneClickTask.oneClickOut(oneClick.address, tokenOut, amountShare,
                amountsOutMinCurve, typeRemoveLiquidity, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vault.address
            );
            let balanceShareAfter = await erc20Task.balanceOf(vault.address, deployer.address);
            let balanceTokenOutAfter = await erc20Task.balanceOf(tokenOut, deployer.address);
            expect(balanceShareAfter.toString()).to.be.equal(balanceShareBefore.sub(amountShare).toString())
            //expect(balanceTokenOutAfter.toString()).to.be.equal(balanceTokenOutBefore.add(amountIn).toString())

            console.log("Balance token out before" + balanceTokenOutBefore)
            console.log("Balance token out after" + balanceTokenOutAfter)

        }).timeout(300000)

        it.skip("should call one click out tusd/3crv",async () => {
            let vault = vaultTusd3Crv;
            let config: ConfigStrategy = configTusd3Crv;
            let amountShare = await erc20Task.balanceOf(vault.address, deployer.address);
            let listAverageRemoveLiquidity = [100,0];
            let listSlippageRemoveLiquidity = [80,0];
            let typeRemoveLiquidity = 0;

            let {amountsOutMinCurve, listAddress, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress} =
                await getBestQuoteOneClickOut(tokenOut, vault.address, config.versionStrategy, amountShare,
                    listAverageRemoveLiquidity, listSlippageRemoveLiquidity);

            let balanceShareBefore = await erc20Task.balanceOf(vault.address, deployer.address);
            let balanceTokenOutBefore = await erc20Task.balanceOf(tokenOut, deployer.address);
            await erc20Task.approve(vault.address, deployer, oneClick.address, amountShare);
            await oneClickTask.oneClickOut(oneClick.address, tokenOut, amountShare,
                amountsOutMinCurve, typeRemoveLiquidity, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vault.address
            );
            let balanceShareAfter = await erc20Task.balanceOf(vault.address, deployer.address);
            let balanceTokenOutAfter = await erc20Task.balanceOf(tokenOut, deployer.address);
            expect(balanceShareAfter.toString()).to.be.equal(balanceShareBefore.sub(amountShare).toString())
            //expect(balanceTokenOutAfter.toString()).to.be.equal(balanceTokenOutBefore.add(amountIn).toString())

            console.log("Balance token out before" + balanceTokenOutBefore)
            console.log("Balance token out after" + balanceTokenOutAfter)

        }).timeout(300000)

        it.skip("should call one click out usdd/3crv",async () => {
            let vault = vaultUsdd3Crv;
            let config: ConfigStrategy = configBusd3crv;
            let amountShare = await erc20Task.balanceOf(vault.address, deployer.address);
            let listAverageRemoveLiquidity = [100,0];
            let listSlippageRemoveLiquidity = [80,0];
            let typeRemoveLiquidity = 0;

            let {amountsOutMinCurve, listAddress, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress} =
                await getBestQuoteOneClickOut(tokenOut, vault.address, config.versionStrategy, amountShare,
                    listAverageRemoveLiquidity, listSlippageRemoveLiquidity);

            let balanceShareBefore = await erc20Task.balanceOf(vault.address, deployer.address);
            let balanceTokenOutBefore = await erc20Task.balanceOf(tokenOut, deployer.address);
            await erc20Task.approve(vault.address, deployer, oneClick.address, amountShare);
            await oneClickTask.oneClickOut(oneClick.address, tokenOut, amountShare,
                amountsOutMinCurve, typeRemoveLiquidity, listPathData, listTypeSwap, listAmountOutMin, listRouterAddress, vault.address
            );
            let balanceShareAfter = await erc20Task.balanceOf(vault.address, deployer.address);
            let balanceTokenOutAfter = await erc20Task.balanceOf(tokenOut, deployer.address);
            expect(balanceShareAfter.toString()).to.be.equal(balanceShareBefore.sub(amountShare).toString())
            //expect(balanceTokenOutAfter.toString()).to.be.equal(balanceTokenOutBefore.add(amountIn).toString())

            console.log("Balance token out before" + balanceTokenOutBefore)
            console.log("Balance token out after" + balanceTokenOutAfter)

        }).timeout(300000)

    });

});
