import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const { run, ethers } = hardhat;
import process from "process";

import {uniswapSdkTask} from "../01_task/uniswap/sdkTask";
import {taskSdkCurve} from "../01_task/curve/curveTask";
import {erc20Task} from "../01_task/standard/erc20Task";

const tokenInfo = require('../../info/address_mainnet/tokenInfo.json');

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
        let tokenIn : string = tokenInfo.cvx.address;
        let tokenOut : string = tokenInfo.ibEur.address

        let symbol = await erc20Task.getSymbol(tokenOut);
        // cvx
        let nameQuoteCvx = "cvx_" + symbol;
        await saveBestQuote(nameQuoteCvx, tokenIn, tokenOut, amountInNumber);

        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

