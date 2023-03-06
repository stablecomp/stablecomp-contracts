import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {Pool, Route, SwapOptions, SwapQuoter, SwapRouter, Trade} from "@uniswap/v3-sdk";
import {CurrencyAmount, Percent, SupportedChainId, Token, TradeType} from "@uniswap/sdk-core";
import {AlphaRouter, ChainId, SwapOptionsSwapRouter02, SwapType, SwapOptionsUniversalRouter} from '@uniswap/smart-order-router'

import JSBI from 'jsbi'
import {BigNumber, BigNumberish} from "ethers";

const uniswapV3Abi = require('../../abi/uniswapV3ABI.json');
const quoterUniswapV3Abi = require('../../abi/quoterUniswapV3.json');
const poolUniswapV3Abi = require('../../abi/poolUniswapV3.json');
const erc20ABI = require('../../abi/erc20.json');

const { run, ethers } = hardhat;

const tokenAddress = require('../../strategyInfo/address_mainnet/tokenAddress.json');
const tokenDecimals = require('../../strategyInfo/address_mainnet/tokenDecimals.json');

let deployer : SignerWithAddress;
let governance : SignerWithAddress;
let strategist : SignerWithAddress;
let rewards : SignerWithAddress;

// contract deploy
let testSwapContract : Contract;
let uniswapV3Contract : Contract;
let quoterV3Contract : Contract;
let poolV3Contract : Contract;
let daiContract : Contract;
let mimContract : Contract;
let usdcContract : Contract;
let crvContract : Contract;

// contract address
let uniswapV3Address = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
let quoterV3Address = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";
let poolUsdcDaiV3Address = "0x6c6Bc977E13Df9b0de53b251522280BB72383700";

// token address
let daiAddress = tokenAddress.dai;
const daiDecimals = tokenDecimals.dai;
let usdcAddress = tokenAddress.usdc;
const usdcDecimals = tokenDecimals.usdc;
let crvAddress = tokenAddress.crv
const crvDecimals = tokenDecimals.crv;
let cvxAddress = tokenAddress.cvx;
const cvxDecimals = tokenDecimals.cvx;
let fraxAddress = tokenAddress.frax
const fraxDecimals = tokenDecimals.frax;
let mimAddress = tokenAddress.mim
const mimDecimals = tokenDecimals.mim;
let wethAddress = tokenAddress.weth;


let daiWhaleAddress = "0xb527a981e1d415af696936b3174f2d7ac8d11369";
let whaleAccountDai : SignerWithAddress;

let mimWhaleAddress = "";
let whaleAccountMim : SignerWithAddress;

let crvWhaleAddress = "0x32D03DB62e464c9168e41028FFa6E9a05D8C6451";
let whaleAccountCrv : SignerWithAddress;

// swap variable
let swapRoute : any;
let daiToken : any;
let usdcToken : any;
let amountIn = ethers.utils.parseEther("1")
let amountInNumber = 1;
export const MAX_FEE_PER_GAS = 100000000000
export const MAX_PRIORITY_FEE_PER_GAS = 100000000000

async function main(): Promise<void> {
    await run('compile');
    [deployer] = await ethers.getSigners();

    uniswapV3Contract = new ethers.Contract(
        uniswapV3Address,
        uniswapV3Abi,
        ethers.provider
    )

    quoterV3Contract = new ethers.Contract(
        quoterV3Address,
        quoterUniswapV3Abi,
        ethers.provider
    )

}

main()
    .then(async () => {
/*
        const sig = "purchase(uint256[1],address[1],address[1],address[1],bytes[1])"

        const args = [
            [0],
            [ZERO],
            [ZERO],
            [ZERO],
            [[]], // empty bytes
        ]

// encode func call
        const calldata = await testEncode.interface.encodeFunctionData(sig, args)

// convert to bytes
        const bytes = ethers.utils.arrayify(calldata)

        */

        const sig = "purchase(uint256[1],address[1],address[1],address[1],bytes[1])"

        let tokenIn = tokenAddress.crv;
        let tokenOut = tokenAddress.mim;
        let tokenOutDecimals = tokenDecimals.mim;
        let fee = 10000;
        let amountIn = ethers.utils.parseUnits("1", tokenDecimals.crv)
        let sqrtPriceLimitX96 = 0;

        //let types: any = ["address", "uint24", "address", "uint24", "address"];
        let types: any = ['address', 'uint24', 'address', 'uint24', 'address'];
        let data = ethers.utils.defaultAbiCoder.encode(types,[tokenIn, 10000, tokenAddress.weth, 10000, tokenOut]);

        console.log("data: ", data);

        let quote = await quoterV3Contract.callStatic.quoteExactInput(
            data,
            amountIn,
        );

        console.log("quote")
        console.log(ethers.utils.formatUnits(quote, tokenOutDecimals))

        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

