import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {Pool, Route, SwapOptions, SwapQuoter, SwapRouter, Trade} from "@uniswap/v3-sdk";
import {CurrencyAmount, Percent, SupportedChainId, Token, TradeType} from "@uniswap/sdk-core";
import {AlphaRouter, ChainId, SwapOptionsSwapRouter02, SwapType, SwapOptionsUniversalRouter} from '@uniswap/smart-order-router'

import JSBI from 'jsbi'
import {BigNumber, BigNumberish} from "ethers";
import {JsonRpcProvider} from "@ethersproject/providers/src.ts/json-rpc-provider";

const poolUniswapV3Abi = require('../../abi/poolUniswapV3.json');
const poolUniswapV2Abi = require('../../abi/poolUniswapV2.json');
const erc20ABI = require('../../abi/erc20.json');
const tokenAddress = require('../../strategyInfo/address_mainnet/tokenAddress.json');
const tokenDecimals = require('../../strategyInfo/address_mainnet/tokenDecimals.json');

const { run, ethers } = hardhat;

let deployer : SignerWithAddress;

// token address
let daiAddress = tokenAddress.dai;
const daiDecimals = tokenDecimals.dai;
let usdcAddress = tokenAddress.usdc;
const usdcDecimals = tokenDecimals.usdc;
let crvAddress = tokenAddress.crv
const crvDecimals = tokenDecimals.crv;
let cvxAddress = tokenAddress.cvx
const cvxDecimals = tokenDecimals.cvx;
let fraxAddress = tokenAddress.frax
let fraxDecimals = tokenDecimals.frax;
let mimAddress = tokenAddress.mim
let mimDecimals = tokenDecimals.mim;
let threeCrvAddress = tokenAddress.threeCrv
let threeCrvDecimals = tokenDecimals.threeCrv

// swap variable
let amountInNumber = 1;

// token
const crvToken = new Token(
    SupportedChainId.MAINNET,
    tokenAddress.crv,
    tokenDecimals.crv,
    'crv',
    'Curve token'
)

const cvxToken = new Token(
    SupportedChainId.MAINNET,
    tokenAddress.cvx,
    tokenDecimals.cvx,
    'cvx',
    'Convex token'
)

const threeCrvToken = new Token(
    SupportedChainId.MAINNET,
    tokenAddress.threeCrv,
    tokenDecimals.threeCrv,
    '3crv',
    ''
)

const dolaToken = new Token(
    SupportedChainId.MAINNET,
    tokenAddress.dola,
    tokenDecimals.dola,
    'dola',
    'dola'
)

const eurtToken = new Token(
    SupportedChainId.MAINNET,
    tokenAddress.eurT,
    tokenDecimals.eurT,
    'EURT',
    'EURT'
)

const eursToken = new Token(
    SupportedChainId.MAINNET,
    tokenAddress.eurs,
    tokenDecimals.eurs,
    'EURS',
    'EURS'
)

const agEurToken = new Token(
    SupportedChainId.MAINNET,
    tokenAddress.agEur,
    tokenDecimals.agEur,
    'agEur',
    'agEur'
)

const tetherUsdToken = new Token(
    SupportedChainId.MAINNET,
    tokenAddress.tetherUsd,
    tokenDecimals.tetherUsd,
    'tether usd',
    'tether usd'
)

const tetherEurToken = new Token(
    SupportedChainId.MAINNET,
    tokenAddress.tetherEur,
    tokenDecimals.tetherEur,
    'tether eur',
    'tether eur'
)

const fraxToken = new Token(
    SupportedChainId.MAINNET,
    tokenAddress.frax,
    tokenDecimals.frax,
    'FRAX',
    'frax'
)

const usdcToken = new Token(
    SupportedChainId.MAINNET,
    tokenAddress.usdc,
    tokenDecimals.usdc,
    'USDC',
    'USD Coin'
)

const mimToken = new Token(
    SupportedChainId.MAINNET,
    tokenAddress.mim,
    tokenDecimals.mim,
    'MIM',
    'Magic internet money'
)

const busdToken = new Token(
    SupportedChainId.MAINNET,
    tokenAddress.busd,
    tokenDecimals.busd,
    'BUSD',
    'Busd token'
)

const ibEurToken = new Token(
    SupportedChainId.MAINNET,
    tokenAddress.ibEur,
    tokenDecimals.ibEur,
    'ibEur',
    'ibEur'
)

const sEurToken = new Token(
    SupportedChainId.MAINNET,
    tokenAddress.sEur,
    tokenDecimals.sEur,
    'sEur',
    'sEur'
)

const tusdToken = new Token(
    SupportedChainId.MAINNET,
    tokenAddress.tusd,
    tokenDecimals.tusd,
    'tusd',
    'tusd'
)

const usddToken = new Token(
    SupportedChainId.MAINNET,
    tokenAddress.usdd,
    tokenDecimals.usdd,
    'usdd',
    'usdd'
)

const euroCToken = new Token(
    SupportedChainId.MAINNET,
    tokenAddress.euroC,
    tokenDecimals.euroC,
    'euroC',
    'euroC'
)

