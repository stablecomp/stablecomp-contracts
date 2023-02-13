import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {Pool, Route, SwapOptions, SwapQuoter, SwapRouter, Trade} from "@uniswap/v3-sdk";
import {CurrencyAmount, Percent, SupportedChainId, Token, TradeType} from "@uniswap/sdk-core";
import {AlphaRouter, ChainId, SwapOptionsSwapRouter02, SwapType} from '@uniswap/smart-order-router'

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
let uniswapV3Contract : Contract;
let quoterV3Contract : Contract;
let poolV3Contract : Contract;
let daiContract : Contract;
let usdcContract : Contract;

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

let daiWhaleAddress = "0xb527a981e1d415af696936b3174f2d7ac8d11369";
let whaleAccount : SignerWithAddress;

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

    usdcContract = new ethers.Contract(
        usdcAddress,
        erc20ABI,
        ethers.provider
    )

    await impersonateAccount();

}

async function impersonateAccount(): Promise<void> {
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [daiWhaleAddress],
    });
    whaleAccount = await ethers.getSigner(daiWhaleAddress);

    await fundAccountETH(whaleAccount);
}

async function fundAccountETH(account: SignerWithAddress): Promise<void> {
    await deployer.sendTransaction({
        from: deployer.address,
        to: account.address,
        value: 1, // Sends exactly 1.0 ether
    });
}

async function fundAccountDai(account: SignerWithAddress): Promise<void> {

    let tx = await daiContract.connect(whaleAccount).transfer(deployer.address, await daiContract.balanceOf(whaleAccount.address));
    await tx.wait();
}

