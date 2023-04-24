import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const { run, ethers } = hardhat;

const tokenInfo = require('../../../info/address_mainnet/tokenInfo.json');
import {uniswapSdkTask} from "../../01_task/uniswap/sdkTask";

let deployer : SignerWithAddress;

async function main(): Promise<void> {
    await run('compile');
    [deployer] = await ethers.getSigners();
}

async function saveBestQuote(nameQuote: string, tokenInInfo: any, tokenOutInfo: any, amountIn: any) {
        console.log("Quote: " + nameQuote);
        let {coinPath, feePath, versionProtocol} = await uniswapSdkTask.getBestQuoteSwap(tokenInInfo.address, tokenOutInfo.address, amountIn);
        if (coinPath.length > 0 ) {
                await uniswapSdkTask.writeBestQuoteUniswap(nameQuote, coinPath, feePath, versionProtocol)
        }
}

main()
    .then(async () => {

            // swap variable
            let amountInNumber = 10;

            await saveBestQuote("crv_usdp", tokenInfo.crv, tokenInfo.usdp, amountInNumber);
            await saveBestQuote("cvx_usdp", tokenInfo.cvx, tokenInfo.usdp, amountInNumber);

            process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

