import hardhat from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {uniswapPoolV3} from "../01_task/uniswap/poolV3Task";
import {utilsTask} from "../01_task/standard/utilsTask";
import {erc20Task} from "../01_task/standard/erc20Task";

const tokenInfo = require("../../info/address_mainnet/tokenInfo.json");
const uniswapAddress = require('../../info/address_mainnet/uniswapAddress.json');

const {run, ethers} = hardhat;

let deployer: SignerWithAddress;
let account1: SignerWithAddress;

async function main(): Promise<void> {
    await run("compile");

    [deployer, account1] = await ethers.getSigners();

    console.log("Script start with the account:", deployer.address);
    console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()));
}

main().then(async () => {
    let amountIn = ethers.utils.parseEther("1");

    let accountWhale = await utilsTask.impersonateAccountLocalNode("0xcba0074a77A3aD623A80492Bb1D8d932C62a8bab");
    await utilsTask.fundAccountToken(tokenInfo.cvx.address, accountWhale, deployer.address, amountIn.mul(2));

    let balanceTokenIn = await utilsTask.getBalanceERC20(deployer.address, tokenInfo.cvx.address)
    console.log("Balance tokenIn deployer: ", ethers.utils.formatEther(balanceTokenIn))
    let balanceTokenOut = await utilsTask.getBalanceERC20(deployer.address, tokenInfo.mim.address)
    console.log("Balance tokenOut deployer: ", ethers.utils.formatUnits(balanceTokenOut, tokenInfo.mim.decimals))

    await erc20Task.approve(tokenInfo.cvx.address, deployer, uniswapAddress.uniswapV3, ethers.constants.MaxUint256)

    // calc quote
    let coinPath = [tokenInfo.cvx.address, tokenInfo.usdc.address, tokenInfo.mim.address]
    let feePath = ["002710","0001F4"];
    let quoteAmountOut = await uniswapPoolV3.getQuoteExactInput(coinPath, feePath, amountIn);
    console.log("Quote amount out: ", ethers.utils.formatEther(quoteAmountOut))

    // execute swap
    await uniswapPoolV3.swapExactInput(deployer,
        deployer.address, account1.address,
        coinPath, feePath,
        amountIn, 0);

    balanceTokenIn = await utilsTask.getBalanceERC20(deployer.address, tokenInfo.cvx.address)
    console.log("Balance tokenIn deployer: ", ethers.utils.formatEther(balanceTokenIn))
    balanceTokenOut = await utilsTask.getBalanceERC20(deployer.address, tokenInfo.mim.address)
    console.log("Balance tokenOut deployer: ", ethers.utils.formatUnits(balanceTokenOut, tokenInfo.mim.decimals))

}).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
