import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const { run, ethers } = hardhat;

const tokenInfo = require('../../info/address_mainnet/tokenInfo.json');
import {uniswapPoolV3} from "../01_task/uniswap/poolV3Task";

let deployer : SignerWithAddress;

async function main(): Promise<void> {
    await run('compile');
    [deployer] = await ethers.getSigners();
}

async function saveBestQuote(nameQuote: string, tokenInInfo: any, tokenOutInfo: any, amountIn: any) {
        console.log("Quote: " + nameQuote);
        let {coinPath, feePath, versionProtocol} = await uniswapPoolV3.getBestQuoteSwap(tokenInInfo, tokenOutInfo, amountIn);
        if (coinPath.length > 0 ) {
                await uniswapPoolV3.writeBestQuoteUniswap(nameQuote, coinPath, feePath, versionProtocol)
        }
}

main()
    .then(async () => {

        // swap variable
            let amountInNumber = 200;

        //3CRV
        await saveBestQuote("crv_threeCrv", tokenInfo.crv, tokenInfo.threeCrv, amountInNumber);
        await saveBestQuote("cvx_threeCrv", tokenInfo.cvx, tokenInfo.threeCrv, amountInNumber);

        //WETH
        await saveBestQuote("crv_weth", tokenInfo.crv, tokenInfo.weth, amountInNumber);
        await saveBestQuote("cvx_weth", tokenInfo.cvx, tokenInfo.weth, amountInNumber);

        //WBTC
        await saveBestQuote("crv_wbtc", tokenInfo.crv, tokenInfo.wbtc, amountInNumber);
        await saveBestQuote("cvx_wbtc", tokenInfo.cvx, tokenInfo.wbtc, amountInNumber);

        // DAI
        await saveBestQuote("crv_dai", tokenInfo.crv, tokenInfo.dai, amountInNumber);
        await saveBestQuote("cvx_dai", tokenInfo.cvx, tokenInfo.dai, amountInNumber);

        // FRAX
        await saveBestQuote("crv_frax", tokenInfo.crv, tokenInfo.frax, amountInNumber);
        await saveBestQuote("cvx_frax", tokenInfo.cvx, tokenInfo.frax, amountInNumber);

        // MIM
        await saveBestQuote("crv_mim", tokenInfo.crv, tokenInfo.mim, amountInNumber);
        await saveBestQuote("cvx_mim", tokenInfo.cvx, tokenInfo.mim, amountInNumber);

        // USDC
        await saveBestQuote("crv_usdc", tokenInfo.crv, tokenInfo.usdc, amountInNumber);
        await saveBestQuote("cvx_usdc", tokenInfo.cvx, tokenInfo.usdc, amountInNumber);

        // EURS
        await saveBestQuote("crv_eurs", tokenInfo.crv, tokenInfo.eurs, amountInNumber);
        await saveBestQuote("cvx_eurs", tokenInfo.cvx, tokenInfo.eurs, amountInNumber);

        // agEUR
        await saveBestQuote("crv_agEur", tokenInfo.crv, tokenInfo.agEur, amountInNumber);
        await saveBestQuote("cvx_agEur", tokenInfo.cvx, tokenInfo.agEur, amountInNumber);

        // BUSD
        await saveBestQuote("crv_busd", tokenInfo.crv, tokenInfo.busd, amountInNumber);
        await saveBestQuote("cvx_busd", tokenInfo.cvx, tokenInfo.busd, amountInNumber);

        // dola
        await saveBestQuote("crv_dola", tokenInfo.crv, tokenInfo.dola, amountInNumber);
        await saveBestQuote("cvx_dola", tokenInfo.cvx, tokenInfo.dola, amountInNumber);

        // ibEur
        await saveBestQuote("crv_ibEur", tokenInfo.crv, tokenInfo.ibEur, amountInNumber);
        await saveBestQuote("cvx_ibEur", tokenInfo.cvx, tokenInfo.ibEur, amountInNumber);

        // sEur
        await saveBestQuote("crv_sEur", tokenInfo.crv, tokenInfo.sEur, amountInNumber);
        await saveBestQuote("cvx_sEur", tokenInfo.cvx, tokenInfo.sEur, amountInNumber);

        // TUSD
        await saveBestQuote("crv_tusd", tokenInfo.crv, tokenInfo.tusd, amountInNumber);
        await saveBestQuote("cvx_tusd", tokenInfo.cvx, tokenInfo.tusd, amountInNumber);

        // euroC
        await saveBestQuote("crv_euroC", tokenInfo.crv, tokenInfo.euroC, amountInNumber);
        await saveBestQuote("cvx_euroC", tokenInfo.cvx, tokenInfo.euroC, amountInNumber);

        // usdd
        await saveBestQuote("crv_usdd", tokenInfo.crv, tokenInfo.usdd, amountInNumber);
        await saveBestQuote("cvx_usdd", tokenInfo.cvx, tokenInfo.usdd, amountInNumber);

        // tetherUsd
        await saveBestQuote("crv_tetherUsd", tokenInfo.crv, tokenInfo.tetherUsd, amountInNumber);
        await saveBestQuote("cvx_tetherUsd", tokenInfo.cvx, tokenInfo.tetherUsd, amountInNumber);

        // tetherEur
        await saveBestQuote("crv_tetherEur", tokenInfo.crv, tokenInfo.tetherEur, amountInNumber);
        await saveBestQuote("cvx_tetherEur", tokenInfo.cvx, tokenInfo.tetherEur, amountInNumber);

        // fei
        await saveBestQuote("crv_fei", tokenInfo.crv, tokenInfo.fei, amountInNumber);
        await saveBestQuote("cvx_fei", tokenInfo.cvx, tokenInfo.fei, amountInNumber);

        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

