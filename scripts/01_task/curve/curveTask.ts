import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import curve from "@curvefi/api";
import process from "process";
import fs from "fs";

const { ethers } = hardhat;

const curveInfo = require('../../../info/address_mainnet/curveAddress.json');
const curveSwapRouterABI = require('../../../info/abi/curveSwapRouter.json')
let tokenInfo = require("../../../info/address_mainnet/tokenInfo.json")

async function addLiquidity(operator: SignerWithAddress,
                            tokenDepositAddress: string, curveSwapAddress: string,
                            amountsToAdd: any[], minMintAmount: any,
                            ): Promise<any> {

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
    if (curveSwapAddress.toLowerCase() == curveInfo.pool.pyusdUsdc.toLowerCase() || curveSwapAddress.toLowerCase() == curveInfo.pool.fraxsDai.toLowerCase()) {
        poolCurveABI = [
            "function add_liquidity(uint[] calldata amounts, uint min_mint_amount)",
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
                            amountsToAdd: any[], minAmountsOut: any[]): Promise<any> {

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
    if (curveSwapAddress.toLowerCase() == curveInfo.pool.pyusdUsdc) {
        poolCurveABI = [
            "function removeLiquidity(uint256 _amount, uint256[] calldata min_amounts)",
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

async function calcAmountOutMinAdd(curvePoolAddress: string, versionStrategy: string, listAmount: any[], slippage: any): Promise<any> {
    const [deployer] = await ethers.getSigners();

    let amountOutCurve : any;
    if (versionStrategy == "1.0" || versionStrategy == "1.1") {
        let poolCurveABI: any;
        if (listAmount.length == 2) {
            poolCurveABI = [
                {"name":"calc_token_amount","outputs":[{"type":"uint256","name":""}],"inputs":[{"type":"uint256[2]","name":"_amounts"},{"type":"bool","name":"_is_deposit"}],"stateMutability":"view","type":"function"}
            ];
        } else if (listAmount.length == 3 ) {
            poolCurveABI = [
                {"name":"calc_token_amount","outputs":[{"type":"uint256","name":""}],"inputs":[{"type":"uint256[3]","name":"_amounts"},{"type":"bool","name":"_is_deposit"}],"stateMutability":"view","type":"function"}
            ];
        } else if (listAmount.length == 4 ) {
            poolCurveABI = [
                {"name":"calc_token_amount","outputs":[{"type":"uint256","name":""}],"inputs":[{"type":"uint256[4]","name":"_amounts"},{"type":"bool","name":"_is_deposit"}],"stateMutability":"view","type":"function"}
            ];
        } else {
            throw new Error("List amount length invalid")
        }
        let curvePool = await ethers.getContractAt(poolCurveABI, curvePoolAddress, deployer);
        amountOutCurve = await curvePool.calc_token_amount(listAmount, true);
    } else if (versionStrategy == "1.2") {
        let poolCurveABI: any;
        if (listAmount.length == 2) {
            poolCurveABI = [
                {"stateMutability":"view","type":"function","name":"calc_token_amount","inputs":[{"name":"amounts","type":"uint256[2]"}],"outputs":[{"name":"","type":"uint256"}]}
            ];
        } else if (listAmount.length == 3 ) {
            poolCurveABI = [
                {"stateMutability":"view","type":"function","name":"calc_token_amount","inputs":[{"name":"amounts","type":"uint256[3]"}],"outputs":[{"name":"","type":"uint256"}]}
            ];
        } else if (listAmount.length == 4 ) {
            poolCurveABI = [
                {"stateMutability":"view","type":"function","name":"calc_token_amount","inputs":[{"name":"amounts","type":"uint256[4]"}],"outputs":[{"name":"","type":"uint256"}]}
            ];
        } else {
            throw new Error("List amount length invalid")
        }
        let curvePool = await ethers.getContractAt(poolCurveABI, curvePoolAddress, deployer);
        amountOutCurve = await curvePool.calc_token_amount(listAmount);
    } else {
        throw new Error("Version strategy invalid")
    }

    return amountOutCurve;
}

async function calcAmountsOutMinRemove(curvePoolAddress: string, listAmount: any[], listSlippage: any, oneCoin: boolean): Promise<any> {
    const [deployer] = await ethers.getSigners();
    let curvePool = await getCurvePool(curvePoolAddress);

    let amountsOutMin: any[] = [];
    for (let i = 0; i < listAmount.length; i++) {
        console.log("Amount in temp: " + listAmount[i])
        if (listAmount[i] > 0 ) {
            if (oneCoin) {
                let poolCurveABI;
                try {
                    poolCurveABI = [
                        {"name":"calc_withdraw_one_coin","outputs":[{"type":"uint256","name":""}],"inputs":[{"type":"uint256","name":"_burn_amount"},{"type":"int128","name":"i"}],"stateMutability":"view","type":"function"}
                    ];
                    let curvePool = await ethers.getContractAt(poolCurveABI, curvePoolAddress, deployer);

                    let amountsOut = await curvePool.calc_withdraw_one_coin(listAmount[i], i);
                    amountsOutMin.push(amountsOut.div(100).mul(listSlippage[i]))

                } catch (error: any) {
                    try {
                        poolCurveABI = [
                            {"stateMutability": "view", "type": "function", "name": "calc_withdraw_one_coin", "inputs": [{"name": "token_amount", "type": "uint256"}, {"name": "i", "type": "uint256"}], "outputs": [{"name": "", "type": "uint256"}]}
                        ];
                        let curvePool = await ethers.getContractAt(poolCurveABI, curvePoolAddress, deployer);

                        let amountsOut = await curvePool.calc_withdraw_one_coin(listAmount[i], i);
                        amountsOutMin.push(amountsOut.div(100).mul(listSlippage[i]))
                    } catch (error: any) {
                        console.log("error")
                        console.log(error)
                        throw new Error("Unhandled version of calc withdraw one coin.")
                    }
                }
            } else {
                // todo calc amount out balanced
            }
        } else {
            amountsOutMin.push(0)
        }
        console.log("Amounts out index ", i, " is: " + amountsOutMin[i])
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

// SWAP ROUTER
/*

     @notice Perform up to four swaps in a single transaction
     @dev Routing and swap params must be determined off-chain. This
     functionality is designed for gas efficiency over ease-of-use.
     @param _route Array of [initial token, pool, token, pool, token, ...]
     The array is iterated until a pool address of 0x00, then the last
     given token is transferred to `_receiver`
     @param _swap_params Multidimensional array of [i, j, swap type] where i and j are the correct
     values for the n'th pool in `_route`. The swap type should be
     1 for a stableswap `exchange`,
     2 for stableswap `exchange_underlying`,
     3 for a cryptoswap `exchange`,
     4 for a cryptoswap `exchange_underlying`,
     5 for factory metapools with lending base pool `exchange_underlying`,
     6 for factory crypto-meta pools underlying exchange (`exchange` method in zap),
     7-11 for wrapped coin (underlying for lending or fake pool) -> LP token "exchange" (actually `add_liquidity`),
     12-14 for LP token -> wrapped coin (underlying for lending pool) "exchange" (actually `remove_liquidity_one_coin`)
     15 for WETH -> ETH "exchange" (actually deposit/withdraw)
 */
async function exchangeMultiple(accountOperator: SignerWithAddress,
                                amountIn: any, route: string[],
                                swapParams: any[][], poolAddress: string[],
                                receiver: string): Promise<any> {
    let swapRouter: Contract = await getSwapRouter();

    let tx = await swapRouter.connect(accountOperator).exchange_multiple(route, swapParams, amountIn, 0, poolAddress, receiver);
    await tx.wait();
}

async function getSwapRouter(): Promise<Contract> {
    const [deployer] = await ethers.getSigners();
    return await ethers.getContractAt(curveSwapRouterABI, curveInfo.swapRouter, deployer);
}

// SDK

async function getBestQuoteSwapOneClick(inputToken: string, outputToken: string, amountIn: string | number): Promise<BestQuoteStruct>{
    let bestQuote : BestQuoteStruct = <BestQuoteStruct>{};
    bestQuote.versionProtocol = "Curve"
    if (inputToken == ethers.constants.AddressZero) {
        inputToken = "ETH"
    }
    if (outputToken == ethers.constants.AddressZero) {
        outputToken = "ETH"
    }
    await curve.init(
        'JsonRpc',
        { url: process.env.ETH_MAINNET_URL, privateKey: process.env.PRIVATE_KEY },
        { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0, chainId: 1 }
    );
    await curve.factory.fetchPools();
    await curve.cryptoFactory.fetchPools();

    const { route, output } = await curve.router.getBestRouteAndOutput(inputToken, outputToken, amountIn)
    bestQuote.output = output;

    let routeList : any[] = [];
    let swapParamList : any[] = [];
    let poolAddressList : any[] = [];

    for (let i = 0; i < route.length; i++) {

        routeList.push(route[i].inputCoinAddress)
        routeList.push(route[i].poolAddress);
        if (i == route.length -1 ) {
            routeList.push(route[route.length -1].outputCoinAddress);
        }

        let swapParam : any[] = []
        swapParam[0] = route[i].i; // indice coin ingresso
        swapParam[1] = route[i].j; // indice coin uscita
        swapParam[2] = route[i].swapType; // azione da eseguire
        swapParamList.push(swapParam);

        poolAddressList.push(route[i].swapAddress);
    }

    if (routeList.length > 0) {
        bestQuote.coinPath = formatCoinPath(routeList);

        let infoSwap  = await formatDataCurve(routeList, swapParamList, poolAddressList);
        bestQuote.pathEncoded = encodePathCurve(infoSwap.routeList, infoSwap.swapParamList, infoSwap.poolAddressList);
        return bestQuote;
    } else {
        return bestQuote;
    }

}

async function getBestQuoteSwapCurve(inputToken: string, outputToken: string, amountIn: string | number): Promise<any>{
    if (inputToken == ethers.constants.AddressZero) {
        inputToken = "ETH"
    }
    if (outputToken == ethers.constants.AddressZero) {
        outputToken = "ETH"
    }
    await curve.init(
        'JsonRpc',
        { url: process.env.ETH_MAINNET_URL },
        { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0, chainId: 1 }
    );
    await curve.factory.fetchPools();
    await curve.cryptoFactory.fetchPools();

    const { route, output } = await curve.router.getBestRouteAndOutput(inputToken, outputToken, amountIn)

    let routeList : any[] = [];
    let swapParamList : any[] = [];
    let poolAddressList : any[] = [];

    for (let i = 0; i < route.length; i++) {

        routeList.push(route[i].inputCoinAddress)
        routeList.push(route[i].poolAddress);
        if (i == route.length -1 ) {
            routeList.push(route[route.length -1].outputCoinAddress);
        }

        let swapParam : any[] = []
        swapParam[0] = route[i].i; // indice coin ingresso
        swapParam[1] = route[i].j; // indice coin uscita
        swapParam[2] = route[i].swapType; // azione da eseguire
        swapParamList.push(swapParam);

        poolAddressList.push(route[i].swapAddress);
    }

    return await formatDataCurve(routeList, swapParamList, poolAddressList);

}
function formatCoinPath(routeList: any[]) {
    let coinPath: any[] = [];
    for(let i = 0; i < routeList.length; i++) {
        if(i%2 == 0) {
            if (routeList[i].toString().toUpperCase() != ethers.constants.AddressZero.toUpperCase()){
                coinPath.push(routeList[i]);
            }
        }
    }
    return coinPath;
}

function encodePathCurve(routeList: any[], swapParams: any[][], poolAddress: any[]) {
    let encoded = '0x'
    for (let i = 0; i < routeList.length; i++) {
        // 20 byte encoding of the address
        encoded += String(routeList[i]).slice(2)
    }
    for (let i = 0; i < swapParams.length; i++) {
        let swapParamsSingle = swapParams[i];
        for (let j = 0; j < swapParamsSingle.length; j++) {
            // 1 byte encoding for swap params single
            encoded += swapParams[i][j] < 10 ? "0"+String(swapParams[i][j]):String(swapParams[i][j]);
        }
    }
    for (let i = 0; i < poolAddress.length; i++) {
        // 20 byte encoding of the address
        encoded += String(poolAddress[i]).slice(2)
    }

    return encoded.toLowerCase()
}

async function getBestRateForMultiplePools(inputToken: string, outputToken: string, amountIn: string | number) {
    await curve.init(
        'JsonRpc',
        { url: process.env.ETH_MAINNET_URL, privateKey: process.env.PRIVATE_KEY },
        { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0, chainId: 1 }
    );
    await curve.factory.fetchPools();
    await curve.cryptoFactory.fetchPools();
    return await curve.router.getBestRouteAndOutput(inputToken, outputToken, amountIn)
}

export const taskPoolCurve = {
    addLiquidity: async function (account: SignerWithAddress,
                                  tokenDepositAddress: string, curveSwapAddress: string,
                                  amountsToAdd: any[], minMintAmount: any): Promise<any>{
        return await addLiquidity(
            account,
            tokenDepositAddress, curveSwapAddress,
            amountsToAdd, minMintAmount);
    },
    calcAmountOutMinAdd: async function (curvePoolAddress: string, versionStrategy: string, listAmountRemoveLiquidity: any[], slippage: any): Promise<any>{
        return await calcAmountOutMinAdd(curvePoolAddress, versionStrategy, listAmountRemoveLiquidity, slippage);
    },
    removeLiquidityOneCoin: async function (operator: SignerWithAddress, curveSwapAddress: string,
                                  amountToRemove: any, indexCoin: number, minReceiver: any): Promise<any>{
        return await removeLiquidityOneCoin(operator, curveSwapAddress, amountToRemove, indexCoin, minReceiver);
    },
    calcAmountsOutMinOneCoin: async function (curvePoolAddress: string, amountIn: any, indexCoin: any): Promise<any>{
        return await calcAmountsOutMinOneCoin(curvePoolAddress, amountIn, indexCoin);
    },
    calcAmountsOutMinRemove: async function (curvePoolAddress: string, listAmountRemoveLiquidity: any[], listSlippage: any[], versionStrategy: any): Promise<any>{
        return await calcAmountsOutMinRemove(curvePoolAddress, listAmountRemoveLiquidity, listSlippage, versionStrategy);
    },
    getCoinsOfCurvePool: async function (curvePoolAddress: string): Promise<any>{
        return await getCoinsOfCurvePool(curvePoolAddress);
    },
};

export const taskSwapRouterCurve = {
    exchangeMultiple: async function (accountOperator: SignerWithAddress,
                                      amountIn: any, route: string[],
                                      swapParams: any[][], poolAddress: any[],
                                      receiver: string): Promise<any>{
        return await exchangeMultiple(
            accountOperator, amountIn, route, swapParams, poolAddress, receiver
        );
    },
};

async function writeBestQuoteCurve(nameQuote: string, route: any[]): Promise<any> {
    let infoPath = "./info"
    if (!fs.existsSync(infoPath)) {
        fs.mkdirSync(infoPath);
    }
    let quotePath = infoPath+"/bestQuote/"
    if (!fs.existsSync(quotePath)) {
        fs.mkdirSync(quotePath);
    }

    let path = quotePath + nameQuote+".json"

    let routeList = [];
    let swapParamList = [];
    let poolAddressList = [];
    for (let i = 0; i < route.length; i++) {

        routeList.push(route[i].inputCoinAddress)
        routeList.push(route[i].poolAddress);

        let swapParam : any[] = []
        swapParam[0] = route[i].i;
        swapParam[1] = route[i].j;
        swapParam[2] = route[i].swapType;
        swapParamList.push(swapParam);

        poolAddressList.push(route[i].swapAddress);
    }
    routeList.push(route[route.length -1].outputCoinAddress);

    routeList, swapParamList, poolAddressList  = await formatDataCurve(routeList, swapParamList, poolAddressList);

    let jsonData = {
        coinPath: routeList,
        feePath: [],
        swapParams: swapParamList,
        poolAddress: poolAddressList,
        swapType: 3
    }

    let data = JSON.stringify(jsonData);
    fs.writeFileSync(path, data);
}

async function formatDataCurve(routeList: any[], swapParamList: any[][], poolAddressList: any[]): Promise<any> {
    // format data
    let initialLength = routeList.length;
    if (routeList.length < 9) {
        for (let i = 0; i < 9 - initialLength; i++) {
            routeList.push(ethers.constants.AddressZero);
        }
    }
    initialLength = swapParamList.length;
    if (swapParamList.length < 4) {
        for (let i = 0; i < 4 - initialLength; i++) {
            swapParamList.push([0,0,0]);
        }
    }
    initialLength = poolAddressList.length;
    if (poolAddressList.length < 4) {
        for (let i = 0; i < 4 - initialLength; i++) {
            poolAddressList.push(ethers.constants.AddressZero);
        }
    }

    return {routeList, swapParamList, poolAddressList};

}

export interface BestQuoteStruct {
    coinPath: string[],
    feePath: any[],
    pathEncoded: string,
    versionProtocol: string,
    output: any
}
export const taskSdkCurve = {
    getBestRateForMultiplePools: async function (inputToken: string, outputToken: string, amountIn: string | number): Promise<any>{
        return await getBestRateForMultiplePools(inputToken, outputToken, amountIn);
    },
    getBestQuoteSwapOneClick: async function (inputToken: string, outputToken: string, amountIn: string | number): Promise<BestQuoteStruct>{
        return await getBestQuoteSwapOneClick(inputToken, outputToken, amountIn);
    },
    getBestQuoteSwapCurve: async function (inputToken: string, outputToken: string, amountIn: string | number): Promise<BestQuoteStruct>{
        return await getBestQuoteSwapCurve(inputToken, outputToken, amountIn);
    },
    writeBestQuoteCurve: async function (nameQuote: string, route: any[]): Promise<any>{
        return await writeBestQuoteCurve(nameQuote, route);
    },
};
