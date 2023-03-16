import hardhat, {network} from 'hardhat';
const { run, ethers } = hardhat;
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {Pool, Route, SwapOptions, SwapQuoter, SwapRouter, Trade} from "@uniswap/v3-sdk";
import {CurrencyAmount, Percent, SupportedChainId, Token, TradeType} from "@uniswap/sdk-core";
import {AlphaRouter, ChainId, SwapType, SwapOptionsUniversalRouter} from '@uniswap/smart-order-router'

import JSBI from 'jsbi'
import {BigNumber} from "ethers";

const uniswapV3Abi = require('../../../info/abi/uniswapV3ABI.json');
const quoterUniswapV3Abi = require('../../../info/abi/quoterUniswapV3.json');
const poolUniswapV3Abi = require('../../../info/abi/poolUniswapV3.json');
const erc20ABI = require('../../../info/abi/erc20.json');

const tokenInfo = require('../../../info/address_mainnet/tokenInfo.json');
const routerAddress = require('../../../info/address_mainnet/routerAddress.json');

let deployer : SignerWithAddress;

// contract deploy
let uniswapV3Contract : Contract;
let quoterV3Contract : Contract;
let poolV3Contract : Contract;
let daiContract : Contract;
let usdcContract : Contract;

// contract address
let poolUsdcDaiV3Address = "0x6c6Bc977E13Df9b0de53b251522280BB72383700";

let daiWhaleAddress = "0xb527a981e1d415af696936b3174f2d7ac8d11369";
let whaleDaiAccount : SignerWithAddress;

// swap variable
let swapRoute : any;
let amountInNumber = 1;
export const MAX_FEE_PER_GAS = 100000000000
export const MAX_PRIORITY_FEE_PER_GAS = 100000000000

// token
const fraxToken = new Token(
    SupportedChainId.MAINNET,
    tokenInfo.frax.address,
    tokenInfo.frax.decimals,
    'frax',
    'frax'
)

const mimToken = new Token(
    SupportedChainId.MAINNET,
    tokenInfo.mim.address,
    tokenInfo.mim.decimals,
    'Magic internet money',
    'MIM'
)

const crvToken = new Token(
    SupportedChainId.MAINNET,
    tokenInfo.crv.address,
    tokenInfo.crv.decimals,
    'crv',
    'Curve token'
)

const cvxToken = new Token(
    SupportedChainId.MAINNET,
    tokenInfo.cvx.address,
    tokenInfo.cvx.decimals,
    'cvx',
    'Convex token'
)


async function main(): Promise<void> {
    await run('compile');
    [deployer] = await ethers.getSigners();

    uniswapV3Contract = new ethers.Contract(
        routerAddress.uniswapV3,
        uniswapV3Abi,
        ethers.provider
    )

    quoterV3Contract = new ethers.Contract(
        routerAddress.quoter,
        quoterUniswapV3Abi,
        ethers.provider
    )

    poolV3Contract = new ethers.Contract(
        poolUsdcDaiV3Address,
        poolUniswapV3Abi,
        ethers.provider
    )

    daiContract = new ethers.Contract(
        tokenInfo.dai.address,
        erc20ABI,
        ethers.provider
    )

    usdcContract = new ethers.Contract(
        tokenInfo.usdc.address,
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
    whaleDaiAccount = await ethers.getSigner(daiWhaleAddress);

    await fundAccountETH(whaleDaiAccount);
}

async function fundAccountETH(account: SignerWithAddress): Promise<void> {
    await deployer.sendTransaction({
        from: deployer.address,
        to: account.address,
        value: 1, // Sends exactly 1.0 ether
    });
}

async function fundAccountDai(): Promise<void> {

    let tx = await daiContract.connect(whaleDaiAccount).transfer(deployer.address, await daiContract.balanceOf(whaleDaiAccount.address));
    await tx.wait();
}

async function getRoutingSwap(tokenIn : Token, tokenOut: Token, amountIn: any): Promise<any> {

    let provider  = new ethers.providers.JsonRpcProvider(
        "https://mainnet.infura.io/v3/899c81095bc24dc2b06d43b6c2b65b8a"
    )

    const router = new AlphaRouter({
        chainId: ChainId.MAINNET,
        provider: provider,
    })

    const options: SwapOptionsUniversalRouter = {
        recipient: deployer.address,
        slippageTolerance: new Percent(5, 100),
        type: SwapType.UNIVERSAL_ROUTER,
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
        options
    );

}

async function getBestQuote(tokenIn: Token, tokenOut: Token, amountIn: any): Promise<any> {

    let route = await getRoutingSwap(tokenIn, tokenOut, amountIn);

    console.log(route)
    return route?.route[0];

}

async function checkBalance(account: SignerWithAddress): Promise<void> {

    let balanceDai = await daiContract.balanceOf(account.address);
    let balanceUsdc = await usdcContract.balanceOf(account.address);

    console.log("Balance of dai is: ", ethers.utils.formatUnits(balanceDai, tokenInfo.dai.decimals))
    console.log("Balance of usdc is: ", ethers.utils.formatUnits(balanceUsdc, tokenInfo.usdc.decimals))

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


            let amountInNumber = 1
            let sqrtPriceX96 = slot0DaiUsdc[0];
            let tick = slot0DaiUsdc[1];

            const daiToken = new Token(
                SupportedChainId.MAINNET,
                DAI,
                tokenInfo.dai.decimals,
                'DAI',
                'DAI'
            )

            const usdcToken = new Token(
                SupportedChainId.MAINNET,
                usdc,
                tokenInfo.usdc.decimals,
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
                        tokenInfo.dai.decimals
                    )
                ),
                TradeType.EXACT_INPUT,
                {
                    useQuoterV2: false,
                }
            )

            const quoteCallReturnData = await ethers.provider.call({
                to: routerAddress.quoter,
                data: calldata,
            })

            let quote = ethers.utils.defaultAbiCoder.decode(['uint256'], quoteCallReturnData)

            console.log("Quote calculated is: ", ethers.utils.formatUnits(quote[0], tokenInfo.usdc.decimals))

            return quote;

        }

    } else {
        return {};
    }
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

    console.log("Quoted amount out is: ", ethers.utils.formatUnits(quotedAmountOut1, tokenInfo.usdc.decimals));

    return quotedAmountOut1;

}

async function executeTrade(tokenInAddress: any, amountIn : any, amountInDecimals: any, tokenOutAddress: any, amountOut: any): Promise<void> {


    const daiToken = new Token(
        SupportedChainId.MAINNET,
        tokenInfo.dai.address,
        tokenInfo.dai.decimals,
        'DAI',
        'DAI'
    )

    const usdcToken = new Token(
        SupportedChainId.MAINNET,
        tokenInfo.usdc.address,
        tokenInfo.usdc.decimals,
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

        let route: any = await getBestQuote(crvToken, mimToken, amountInNumber);

        await fundAccountDai();

        await checkBalance(deployer);

        let amountOut = await getOutputQuote(route.poolAddress, amountInNumber);
        await executeTrade(tokenInfo.dai.address, amountInNumber, tokenInfo.dai.decimals, tokenInfo.usdc.address, amountOut);

        await checkBalance(deployer);
        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

