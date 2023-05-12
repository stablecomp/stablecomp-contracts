import * as process from "process";
import curve from "@curvefi/api";
import {erc20Task} from "../../01_task/standard/erc20Task";

const tokenInfo = require("../../../info/address_mainnet/tokenInfo.json")

async function main(): Promise<void> {
}

const rpcUrl = 'https://red-lively-flower.quiknode.pro/d9fdbf99be306441445a56cd45479a6e5a277759/'

async function getBestRateForMultiplePools(inputToken: string, outputToken: string, amountIn: string | number) {
    await curve.init('JsonRpc', { url: rpcUrl, privateKey: process.env.PRIVATE_KEY }, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0, chainId: 1 });
    await curve.factory.fetchPools();
    await curve.cryptoFactory.fetchPools();
    return await curve.router.getBestRouteAndOutput(inputToken, outputToken, amountIn)
}

main()
    .then(async () => {

        const inputToken = tokenInfo.tetherUsd.address; // USDT
        const outputToken = tokenInfo.stEth.address; // stETH
        const amountIn = 100;
        const { route, output }  = await getBestRateForMultiplePools(inputToken, outputToken, amountIn);

        console.log(`Best rate for ${amountIn} ${await erc20Task.getSymbol(inputToken)} to ${await erc20Task.getSymbol(outputToken)}: ${output}`);
        console.log(`Route: ${route.map(p => `${p.poolId}(${p.poolAddress})`).join(' -> ')}`);

    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });
