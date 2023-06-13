import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const { run, ethers } = hardhat;

const tokenInfo = require('../../../info/address_mainnet/tokenInfo.json');
import {uniswapPoolV3} from "../../01_task/uniswap/poolV3Task";
import {erc20Task} from "../../01_task/standard/erc20Task";
import {uniswapSdkTask} from "../../01_task/uniswap/sdkTask";

let deployer : SignerWithAddress;

async function main(): Promise<void> {
    await run('compile');
    [deployer] = await ethers.getSigners();
}

async function getQuote(nameQuote: string, tokenInAddress: any, tokenOutAddress: any, amountIn: any) {
        console.log("Quote: " + nameQuote);
        let {coinPath, feePath, versionProtocol} = await uniswapSdkTask.getBestQuoteSwapOneClick(tokenInAddress, tokenOutAddress, amountIn);
        console.log("Version protocol: ", versionProtocol);
        for (let i = 0 ; i < coinPath.length; i++ ) {
                let tokenSymbol = await erc20Task.getSymbol(coinPath[i]);
                console.log("Token ", i ," is: ", tokenSymbol, " with address: ", coinPath[i]);
                if (i < feePath.length) console.log("Fee is: ", feePath[i]);
        }
}

main()
    .then(async () => {

        // swap variable
        let amountInNumber = 0.01;
        let amountInNumber2 = 200;

        await getQuote("crv_ibEur", tokenInfo.crv.address, tokenInfo.ibEur.address, amountInNumber2);
        //await getQuote("wbtc_euroC", tokenInfo.wbtc.address, tokenInfo.euroC.address, amountInNumber);
        //await getQuote("wbtc_tetherEur", tokenInfo.wbtc.address, tokenInfo.tetherEur.address, amountInNumber);
        //await getQuote("wbtc_agEur", tokenInfo.wbtc.address, tokenInfo.agEur.address, amountInNumber);
        //await getQuote("wbtc_frax", tokenInfo.wbtc.address, tokenInfo.frax.address, amountInNumber);

        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

