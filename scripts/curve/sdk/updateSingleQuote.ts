import * as process from "process";
import {erc20Task} from "../../01_task/standard/erc20Task";
import {taskSdkCurve} from "../../01_task/curve/curveTask";

const tokenInfo = require("../../../info/address_mainnet/tokenInfo.json")

async function main(): Promise<void> {
}

main()
    .then(async () => {

        const tokenIn = tokenInfo.crv.address;
        const tokenOut = tokenInfo.eusd.address;
        const amountIn = 100;
        const { route, output }  = await taskSdkCurve.getBestRateForMultiplePools(process.env.ETH_MAINNET_URL, tokenIn, tokenOut, amountIn);

        if (route.length > 0 ) {
            console.log(`Best rate for ${amountIn} ${await erc20Task.getSymbol(tokenIn)} to ${await erc20Task.getSymbol(tokenOut)}: ${output}`);
            console.log(route)
            console.log(`Route: ${route.map(p => `${p.poolId} (${p.poolAddress})`).join(' -> ')}`);

            await taskSdkCurve.writeBestQuoteCurve("crv_" + await erc20Task.getSymbol(tokenOut), route);

        } else {
            console.log("Route not founded")
        }
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

