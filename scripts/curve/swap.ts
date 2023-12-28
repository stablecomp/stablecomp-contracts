import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {taskSdkCurve, taskSwapRouterCurve} from "../01_task/curve/curveTask";
import {utilsTask} from "../01_task/standard/utilsTask";
import {erc20Task} from "../01_task/standard/erc20Task";
import {BestQuoteStruct} from "../01_task/uniswap/sdkTask";
const { ethers } = hardhat;
let deployer : SignerWithAddress;
const tokenInfo = require("../../info/address_mainnet/tokenInfo.json")
const curveInfo = require('../../info/address_mainnet/curveAddress.json');

async function main(): Promise<void> {
  [deployer] = await ethers.getSigners();
}

main()
    .then(async () => {
        let tokenInAddress = tokenInfo.crv.address
        let tokenInDecimals = tokenInfo.crv.decimals
        let tokenOutAddress = tokenInfo.weth.address
        let tokenOutDecimals = tokenInfo.weth.decimals
        let addressWhaleTokenIn = "0x7a16fF8270133F063aAb6C9977183D9e72835428"

        // FUND ACCOUNT

        let whaleTokenIn : SignerWithAddress = await utilsTask.impersonateAccountLocalNode(addressWhaleTokenIn);
        await utilsTask.fundAccountETH(whaleTokenIn.address,
            ethers.utils.parseEther("10"));
        await utilsTask.fundAccountToken(tokenInAddress, whaleTokenIn,
            deployer.address, ethers.utils.parseUnits("10", tokenInDecimals));
        let bestQuote = require("../../info/bestQuote/crv_WETH.json");


        let amountInNumber = 1.69;
        let amountIn = ethers.utils.parseUnits(amountInNumber.toString(), tokenInDecimals)
        console.log("Amount in tokenIn: "+ amountIn);
        let bestQuoteCurve : any = await taskSdkCurve.getBestQuoteSwapCurve(tokenInAddress, tokenOutAddress, amountInNumber);

        let balanceTokenOutBefore = await erc20Task.balanceOf(tokenOutAddress, deployer.address);

        await erc20Task.approve(tokenInAddress, deployer, curveInfo.swapRouter, ethers.constants.MaxUint256);

        console.log("bestQuoteCurve")
        console.log(bestQuoteCurve)
        await taskSwapRouterCurve.exchangeMultiple(
            deployer,
            amountIn, bestQuoteCurve.routeList,
            bestQuoteCurve.swapParamList, bestQuoteCurve.poolAddressList,
            deployer.address
        )
        let balanceTokenOutAfter = await erc20Task.balanceOf(tokenOutAddress, deployer.address);

        console.log("Balance tokenOut before swap: "+ balanceTokenOutBefore)
        console.log("Balance tokenOut after swap: "+ balanceTokenOutAfter)

    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

