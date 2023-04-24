import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { ethers } = hardhat;

const curveInfo = require('../../../info/address_mainnet/curveAddress.json');

async function addLiquidity(operator: SignerWithAddress,
                            tokenDepositAddress: string, curveSwapAddress: string,
                            amountsToAdd: any[], minMintAmount: any,
                            urlProvider: string): Promise<any> {

    // get token deposit contract
    let tokenDeposit = await ethers.getContractAt("ERC20", tokenDepositAddress, operator);

    let poolCurveABI: any = [];
    // get abi curve swap
    if (amountsToAdd.length == 2) {
        poolCurveABI = [
            "function add_liquidity(uint[2] calldata amounts, uint min_mint_amount)",
        ];
    }
    if (amountsToAdd.length == 3) {
        poolCurveABI = [
            "function add_liquidity(uint[3] calldata amounts, uint min_mint_amount)",
        ];
    }
    if (amountsToAdd.length == 4) {
        poolCurveABI = [
            "function add_liquidity(uint[4] calldata amounts, uint min_mint_amount)",
        ];
    }

    let curveSwap = await ethers.getContractAt(poolCurveABI, curveSwapAddress, operator);
    let txApprove = await tokenDeposit.connect(operator).approve(curveSwapAddress, ethers.constants.MaxUint256);
    await txApprove.wait();

    // @ts-ignore
    return await curveSwap.connect(operator).add_liquidity(amountsToAdd, minMintAmount);
}


async function removeLiquidity(operator: SignerWithAddress,
                            lpAddress: string, curveSwapAddress: string,
                            amountsToAdd: any[], minAmountsOut: any[],
                            urlProvider: string): Promise<any> {

    // get token deposit contract
    let lpCurve = await ethers.getContractAt("ERC20", lpAddress, operator);

    let poolCurveABI: any = [];
    // get abi curve swap
    if (amountsToAdd.length == 2) {
        poolCurveABI = [
            "function removeLiquidity(uint256 _amount, uint256[2] calldata min_amounts)",
        ];
    }
    if (amountsToAdd.length == 3) {
        poolCurveABI = [
            "function removeLiquidity(uint256 _amount, uint256[3] calldata min_amounts)",
        ];
    }
    if (amountsToAdd.length == 4) {
        poolCurveABI = [
            "function removeLiquidity(uint256 _amount, uint256[4] calldata min_amounts)",
        ];
    }

    let curveSwap = await ethers.getContractAt(poolCurveABI, curveSwapAddress, operator);
    if(lpCurve.address != curveSwapAddress) {
        let txApprove = await lpCurve.connect(operator).approve(curveSwapAddress, ethers.constants.MaxUint256);
        await txApprove.wait();
    }

    // @ts-ignore
    return await curveSwap.connect(operator).add_liquidity(amountsToAdd, minAmountsOut);
}

async function removeLiquidityOneCoin(operator: SignerWithAddress, curveSwapAddress: string, amountToRemove: any, indexCoin: number, minReceiver: any): Promise<any> {
    let poolCurveABI = [
        "function remove_liquidity_one_coin(uint amounts, int128 index, uint min_mint_amounts)",
    ];
    let curveSwap = await ethers.getContractAt(poolCurveABI, curveSwapAddress, operator);
    return await curveSwap.connect(operator).remove_liquidity_one_coin(amountToRemove, indexCoin, minReceiver);
}

async function calcAmountsOutMinOneCoin(curvePoolAddress: string, amountIn: any, indexCoin: any): Promise<any> {
    let curvePool = await getCurvePool(curvePoolAddress);

    return await curvePool.calc_withdraw_one_coin(amountIn, indexCoin);
}

async function calcAmountsOutMin(curvePoolAddress: string, amountIn: any, nCoins: any): Promise<any> {
    let curvePool = await getCurvePool(curvePoolAddress);
    let slippage = 100 - 10

    let amountsOutMin: any[] = [];
    for (let i = 0; i < nCoins; i++) {
        let amountInTemp = amountIn.div(nCoins);
        console.log("Amount in temp: " + amountInTemp)
        let amountsOut = await curvePool.calc_withdraw_one_coin(amountInTemp, i);
        console.log("Amounts out index ", i, " is: " + amountsOut)
        amountsOutMin.push(amountsOut.div(100).mul(slippage))
    }
    return amountsOutMin;
}

async function getCoinsOfCurvePool(curvePoolAddress: string): Promise<any> {
    let curvePool = await getCurvePool(curvePoolAddress);
    let listCoins = [];
    try {
        let i = 0;
        while (true) {
            listCoins.push(await curvePool.coins(i));
            i++;
        }
    } catch ( error: any ) {
        return listCoins;
    }
}

async function getCurvePool(curvePoolAddress: string): Promise<Contract> {
    const [deployer] = await ethers.getSigners();
    return await ethers.getContractAt("ICurvePool", curvePoolAddress, deployer);
}

export const poolCurveTask = {
    addLiquidity: async function (account: SignerWithAddress,
                                  tokenDepositAddress: string, curveSwapAddress: string,
                                  amountsToAdd: any[], minMintAmount: any, urlProvider: string): Promise<any>{
        return await addLiquidity(
            account,
            tokenDepositAddress, curveSwapAddress,
            amountsToAdd, minMintAmount, urlProvider);
    },
    removeLiquidityOneCoin: async function (operator: SignerWithAddress, curveSwapAddress: string,
                                  amountToRemove: any, indexCoin: number, minReceiver: any): Promise<any>{
        return await removeLiquidityOneCoin(operator, curveSwapAddress, amountToRemove, indexCoin, minReceiver);
    },
    calcAmountsOutMinOneCoin: async function (curvePoolAddress: string, amountIn: any, indexCoin: any): Promise<any>{
        return await calcAmountsOutMinOneCoin(curvePoolAddress, amountIn, indexCoin);
    },
    calcAmountsOutMin: async function (curvePoolAddress: string, amountIn: any, nCoins: any): Promise<any>{
        return await calcAmountsOutMin(curvePoolAddress, amountIn, nCoins);
    },
    getCoinsOfCurvePool: async function (curvePoolAddress: string): Promise<any>{
        return await getCoinsOfCurvePool(curvePoolAddress);
    },
};
