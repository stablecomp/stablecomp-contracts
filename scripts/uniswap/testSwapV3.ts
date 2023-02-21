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
let daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"; // DAI
const daiDecimals = 18; // DAI
let usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC
const usdcDecimals = 6; // usdc
let crvAddress = "0xD533a949740bb3306d119CC777fa900bA034cd52"
const crvDecimals = 18;
let cvxAddress = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B"
const cvxDecimals = 18;
let fraxAddress = "0x853d955aCEf822Db058eb8505911ED77F175b99e"
const fraxDecimals = 18;
let mimAddress = "0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3"
const mimDecimals = 18;
let wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";


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

// token
const fraxToken = new Token(
    SupportedChainId.MAINNET,
    fraxAddress,
    fraxDecimals,
    'frax',
    'frax'
)

const mimToken = new Token(
    SupportedChainId.MAINNET,
    mimAddress,
    mimDecimals,
    'Magic internet money',
    'MIM'
)

const crvToken = new Token(
    SupportedChainId.MAINNET,
    crvAddress,
    crvDecimals,
    'crv',
    'Curve token'
)

const cvxToken = new Token(
    SupportedChainId.MAINNET,
    cvxAddress,
    cvxDecimals,
    'cvx',
    'Convex token'
)


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

    poolV3Contract = new ethers.Contract(
        poolUsdcDaiV3Address,
        poolUniswapV3Abi,
        ethers.provider
    )

    daiContract = new ethers.Contract(
        daiAddress,
        erc20ABI,
        ethers.provider
    )

    mimContract = new ethers.Contract(
        mimAddress,
        erc20ABI,
        ethers.provider
    )

    usdcContract = new ethers.Contract(
        usdcAddress,
        erc20ABI,
        ethers.provider
    )

    crvContract = new ethers.Contract(
        crvAddress,
        erc20ABI,
        ethers.provider
    )

    await impersonateAccount();

}

async function executeSwap(): Promise<void> {
    let balanceMimBefore = await mimContract.balanceOf(deployer.address);
    let txApprove = await crvContract.connect(deployer).approve(testSwapContract.address, ethers.constants.MaxUint256)
    await txApprove.wait();
    //let tx = await testSwapContract.swapExactInputSingle(daiAddress, ethers.utils.parseEther("1"))
    //await tx.wait();

    let txMultiSwap = await testSwapContract.swapExactInputMultihop(crvAddress, ethers.utils.parseEther("1")    )
    await txMultiSwap.wait();
    let balanceMimAfter = await mimContract.balanceOf(deployer.address);

    let diff = balanceMimAfter.sub(balanceMimBefore);
    console.log("Balance before swap: ", ethers.utils.formatEther(balanceMimBefore),
        " \nbalance after swap: ", ethers.utils.formatEther(balanceMimAfter),
        " \ndiff: ", ethers.utils.formatEther(diff))
}

async function getContractTestUniswapV3(): Promise<void> {
    let factory = await ethers.getContractFactory("TestSwap");
    testSwapContract = await factory.deploy();
    await testSwapContract.deployed();

}

async function impersonateAccount(): Promise<void> {
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [daiWhaleAddress],
    });
    whaleAccountDai = await ethers.getSigner(daiWhaleAddress);

    await fundAccountETH(whaleAccountDai);

    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [crvWhaleAddress],
    });
    whaleAccountCrv = await ethers.getSigner(crvWhaleAddress);

    await fundAccountETH(whaleAccountDai);
    await fundAccountETH(whaleAccountCrv);
}

async function fundAccountETH(account: SignerWithAddress): Promise<void> {
    await deployer.sendTransaction({
        from: deployer.address,
        to: account.address,
        value: ethers.utils.parseEther("1"), // Sends exactly 1.0 ether
    });
}

async function fundAccountDai(account: SignerWithAddress): Promise<void> {

    let tx = await daiContract.connect(whaleAccountDai).transfer(account.address, await daiContract.balanceOf(whaleAccountDai.address));
    await tx.wait();
}

async function fundAccountMim(account: SignerWithAddress): Promise<void> {

    let tx = await mimContract.connect(whaleAccountDai).transfer(account.address, await mimContract.balanceOf(whaleAccountMim.address));
    await tx.wait();
}

async function fundAccountCrv(account: SignerWithAddress): Promise<void> {

    let tx = await crvContract.connect(whaleAccountCrv).transfer(account.address, await crvContract.balanceOf(whaleAccountCrv.address));
    await tx.wait();
}

main()
    .then(async () => {
        await getContractTestUniswapV3();
        //await fundAccountDai(deployer)
        await fundAccountCrv(deployer)
        await executeSwap();



        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

