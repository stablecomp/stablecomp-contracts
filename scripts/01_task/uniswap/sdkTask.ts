import hardhat from 'hardhat';
import {CurrencyAmount, Percent, SupportedChainId, Token, TradeType} from "@uniswap/sdk-core";
import {AlphaRouter, ChainId, SwapType, SwapOptionsSwapRouter02} from "@uniswap/smart-order-router"
import { Protocol } from "@uniswap/router-sdk";
import {JsonRpcProvider} from "@ethersproject/providers/src.ts/json-rpc-provider";
import JSBI from "jsbi";
import fs from "fs";
const {  ethers } = hardhat;

import {erc20Task} from "../standard/erc20Task";
import {Contract} from "@ethersproject/contracts";
import * as path from "path";

const poolUniswapV3Abi = require('../../../info/abi/poolUniswapV3.json');
const poolUniswapV2Abi = require('../../../info/abi/poolUniswapV2.json');
const tokenInfo = require('../../../info/address_mainnet/tokenInfo.json');

async function getBestQuoteSwap(tokenInAddress: any, tokenOutAddress: any, amountIn: any): Promise<any> {
    let erc20In = await getErc20(tokenInAddress);
    const tokenIn = new Token(
        SupportedChainId.MAINNET,
        erc20In.address,
        await erc20In.decimals(),
        await erc20In.symbol(),
        await erc20In.name()
    )

    let erc20Out = await getErc20(tokenOutAddress);
    const tokenOut = new Token(
        SupportedChainId.MAINNET,
        erc20Out.address,
        await erc20Out.decimals(),
        await erc20Out.symbol(),
        await erc20Out.name(),
    )

    return await getBestPathUniswap(tokenIn, tokenOut, amountIn);
}

async function getBestQuoteSwapEncoded(tokenInAddress: any, tokenOutAddress: any, amountIn: any): Promise<any> {
    let erc20In = await getErc20(tokenInAddress);
    const tokenIn = new Token(
        SupportedChainId.MAINNET,
        erc20In.address,
        await erc20In.decimals(),
        await erc20In.symbol(),
        await erc20In.name()
    )

    let erc20Out = await getErc20(tokenOutAddress);
    const tokenOut = new Token(
        SupportedChainId.MAINNET,
        erc20Out.address,
        await erc20Out.decimals(),
        await erc20Out.symbol(),
        await erc20Out.name()
    )

    let {coinPath, feePath, versionProtocol, rawQuote} = await getBestPathUniswap(tokenIn, tokenOut, amountIn);

    let pathEncoded = "";
    if (versionProtocol == "V3"){
        pathEncoded = encodePathV3(coinPath, feePath);
    } else if (versionProtocol == "V2"){
        pathEncoded = encodePathV2(coinPath);
    }

    return {coinPath, feePath, versionProtocol, rawQuote, pathEncoded}
}

async function getBestQuoteSwapOneClick(tokenInAddress: any, tokenOutAddress: any, amountIn: number): Promise<BestQuoteStruct> {
    let bestQuote : BestQuoteStruct = <BestQuoteStruct>{};

    if (tokenInAddress == ethers.constants.AddressZero) {
        tokenInAddress = tokenInfo.weth.address;
    }
    if (tokenOutAddress == ethers.constants.AddressZero) {
        tokenOutAddress = tokenInfo.weth.address;
    }
    let erc20In = await getErc20(tokenInAddress);
    const tokenIn = new Token(
        SupportedChainId.MAINNET,
        erc20In.address,
        await erc20In.decimals(),
        await erc20In.symbol(),
        await erc20In.name()
    )

    let erc20Out = await getErc20(tokenOutAddress);
    const tokenOut = new Token(
        SupportedChainId.MAINNET,
        erc20Out.address,
        await erc20Out.decimals(),
        await erc20Out.symbol(),
        await erc20Out.name()
    )

    let {coinPath, feePath, versionProtocol, rawQuote} = await getBestPathUniswapOneClick(tokenIn, tokenOut, amountIn);
    bestQuote.coinPath = coinPath;
    bestQuote.feePath = feePath;
    bestQuote.versionProtocol = versionProtocol;
    bestQuote.output = rawQuote;

    let pathEncoded = "";
    if (versionProtocol == "V3"){
        pathEncoded = encodePathV3(coinPath, feePath);
    } else if (versionProtocol == "V2"){
        pathEncoded = encodePathV2(coinPath);
    }

    bestQuote.pathEncoded = pathEncoded;

    return bestQuote;
}

