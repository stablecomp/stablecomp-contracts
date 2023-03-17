import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {utilsTask} from "../01_task/standard/utilsTask";

const { run, ethers } = hardhat;

const tokenInfo = require('../../info/address_mainnet/tokenInfo.json');

let deployer : SignerWithAddress;
let account1 : SignerWithAddress;


let accountToFund = "0xB0865d5A2073952f8887281675d852B4Fc1434C0"
let amountToFund = ethers.utils.parseUnits("500", tokenInfo.threeCrv.decimals)

let tokenContract : Contract;

let accountWhale: any;

let accountWhaleTokenAddress = "0x8FBf6366c6b162aed3245d38447C58f3f37DD240";

async function main(): Promise<void> {

    await run('compile');
    [deployer, account1] = await ethers.getSigners();
    console.log("Deployer address: ", deployer.address, " with balance: ", ethers.utils.formatEther(await deployer.getBalance()))
    console.log("Account 1 address: ", account1.address, " with balance: ", ethers.utils.formatEther(await account1.getBalance()))
}

async function setupContract(): Promise<void> {

    let erc20Factory = await ethers.getContractFactory("ERC20");
    tokenContract = await erc20Factory.attach(tokenInfo.threeCrv.address);
}

async function sendToken(): Promise<void> {

    // check balance
    let balance = await tokenContract.balanceOf(accountWhaleTokenAddress);
    console.log("Balance token of ", accountWhaleTokenAddress , " is ", ethers.utils.formatEther(balance))

    let tx = await tokenContract.connect(accountWhale).transfer(accountToFund, amountToFund);
    await tx.wait();
    console.log("Balance WBTC of account to fund is: ", ethers.utils.formatUnits(await tokenContract.balanceOf(accountToFund), tokenInfo.threeCrv.decimals));

}


main()
    .then(async () => {
        await setupContract();

        console.log("Impersonate account");
        accountWhale = await utilsTask.impersonateAccountExternalNode(accountWhaleTokenAddress, "http://104.248.142.30:8545");

        //await fundAccount(accountWhaleTokenAddress);

        console.log("Send token...")
        await sendToken();
        console.log("send token ok")


    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

