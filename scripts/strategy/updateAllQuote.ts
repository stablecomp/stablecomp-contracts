import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const { run, ethers } = hardhat;

const tokenInfo = require('../../info/address_mainnet/tokenInfo.json');
const curveAddress = require('../../info/address_mainnet/curveAddress.json');
import {uniswapSdkTask} from "../01_task/uniswap/sdkTask";
import {taskSdkCurve} from "../01_task/curve/curveTask";
import process from "process";
import {erc20Task} from "../01_task/standard/erc20Task";

let deployer : SignerWithAddress;

async function main(): Promise<void> {
    await run('compile');
    [deployer] = await ethers.getSigners();
}

async function saveBestQuote(nameQuote: string, tokenIn: any, tokenOut: any, amountIn: any) {
    let protocol: any;
    let {coinPath, feePath, versionProtocol, rawQuote} = await uniswapSdkTask.getBestQuoteSwap(tokenIn, tokenOut, amountIn);
    if (coinPath.length > 0 ) {
        protocol = "Uniswap "+ versionProtocol;
        await uniswapSdkTask.writeBestQuoteUniswap(nameQuote, coinPath, feePath, versionProtocol)
    } else {
        const { route, output }  = await taskSdkCurve.getBestRateForMultiplePools(
            process.env.ETH_MAINNET_URL,
            tokenIn, tokenOut,
            amountIn
        );
        if (route.length > 0) {
            protocol = "Curve";
            await taskSdkCurve.writeBestQuoteCurve(nameQuote, route);
        } else {
            protocol = "Not founded";
            console.log("!!!!!!! Not founded !!!!!!!!")
        }
    }

    console.log("Quote: ", nameQuote, " / Protocol: ", protocol);

}

main()
    .then(async () => {

        let amountInNumber = 200;

        let listCoins = [];
        // ThreeEur
        let coins = curveAddress.coins.threePool
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // Busd3Crv
        coins = curveAddress.coins.busd3crv
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // Dola3Crv
        coins = curveAddress.coins.dola3crv
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // EuroC3Crv
        coins = curveAddress.coins.euroc3crv
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // Europool
        coins = curveAddress.coins.europool
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // Frax3Crv
        coins = curveAddress.coins.frax3crv
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // FraxUsdc
        coins = curveAddress.coins.fraxUsdc
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // IbEurSEur
        coins = curveAddress.coins.ibEurSEur
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // Mim3Crv
        coins = curveAddress.coins.mim3crv
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // Tricrypto
        coins = curveAddress.coins.tricrypto
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // Tusd3Crv
        coins = curveAddress.coins.tusd3crv
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // Usdd3Crv
        coins = curveAddress.coins.usdd3crv
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // EurT3Crv
        coins = curveAddress.coins.eurt3crv
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // ThreePool
        coins = curveAddress.coins.threePool
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // AlUsd3Crv
        coins = curveAddress.coins.alUsd3crv
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // Gusd3Crv
        coins = curveAddress.coins.gusd3crv
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // Ousd3Crv
        coins = curveAddress.coins.ousd3crv
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // UsdcEurs
        coins = curveAddress.coins.usdcEurs
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // Usdp3Crv
        coins = curveAddress.coins.usdp3crv
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // EusdFraxBp
        coins = curveAddress.coins.eusdFraxbp
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // DolaFraxBp
        coins = curveAddress.coins.dolaFraxbp
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // AgEurEuroC
        coins = curveAddress.coins.agEurEuroC
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // IbEurUsdc
        coins = curveAddress.coins.ibEurUsdc
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // AgEurEurTEurs
        coins = curveAddress.coins.agEurEurtEurs
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // WethCrv
        coins = curveAddress.coins.wethCrv
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }
        // WethFrax
        coins = curveAddress.coins.wethFrax
        for (let i = 0; i < coins.length; i++) {
            if (listCoins.includes(coins[i])){
                continue;
            }
            listCoins.push(coins[i]);

            let symbol = await erc20Task.getSymbol(coins[i])
            // crv
            let nameQuoteCrv = "crv_" + symbol;
            await saveBestQuote(nameQuoteCrv, tokenInfo.crv.address, coins[i], amountInNumber);
            // cvx
            let nameQuoteCvx = "cvx_" + symbol;
            await saveBestQuote(nameQuoteCvx, tokenInfo.cvx.address, coins[i], amountInNumber);
        }

        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