async function writeBestQuoteUniswap(nameQuote: string, coinPath: string[], feePath: string[], versionProtocol: string): Promise<any> {
    let infoPath = "./info"
    if (!fs.existsSync(infoPath)) {
        fs.mkdirSync(infoPath);
    }
    let quotePath = infoPath+"/bestQuote/"
    if (!fs.existsSync(quotePath)) {
        fs.mkdirSync(quotePath);
    }

    let path = quotePath + nameQuote+".json"

    let swapType = versionProtocol === "V2" ? 0 : versionProtocol === "V3" ? 2 : 1

    let jsonData = {
        coinPath: coinPath,
        feePath: feePath,
        swapParams: [[]],
        poolAddress: [],
        swapType: swapType
    }
    let data = JSON.stringify(jsonData);
    fs.writeFileSync(path, data);
}

// INTERNAL FUNCTION
async function getErc20(erc20Address: string): Promise<Contract> {
    let factory = await ethers.getContractFactory("ERC20");
    return factory.attach(erc20Address);
}

async function getRoutingSwap(tokenIn : Token, tokenOut: Token, amountIn: any): Promise<any> {
    let provider: JsonRpcProvider = new ethers.providers.JsonRpcProvider(
        process.env.ETH_MAINNET_URL
    )
    let router: AlphaRouter = new AlphaRouter({
        chainId: ChainId.MAINNET,
        provider: provider,
    })
    let options: SwapOptionsSwapRouter02 = {
        recipient: ethers.constants.AddressZero,
        slippageTolerance: new Percent(50, 10_000),
        deadline: Math.floor(Date.now() / 1000 + 1800),
        type: SwapType.SWAP_ROUTER_02,
    }

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
        options,
        {protocols: [Protocol.V2, Protocol.V3]}
    );

}

async function getBestPathUniswap(tokenIn: Token, tokenOut: Token, amountIn: any): Promise<any> {
    let route = await getRoutingSwap(tokenIn, tokenOut, amountIn);

    let listPoolAddress = route?.route[0].poolAddresses;
    let protocol = route?.route[0].protocol;
    let rawQuote = route?.route[0].rawQuote

    let coinPath: any = [];
    let feePath: any = [];
    let versionProtocol: any = protocol;

    if (listPoolAddress !== null && listPoolAddress != undefined) {

        for (let i = 0; i < listPoolAddress.length; i++){
            let address = listPoolAddress[i];
            if (protocol == "V3") {
                // get pool contract
                let poolContract = new ethers.Contract(
                    address,
                    poolUniswapV3Abi,
                    ethers.provider
                )
                let fee = await poolContract.fee();
                let token0 = await poolContract.token0();
                let token1 = await poolContract.token1();

                // update coin path
                if (coinPath.length !== 0) {
                    if (coinPath[coinPath.length-1].toString().toUpperCase() == token0.toString().toUpperCase()) {
                        coinPath.push(token1)
                    } else {
                        coinPath.push(token0)
                    }
                } else {
                    // case first entry
                    if (token0.toString().toUpperCase() === tokenIn.address.toString().toUpperCase()) {
                        coinPath.push(token0)
                        coinPath.push(token1)
                    } else {
                        coinPath.push(token1)
                        coinPath.push(token0)
                    }
                }
                feePath.push(fee);
            } else {
                // get correct pool contract
                let poolContract = new ethers.Contract(
                    address,
                    poolUniswapV2Abi,
                    ethers.provider
                )
                try {
                    await poolContract.fee();
                } catch (error: any) {
                    poolContract = new ethers.Contract(
                        address,
                        poolUniswapV3Abi,
                        ethers.provider
                    )
                }

                let token0 = await poolContract.token0();
                let token1 = await poolContract.token1();

                if (coinPath.length !== 0) {
                    if (coinPath[coinPath.length-1].toString().toUpperCase() == token0.toString().toUpperCase()) {
                        coinPath.push(token1)
                    } else {
                        coinPath.push(token0)
                    }
                } else {
                    // case first entry
                    if (token0.toString().toUpperCase() === tokenIn.address.toString().toUpperCase()) {
                        coinPath.push(token0)
                        coinPath.push(token1)
                    } else {
                        coinPath.push(token1)
                        coinPath.push(token0)
                    }
                }
            }

        }
    }

    return {coinPath, feePath, versionProtocol, rawQuote}

}

