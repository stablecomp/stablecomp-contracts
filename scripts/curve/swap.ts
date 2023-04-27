import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {taskSwapRouterCurve} from "../01_task/curve/curveTask";
import {utilsTask} from "../01_task/standard/utilsTask";
import {erc20Task} from "../01_task/standard/erc20Task";
const { ethers } = hardhat;
let deployer : SignerWithAddress;
const tokenInfo = require("../../info/address_mainnet/tokenInfo.json")
const curveInfo = require('../../info/address_mainnet/curveAddress.json');

async function main(): Promise<void> {
  [deployer] = await ethers.getSigners();
}

main()
    .then(async () => {

        console.log("SWAP CRV EUSD")

        // FUND ACCOUNT
        let whaleCrv : SignerWithAddress = await utilsTask.impersonateAccountLocalNode("0x68BEDE1d0bc6BE6d215f8f8Ee4ee8F9faB97fE7a");
        await utilsTask.fundAccountToken(tokenInfo.crv.address, whaleCrv, deployer.address, ethers.utils.parseEther("100"));

        let balanceCRV = await erc20Task.balanceOf(tokenInfo.crv.address, deployer.address);

        let route = [
            tokenInfo.crv.address,
            curveInfo.pool.wethCrv,
            tokenInfo.weth.address,
            curveInfo.pool.wethFrax,
            tokenInfo.frax.address,
            curveInfo.pool.fraxUsdc,
            curveInfo.lp.fraxUsdc,
            curveInfo.pool.eusdFraxbp,
            tokenInfo.eusd.address,
        ];
        let swapParams = [[1, 0, 3], [0, 1, 3], [0, 0, 7], [1, 0, 1]];

        let amountIn = ethers.utils.parseEther("1")
        console.log("Amount in crv: "+ ethers.utils.formatEther(amountIn));
        let balanceEusdBefore = await erc20Task.balanceOf(tokenInfo.eusd.address, deployer.address);

        await erc20Task.approve(tokenInfo.crv.address, deployer, curveInfo.swapRouter, ethers.constants.MaxUint256);

        await taskSwapRouterCurve.exchangeMultiple(deployer, tokenInfo.crv.address, tokenInfo.weth.address, amountIn, route, swapParams)
        let balanceEusdAfter = await erc20Task.balanceOf(tokenInfo.eusd.address, deployer.address);

        console.log("Balance eusd before swap: "+ balanceEusdBefore)
        console.log("Balance eusd after swap: "+ balanceEusdAfter)

    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

