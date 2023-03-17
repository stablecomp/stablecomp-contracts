import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {utilsTask} from "../01_task/standard/utilsTask";

const { run, ethers } = hardhat;

const tokenInfo = require('../../info/address_mainnet/tokenInfo.json');

let deployer : SignerWithAddress;
let account1 : SignerWithAddress;


let accountToFund = "0xB0865d5A2073952f8887281675d852B4Fc1434C0"
let amountToFund = ethers.utils.parseUnits("500", tokenInfo.weth.decimals)

let wethContract : Contract;

let accountWethWhale: any;

let accountWhaleWethAddress = "0x2fEb1512183545f48f6b9C5b4EbfCaF49CfCa6F3";
const provider = new ethers.providers.JsonRpcProvider(
    "http://104.248.142.30:8545"
);

async function main(): Promise<void> {

    await run('compile');
    [deployer, account1] = await ethers.getSigners();
    console.log("Deployer address: ", deployer.address, " with balance: ", ethers.utils.formatEther(await deployer.getBalance()))
    console.log("Account 1 address: ", account1.address, " with balance: ", ethers.utils.formatEther(await account1.getBalance()))
}

async function setupContract(): Promise<void> {

    let erc20Factory = await ethers.getContractFactory("ERC20");
    wethContract = await erc20Factory.attach(tokenInfo.weth.address);
}

async function sendToken(): Promise<void> {

    // check balance
    let balance = await wethContract.balanceOf(accountWhaleWethAddress);
    console.log("Balance WETH of ", accountWhaleWethAddress , " is ", ethers.utils.formatEther(balance))

    let tx = await wethContract.connect(accountWethWhale).transfer(accountToFund, amountToFund);
    await tx.wait();
    console.log("Balance WETH of account to fund is: ", ethers.utils.formatUnits(await wethContract.balanceOf(accountToFund), tokenInfo.weth.decimals));

}

async function fundAccount(accountTokenAddress: any): Promise<void> {

    let tx = await account1.sendTransaction({
        to: accountTokenAddress,
        value: ethers.utils.parseEther("0.5"),
    });
    await tx.wait()

}


main()
    .then(async () => {
        await setupContract();

        console.log("impersonate account")
        accountWethWhale = await utilsTask.impersonateAccountExternalNode(accountWhaleWethAddress, "http://104.248.142.30:8545");

        console.log("fund account eth")
        //await utilsTask.fundAccountETH(accountWhaleWethAddress, ethers.utils.parseEther("0.1"));

        console.log("send token...")
        await sendToken();
        console.log("send token ok")


    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