let provider: JsonRpcProvider;
let router: AlphaRouter;
let options: SwapOptionsUniversalRouter
async function main(): Promise<void> {
    await run('compile');
    [deployer] = await ethers.getSigners();

    provider = new ethers.providers.JsonRpcProvider(
        "https://mainnet.infura.io/v3/899c81095bc24dc2b06d43b6c2b65b8a"
    )

    router = new AlphaRouter({
        chainId: ChainId.MAINNET,
        provider: provider,
    })

    options = {
        recipient: deployer.address,
        slippageTolerance: new Percent(5, 100),
        type: SwapType.UNIVERSAL_ROUTER,
    }

}

async function getRoutingSwap(tokenIn : Token, tokenOut: Token, amountIn: any): Promise<any> {

    return await router.route(
        CurrencyAmount.fromRawAmount(
            tokenIn,
            fromReadableAmount(
                amountIn,
                tokenIn.decimals
            ).toString()
        ),
        tokenOut,
        TradeType.EXACT_INPUT,
        options
    );

}

async function getBestQuote(tokenIn: Token, tokenOut: Token, amountIn: any): Promise<void> {

    let route = await getRoutingSwap(tokenIn, tokenOut, amountIn);

    let listPoolAddress = route?.route[0].poolAddresses;
    let protocol = route?.route[0].protocol;

    console.log("Protocol: ", protocol)
    if (listPoolAddress !== null){

        for (let i = 0; i < listPoolAddress.length; i++){
            console.log("")
            let address = listPoolAddress[i];
            console.log("Pool address: ", address);

            if (protocol == "V3") {
                let poolContract = new ethers.Contract(
                    address,
                    poolUniswapV3Abi,
                    ethers.provider
                )
                let fee = await poolContract.fee();
                console.log("Fee is: ", fee);
                let token0 = await poolContract.token0();
                let token0Contract = new ethers.Contract(
                    token0,
                    erc20ABI,
                    ethers.provider
                )
                console.log("Token 0 is: ", await token0Contract.name(), " with address: ", token0);
                let token1 = await poolContract.token1();
                let token1Contract = new ethers.Contract(
                    token1,
                    erc20ABI,
                    ethers.provider
                )
                console.log("Token 1 is: ", await token1Contract.name(), " with address", token1);

            } else {
                let poolContract = new ethers.Contract(
                    address,
                    poolUniswapV3Abi,
                    ethers.provider
                )
                try {
                    let fee = await poolContract.fee();
                    console.log("Pool v3")
                    console.log("Fee is: ", fee);
                } catch (error: any) {
                    console.log("Pool v2")
                    poolContract = new ethers.Contract(
                        address,
                        poolUniswapV2Abi,
                        ethers.provider
                    )
                }
                let token0 = await poolContract.token0();
                let token0Contract = new ethers.Contract(
                    token0,
                    erc20ABI,
                    ethers.provider
                )
                console.log("Token 0 is: ", await token0Contract.name(), " with address: ", token0);
                let token1 = await poolContract.token1();
                let token1Contract = new ethers.Contract(
                    token1,
                    erc20ABI,
                    ethers.provider
                )
                console.log("Token 1 is: ", await token1Contract.name(), " with address", token1);
            }

        }
    } else {
        console.log("No pool founded")
    }

}

export function fromReadableAmount(amount: number, decimals: number): JSBI {
    const extraDigits = Math.pow(10, countDecimals(amount))
    const adjustedAmount = amount * extraDigits
    return JSBI.divide(
        JSBI.multiply(
            JSBI.BigInt(adjustedAmount),
            JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(decimals))
        ),
        JSBI.BigInt(extraDigits)
    )
}

export function countDecimals(x: number) {
    if (Math.floor(x) === x) {
        return 0
    }
    return x.toString().split('.')[1].length || 0
}

async function getBestQuote3Crv() : Promise<void> {
    console.log("----- 3CRV -----")
    console.log("")
    console.log("Best quote crv -> 3crv")
    await getBestQuote(crvToken, threeCrvToken, amountInNumber);
    console.log("")
    console.log("Best quote cvx -> 3crv")
    await getBestQuote(cvxToken, threeCrvToken, amountInNumber);

}

async function getBestQuoteEurs() : Promise<void> {
    console.log("----- EURS -----")
    console.log("")
    console.log("Best quote crv -> eurs")
    await getBestQuote(crvToken, eursToken, amountInNumber);
    console.log("")
    console.log("Best quote cvx -> eurs")
    await getBestQuote(cvxToken, eursToken, amountInNumber);
}

async function getBestQuoteAgEur() : Promise<void> {
    console.log("----- agEur -----")
    console.log("Best quote crv -> agEur")
    await getBestQuote(crvToken, agEurToken, amountInNumber);
    console.log("")
    console.log("Best quote cvx -> agEur")
    await getBestQuote(cvxToken, agEurToken, amountInNumber);
}

async function getBestQuoteTetherUsd() : Promise<void> {
    console.log("----- Tether usd -----")
    console.log("Best quote crv -> tether usd")
    await getBestQuote(crvToken, tetherUsdToken, amountInNumber);
    console.log("")
    console.log("Best quote cvx -> tether usd")
    await getBestQuote(cvxToken, tetherUsdToken, amountInNumber);
}

