import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const { run, ethers } = hardhat;

const tokenInfo = require('../../../info/address_mainnet/tokenInfo.json');
import {uniswapPoolV3} from "../../01_task/uniswap/poolV3Task";
import {erc20Task} from "../../01_task/standard/erc20Task";

let deployer : SignerWithAddress;

async function main(): Promise<void> {
    await run('compile');
    [deployer] = await ethers.getSigners();
}

async function getQuote(nameQuote: string, tokenInInfo: any, tokenOutInfo: any, amountIn: any) {
        console.log("Quote: " + nameQuote);
        let {coinPath, feePath, versionProtocol} = await uniswapPoolV3.getBestQuoteSwap(tokenInInfo, tokenOutInfo, amountIn);
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
        let amountInNumber = 200;

        await getQuote("cvx_eurc", tokenInfo.cvx, tokenInfo.euroC, amountInNumber);
        await getQuote("crv_eurc", tokenInfo.crv, tokenInfo.euroC, amountInNumber);

        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