async function getBestPathUniswapOneClick(tokenIn: Token, tokenOut: Token, amountIn: number): Promise<any> {
    let route = await getRoutingSwap(tokenIn, tokenOut, amountIn);

    let listPoolAddress = route?.route[0].poolAddresses;
    let protocol = route?.route[0].protocol;
    let rawQuote = route?.route[0].rawQuote

    let coinPath: any = [];
    let feePath: any = [];
    let versionProtocol: any = protocol;

    if (listPoolAddress !== null && listPoolAddress != undefined) {

        for (let i = 0; i < listPoolAddress.length; i++){
            let address = listPoolAddress[i];
            if (protocol == "V3") {
                // get pool contract
                let poolContract = new ethers.Contract(
                    address,
                    poolUniswapV3Abi,
                    ethers.provider
                )
                let fee = await poolContract.fee();
                let token0 = await poolContract.token0();
                let token1 = await poolContract.token1();

                // update coin path
                if (coinPath.length !== 0) {
                    if (coinPath[coinPath.length-1].toString().toUpperCase() == token0.toString().toUpperCase()) {
                        coinPath.push(token1)
                    } else {
                        coinPath.push(token0)
                    }
                } else {
                    // case first entry
                    if (token0.toString().toUpperCase() === tokenIn.address.toString().toUpperCase()) {
                        coinPath.push(token0)
                        coinPath.push(token1)
                    } else {
                        coinPath.push(token1)
                        coinPath.push(token0)
                    }
                }
                feePath.push(fee.toString(16).padStart(6, "0"));
            } else {
                // get correct pool contract
                let poolContract = new ethers.Contract(
                    address,
                    poolUniswapV2Abi,
                    ethers.provider
                )
                try {
                    await poolContract.fee();
                } catch (error: any) {
                    poolContract = new ethers.Contract(
                        address,
                        poolUniswapV3Abi,
                        ethers.provider
                    )
                }

                let token0 = await poolContract.token0();
                let token1 = await poolContract.token1();

                if (coinPath.length !== 0) {
                    if (coinPath[coinPath.length-1].toString().toUpperCase() == token0.toString().toUpperCase()) {
                        coinPath.push(token1)
                    } else {
                        coinPath.push(token0)
                    }
                } else {
                    // case first entry
                    if (token0.toString().toUpperCase() === tokenIn.address.toString().toUpperCase()) {
                        coinPath.push(token0)
                        coinPath.push(token1)
                    } else {
                        coinPath.push(token1)
                        coinPath.push(token0)
                    }
                }
            }

        }
    } else {
        //console.log("No pool founded for route: ", await erc20Task.getSymbol(tokenIn.address), " -> ", await erc20Task.getSymbol(tokenOut.address))
    }

    return {coinPath, feePath, versionProtocol, rawQuote}

}

function encodePathV3(path: any, fees: any) {
    if (path.length != fees.length + 1) {
        throw new Error('path/fee lengths do not match')
    }

    let encoded = '0x'
    for (let i = 0; i < fees.length; i++) {
        // 20 byte encoding of the address
        encoded += String(path[i]).slice(2)
        // 3 byte encoding of the fee
        encoded += fees[i]
    }
    // encode the final token
    encoded += path[path.length - 1].slice(2)

    return encoded.toLowerCase()
}

function encodePathV2(path: any) {
    let encoded = '0x'
    for (let i = 0; i < path.length; i++) {
        // 20 byte encoding of the address
        encoded += String(path[i]).slice(2)
    }
    return encoded.toLowerCase()
}

function fromReadableAmount(amount: number, decimals: number): JSBI {
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

function countDecimals(x: number) {
    if (Math.floor(x) === x) {
        return 0
    }
    return x.toString().split('.')[1].length || 0
}


export interface BestQuoteStruct {
    coinPath: string[],
    feePath: any[],
    pathEncoded: string,
    versionProtocol: string,
    output: any
}
export const uniswapSdkTask = {
    getBestQuoteSwap: async function (tokenInAddress: any, tokenOutAddress: any, amountIn: any): Promise<any>{
        return await getBestQuoteSwap(tokenInAddress, tokenOutAddress, amountIn);
    },
    getBestQuoteSwapOneClick: async function (tokenInAddress: any, tokenOutAddress: any, amountIn: number): Promise<BestQuoteStruct>{
        return await getBestQuoteSwapOneClick(tokenInAddress, tokenOutAddress, amountIn);
    },
    writeBestQuoteUniswap: async function (nameQuote: string, coinPath: string[], feePath: string[], versionProtocol: string): Promise<any>{
        return await writeBestQuoteUniswap(nameQuote, coinPath, feePath, versionProtocol);
    },
};
