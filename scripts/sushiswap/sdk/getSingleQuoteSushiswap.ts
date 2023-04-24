import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const { run, ethers } = hardhat;

const tokenInfo = require('../../../info/address_mainnet/tokenInfo.json');
import {sushiswapSdkTask} from "../../01_task/sushiswap/sdkTask";

let deployer : SignerWithAddress;

async function main(): Promise<void> {
    await run('compile');
    [deployer] = await ethers.getSigners();
}

async function getQuote(nameQuote: string, tokenInAddress: any, tokenOutAddress: any, amountIn: any) {
        console.log("Quote: " + nameQuote);
        await sushiswapSdkTask.getBestQuoteSwap(tokenInAddress, tokenOutAddress, amountIn);
        /*
        console.log("Version protocol: ", versionProtocol);
        for (let i = 0 ; i < coinPath.length; i++ ) {
                let tokenSymbol = await erc20Task.getSymbol(coinPath[i]);
                console.log("Token ", i ," is: ", tokenSymbol, " with address: ", coinPath[i]);
                if (i < feePath.length) console.log("Fee is: ", feePath[i]);
        }
         */
}

main()
    .then(async () => {

        // swap variable
        let amountInNumber = 10;

        await getQuote("crv_usdp", tokenInfo.crv.address, tokenInfo.usdp.address, amountInNumber);
        await getQuote("cvx_usdp", tokenInfo.cvx.address, tokenInfo.usdp.address, amountInNumber);

        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

