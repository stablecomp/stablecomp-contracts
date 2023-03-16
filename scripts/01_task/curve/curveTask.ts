import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {utilsTask} from "../standard/utilsTask";

const { ethers } = hardhat;

const tokenInfo = require('../../../info/address_mainnet/tokenInfo.json');
const routerInfo = require('../../../info/address_mainnet/routerAddress.json');
const curveInfo = require('../../../info/address_mainnet/curveAddress.json');

// STRATEGIES FUNCTION
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

    return await curveSwap.connect(operator).add_liquidity(amountsToAdd, minMintAmount);
}

// STRATEGIES FUNCTION
async function removeLiquidityOneCoin(operator: SignerWithAddress, curveSwapAddress: string, amountToRemove: any, indexCoin: number, minReceiver: any): Promise<any> {
    let poolCurveABI = [
        "function remove_liquidity_one_coin(uint amounts, int128 index, uint min_mint_amounts)",
    ];
    let curveSwap = await ethers.getContractAt(poolCurveABI, curveSwapAddress, operator);
    return await curveSwap.connect(operator).remove_liquidity_one_coin(amountToRemove, indexCoin, minReceiver);
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
};
