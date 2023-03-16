import hardhat from 'hardhat';
import {CurrencyAmount, Percent, SupportedChainId, Token, TradeType} from "@uniswap/sdk-core";
import {AlphaRouter, AlphaRouterConfig, ChainId, SwapType, SwapOptionsSwapRouter02} from '@uniswap/smart-order-router'
import { Protocol } from '@uniswap/router-sdk';
import {JsonRpcProvider} from "@ethersproject/providers/src.ts/json-rpc-provider";
import JSBI from "jsbi";
import fs from "fs";
import {erc20Task} from "../standard/erc20Task";
import {utilsTask} from "../standard/utilsTask";
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const {  ethers } = hardhat;

const poolUniswapV3Abi = require('../../../info/abi/poolUniswapV3.json');
const poolUniswapV2Abi = require('../../../info/abi/poolUniswapV2.json');
const quoterV3ABI = require('../../../info/abi/quoterUniswapV3.json');
const uniswapV3ABI = require('../../../info/abi/uniswapV3ABI.json');

const uniswapAddress = require('../../../info/address_mainnet/uniswapAddress.json');

async function swapExactInput(accountOperator: SignerWithAddress, accountFrom: string, accountTo:string,
                              coinPath: string[], feePath: any[],
                              amountIn: any, amountOutMinimum: any): Promise<void>{
    let uniswapV3Contract: Contract = await getUniswapV3Router();
    let pathEncoded = encodePath(coinPath, feePath);
    let block = await utilsTask.getBlock();
    let swapParams: any = {
        path: pathEncoded,
        recipient: accountFrom,
        deadline: block.timestamp + 1000,
        amountIn: amountIn,
        amountOutMinimum: amountOutMinimum
    }
    let tx = await uniswapV3Contract.connect(accountOperator).exactInput(swapParams)
    await tx.wait();
}

async function getBestQuoteSwap(tokenInInfo: any, tokenOutInfo: any, amountIn: any): Promise<any> {

    const tokenIn = new Token(
        SupportedChainId.MAINNET,
        tokenInInfo.address,
        tokenInInfo.decimals,
        'tokenIn',
        'tokenIn'
    )

    const tokenOut = new Token(
        SupportedChainId.MAINNET,
        tokenOutInfo.address,
        tokenOutInfo.decimals,
        'tokenOut',
        'tokenOut'
    )

    return await getBestPathUniswap(tokenIn, tokenOut, amountIn);
}

async function writeBestQuoteUniswap(nameQuote: string, coinPath: string[], feePath: string[], versionProtocol: string): Promise<any> {
    let quotePath = "./info/bestQuote/"
    if (!fs.existsSync(quotePath)) {
        fs.mkdirSync(quotePath);
    }

    let path = quotePath + nameQuote+".json"

    let routerIndex = versionProtocol === "V2" ? 0 : versionProtocol === "V3" ? 2 : 1

    let jsonData = {
        coinPath: coinPath,
        feePath: feePath,
        versionProtocol: versionProtocol,
        routerIndex: routerIndex
    }
    let data = JSON.stringify(jsonData);
    fs.writeFileSync(path, data);
}

async function getQuoteExactInput(coinPath: string[], feePath: any[], amountIn: any): Promise<any> {
    let quoteContract: Contract = await getQuoterV3();
    let pathEncoded = encodePath(coinPath, feePath);
    return await quoteContract.callStatic.quoteExactInput(pathEncoded, amountIn);
}

// INTERNAL FUNCTION
async function getUniswapV3Router(): Promise<Contract>{
    return new ethers.Contract(
        uniswapAddress.uniswapV3,
        uniswapV3ABI,
        ethers.provider
    );
}

async function getQuoterV3(): Promise<Contract>{
    return new ethers.Contract(
        uniswapAddress.quoter,
        quoterV3ABI,
        ethers.provider
    );
}

async function getRoutingSwap(tokenIn : Token, tokenOut: Token, amountIn: any): Promise<any> {
    const [deployer] = await ethers.getSigners();
    let provider: JsonRpcProvider = new ethers.providers.JsonRpcProvider(
        "https://mainnet.infura.io/v3/899c81095bc24dc2b06d43b6c2b65b8a"
    )
    let router: AlphaRouter = new AlphaRouter({
        chainId: ChainId.MAINNET,
        provider: provider,
    })
    let options: SwapOptionsSwapRouter02 = {
        recipient: deployer.address,
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
        {protocols: [Protocol.V3, Protocol.V2]}
    );

}

async function getBestPathUniswap(tokenIn: Token, tokenOut: Token, amountIn: any): Promise<any> {
    let route = await getRoutingSwap(tokenIn, tokenOut, amountIn);

    let listPoolAddress = route?.route[0].poolAddresses;
    let protocol = route?.route[0].protocol;

    let coinPath: any = [];
    let feePath: any = [];
    let versionProtocol: any = protocol;

    if (listPoolAddress !== null && listPoolAddress != undefined) {

        for (let i = 0; i < listPoolAddress.length; i++){
            let address = listPoolAddress[i];
            if (protocol == "V3") {
                let poolContract = new ethers.Contract(
                    address,
                    poolUniswapV3Abi,
                    ethers.provider
                )
                let fee = await poolContract.fee();
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
                feePath.push(fee);
            } else {
                // get correct pool contract
                let poolContract = new ethers.Contract(
                    address,
                    poolUniswapV3Abi,
                    ethers.provider
                )
                try {
                    await poolContract.fee();
                } catch (error: any) {
                    poolContract = new ethers.Contract(
                        address,
                        poolUniswapV2Abi,
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
        console.log("No pool founded for route: ", await erc20Task.getSymbol(tokenIn.address), " -> ", await erc20Task.getSymbol(tokenOut.address))
    }

    return {coinPath, feePath, versionProtocol}

}

function encodePath(path: any, fees: any) {
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

export const uniswapPoolV3 = {
    swapExactInput: async function (accountOperator: SignerWithAddress, accountFrom: string, accountTo:string,
                                    coinPath: string[], feePath: any[],
                                    amountIn: any, amountOutMinimum: any): Promise<void> {
        return await swapExactInput(accountOperator, accountFrom, accountTo, coinPath, feePath, amountIn, amountOutMinimum);
    },
    getQuoteExactInput: async function (coinPath: string[], feePath: any[], amountIn: any): Promise<any> {
        return await getQuoteExactInput(coinPath, feePath, amountIn);
    },
    getBestQuoteSwap: async function (tokenInInfo: any, tokenOutInfo: any, amountIn: any): Promise<any>{
        return await getBestQuoteSwap(tokenInInfo, tokenOutInfo, amountIn);
    },
    writeBestQuoteUniswap: async function (nameQuote: string, coinPath: string[], feePath: string[], versionProtocol: string): Promise<any>{
        return await writeBestQuoteUniswap(nameQuote, coinPath, feePath, versionProtocol);
    },
};