async function getRoutingSwap(amountIn: any): Promise<any> {

    const fraxToken = new Token(
        SupportedChainId.MAINNET,
        fraxAddress,
        fraxDecimals,
        'frax',
        'frax'
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

    let provider  = new ethers.providers.JsonRpcProvider(
        "https://mainnet.infura.io/v3/899c81095bc24dc2b06d43b6c2b65b8a"
    )

    const router = new AlphaRouter({
        chainId: ChainId.MAINNET,
        provider: provider,
    })

    const options: SwapOptionsSwapRouter02 = {
        recipient: deployer.address,
        slippageTolerance: new Percent(5, 100),
        deadline: Math.floor(Date.now() / 1000 + 1800),
        type: SwapType.SWAP_ROUTER_02,
    }

    return await router.route(
        CurrencyAmount.fromRawAmount(
            crvToken,
            fromReadableAmount(
                amountIn,
                daiDecimals
            ).toString()
        ),
        fraxToken,
        TradeType.EXACT_INPUT,
        options
    );

}

async function getBestQuote(amountIn: any): Promise<void> {

    let route = await getRoutingSwap(amountIn);
    let poolAddress = route?.route[0].poolAddresses;


    console.log(poolAddress);



}

async function checkBalance(account: SignerWithAddress): Promise<void> {

    let balanceDai = await daiContract.balanceOf(account.address);
    let balanceUsdc = await usdcContract.balanceOf(account.address);

    console.log("Balance of dai is: ", ethers.utils.formatUnits(balanceDai, daiDecimals))
    console.log("Balance of usdc is: ", ethers.utils.formatUnits(balanceUsdc, usdcDecimals))

}

async function getOutputQuote(poolAddress: any, amountIn: any): Promise<any> {

    if (poolAddress.length > 0) {

        for (let i = 0; i < poolAddress.length; i++) {

            poolV3Contract = new ethers.Contract(
                poolAddress[i],
                poolUniswapV3Abi,
                ethers.provider
            )

            // get params pool
            const [DAI, usdc, feeDaiUsdc, tickSpacingDaiUsdc, liquidityDaiUsdc, slot0DaiUsdc] = await Promise.all([
                poolV3Contract.token0(),
                poolV3Contract.token1(),
                poolV3Contract.fee(),
                poolV3Contract.tickSpacing(),
                poolV3Contract.liquidity(),
                poolV3Contract.slot0(),
            ])


        }

    } else {
        return {};
    }

    let amountInNumber = 1
    let sqrtPriceX96 = slot0DaiUsdc[0];
    let tick = slot0DaiUsdc[1];

    const daiToken = new Token(
        SupportedChainId.MAINNET,
        DAI,
        daiDecimals,
        'DAI',
        'DAI'
    )

    const usdcToken = new Token(
        SupportedChainId.MAINNET,
        usdc,
        usdcDecimals,
        'USDC',
        'USD//C'
    )

    const pool = new Pool(
        daiToken,
        usdcToken,
        feeDaiUsdc,
        sqrtPriceX96.toString(),
        liquidityDaiUsdc.toString(),
        tick
    )

    swapRoute = new Route(
        [pool],
        daiToken,
        usdcToken
    )

    const { calldata } = await SwapQuoter.quoteCallParameters(
        swapRoute,
        CurrencyAmount.fromRawAmount(
            daiToken,
            fromReadableAmount(
                amountIn,
                daiDecimals
            )
        ),
        TradeType.EXACT_INPUT,
        {
            useQuoterV2: false,
        }
    )

    const quoteCallReturnData = await ethers.provider.call({
        to: quoterV3Address,
        data: calldata,
    })

    let quote = ethers.utils.defaultAbiCoder.decode(['uint256'], quoteCallReturnData)

    console.log("Quote calculated is: ", ethers.utils.formatUnits(quote[0], usdcDecimals))

    return quote;
}

async function getOutputQuoteOnChain(amountIn: any): Promise<BigNumber> {

    // get params pool
    const [DAI, usdc, feeDaiUsdc, tickSpacingDaiUsdc, liquidityDaiUsdc, slot0DaiUsdc] = await Promise.all([
        poolV3Contract.token0(),
        poolV3Contract.token1(),
        poolV3Contract.fee(),
        poolV3Contract.tickSpacing(),
        poolV3Contract.liquidity(),
        poolV3Contract.slot0(),
    ])

    const quotedAmountOut1 = await quoterV3Contract.callStatic.quoteExactInputSingle(
        DAI,
        usdc,
        feeDaiUsdc,
        amountIn,
        0
    )

    console.log("Quoted amount out is: ", ethers.utils.formatUnits(quotedAmountOut1, usdcDecimals));

    return quotedAmountOut1;

}

async function executeTrade(tokenInAddress: any, amountIn : any, amountInDecimals: any, tokenOutAddress: any, amountOut: any): Promise<void> {


    const daiToken = new Token(
        SupportedChainId.MAINNET,
        daiAddress,
        daiDecimals,
        'DAI',
        'DAI'
    )

    const usdcToken = new Token(
        SupportedChainId.MAINNET,
        usdcAddress,
        usdcDecimals,
        'USDC',
        'USD//C'
    )

    const uncheckedTrade = Trade.createUncheckedTrade({
        route: swapRoute,
        inputAmount: CurrencyAmount.fromRawAmount(
            daiToken,
            fromReadableAmount(
                amountIn,
                amountInDecimals
            ).toString()
        ),
        outputAmount: CurrencyAmount.fromRawAmount(
            usdcToken,
            JSBI.BigInt(amountOut)
        ),
        tradeType: TradeType.EXACT_INPUT,
    })

    // approve
    let tx = await daiContract.connect(deployer).approve(uniswapV3Contract.address, ethers.constants.MaxUint256);
    await tx.wait();

    const options: SwapOptions = {
        slippageTolerance: new Percent(500, 10000), // 50 bips, or 0.50%
        deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
        recipient: deployer.address,
    }

    const methodParameters = SwapRouter.swapCallParameters([uncheckedTrade], options)

    tx = {
        data: methodParameters.calldata,
        to: uniswapV3Contract.address,
        value: methodParameters.value,
        from: deployer.address,
        maxFeePerGas: MAX_FEE_PER_GAS,
        maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
    }

    //const transactionSigned = await deployer.signTransaction(tx);

    //const res = await ethers.provider.sendTransaction(transactionSigned)

    let wallet = await createWallet();
    const txRes = await wallet.sendTransaction(tx)


    //console.log("Res transaction: ", txRes);
}

async function createWallet(): Promise<any> {
    //let provider = await new ethers.providers.JsonRpcProvider("http://localhost:8545")
    return await new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", ethers.provider)
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

main()
    .then(async () => {
        console.log("Deployer address: ",  deployer.address)
        let initialBalance:any = await deployer.getBalance();

        console.log("Initial balance: ", initialBalance)

        await getBestQuote(amountInNumber);
        /*
        await fundAccountDai(whaleAccount);

        await checkBalance(deployer);

        let amountOut = await getOutputQuote(amountInNumber);
        await executeTrade(daiAddress, amountInNumber, daiDecimals, usdcAddress, amountOut);

        await checkBalance(deployer);
*/
        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