async function getBestQuoteTetherEur() : Promise<void> {
    console.log("----- Tether eur -----")
    console.log("Best quote crv -> tether eur")
    await getBestQuote(crvToken, tetherEurToken, amountInNumber);
    console.log("")
    console.log("Best quote cvx -> tether eur")
    await getBestQuote(cvxToken, tetherEurToken, amountInNumber);
}

async function getBestQuoteEurt() : Promise<void> {
    console.log("----- eurt -----")
    console.log("Best quote crv -> eurt")
    await getBestQuote(crvToken, eurtToken, amountInNumber);
    console.log("")
    console.log("Best quote cvx -> eurt")
    await getBestQuote(cvxToken, eurtToken, amountInNumber);
}

async function getBestQuoteBusd() : Promise<void> {
    console.log("----- BUSD -----")
    console.log("")
    console.log("Best quote crv -> busd")
    await getBestQuote(crvToken, busdToken, amountInNumber);
    console.log("")
    console.log("Best quote cvx -> busd")
    await getBestQuote(cvxToken, busdToken, amountInNumber);
}

async function getBestQuoteDola() : Promise<void> {
    console.log("----- DOLA STRATEGY -----")
    console.log("")
    console.log("Best quote crv -> dola")
    await getBestQuote(crvToken, dolaToken, amountInNumber);
    console.log("")
    console.log("Best quote cvx -> dola")
    await getBestQuote(cvxToken, dolaToken, amountInNumber);
}

async function getBestQuoteEuroC() : Promise<void> {
    console.log("----- EuroC -----")
    console.log("")
    console.log("Best quote crv -> euroC")
    await getBestQuote(crvToken, euroCToken, amountInNumber);
    console.log("")
    console.log("Best quote cvx -> euroC")
    await getBestQuote(cvxToken, euroCToken, amountInNumber);
}

async function getBestQuoteFrax() : Promise<void> {
    console.log("----- FRAX -----")
    console.log("")
    console.log("Best quote crv -> frax")
    await getBestQuote(crvToken, fraxToken, amountInNumber);
    console.log("")
    console.log("Best quote cvx -> frax")
    await getBestQuote(cvxToken, fraxToken, amountInNumber);
}

async function getBestQuoteUsdc() : Promise<void> {
    console.log("----- USDC -----")
    console.log("Best quote crv -> usdc")
    await getBestQuote(crvToken, usdcToken, amountInNumber);
    console.log("")
    console.log("Best quote cvx -> usdc")
    await getBestQuote(cvxToken, usdcToken, amountInNumber);
}

async function getBestQuoteIbEur() : Promise<void> {
    console.log("----- IbEur -----")
    console.log("")
    console.log("Best quote crv -> ibEur")
    await getBestQuote(crvToken, ibEurToken, amountInNumber);
    console.log("")
    console.log("Best quote cvx -> ibEur")
    await getBestQuote(cvxToken, ibEurToken, amountInNumber);
}

async function getBestQuoteSEur() : Promise<void> {
    console.log("----- sEur -----")
    console.log("")
    console.log("Best quote crv -> sEur")
    await getBestQuote(crvToken, sEurToken, amountInNumber);
    console.log("")
    console.log("Best quote cvx -> sEur")
    await getBestQuote(cvxToken, sEurToken, amountInNumber);
}

async function getBestQuoteMim() : Promise<void> {
    console.log("----- MIM -----")
    console.log("")
    console.log("Best quote crv -> mim")
    await getBestQuote(crvToken, mimToken, amountInNumber);
    console.log("")
    console.log("Best quote cvx -> mim")
    await getBestQuote(cvxToken, mimToken, amountInNumber);
}

async function getBestQuoteTusd() : Promise<void> {
    console.log("----- TUSD -----")
    console.log("")
    console.log("Best quote crv -> tusd")
    await getBestQuote(crvToken, tusdToken, amountInNumber);
    console.log("")
    console.log("Best quote cvx -> tusd")
    await getBestQuote(cvxToken, tusdToken, amountInNumber);
}

async function getBestQuoteUsdd() : Promise<void> {
    console.log("----- USDD -----")
    console.log("")
    console.log("Best quote crv -> usdd")
    await getBestQuote(crvToken, usddToken, amountInNumber);
    console.log("")
    console.log("Best quote cvx -> usdd")
    await getBestQuote(cvxToken, usddToken, amountInNumber);
}



main()
    .then(async () => {

        console.log("\n")

        //await getBestQuoteTetherUsd();
        await getBestQuote3Crv();

/*        await getBestQuoteAgEur();
        await getBestQuoteTetherEur();
        await getBestQuoteUsdd();
        await getBestQuoteTusd();
        await getBestQuoteMim();
        await getBestQuoteEurs();

        //await getBestQuoteIbEur();
        await getBestQuoteEuroC();
        await getBestQuoteEurt();
        await getBestQuoteEuroC();
        await getBestQuoteSEur();

 */
        console.log("\n")


        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

