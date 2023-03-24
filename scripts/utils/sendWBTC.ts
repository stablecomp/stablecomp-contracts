import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {utilsTask} from "../01_task/standard/utilsTask";
const { run, ethers } = hardhat;

const tokenInfo = require('../../info/address_mainnet/tokenInfo.json');

let deployer : SignerWithAddress;
let account1 : SignerWithAddress;


let accountToFund = "0xB0865d5A2073952f8887281675d852B4Fc1434C0"
let amountToFund = ethers.utils.parseUnits("0.5", tokenInfo.wbtc.decimals)

let wbtcContract : Contract;

let accountWbtc: any;

let accountWhaleWbtcAddress = "0x6daB3bCbFb336b29d06B9C793AEF7eaA57888922";

async function main(): Promise<void> {

    await run('compile');
    [deployer, account1] = await ethers.getSigners();
    console.log("Deployer address: ", deployer.address, " with balance: ", ethers.utils.formatEther(await deployer.getBalance()))
    console.log("Account 1 address: ", account1.address, " with balance: ", ethers.utils.formatEther(await account1.getBalance()))
}

async function setupContract(): Promise<void> {

    let erc20Factory = await ethers.getContractFactory("ERC20");
    wbtcContract = await erc20Factory.attach(tokenInfo.wbtc.address);
}

main()
    .then(async () => {
        await setupContract();

        accountWbtc = await utilsTask.impersonateAccountExternalNode(accountWhaleWbtcAddress, "http://104.248.142.30:8545")
        await utilsTask.fundAccountETH(accountWbtc.address, ethers.utils.parseEther("1"));
        await utilsTask.fundAccountToken(tokenInfo.wbtc.address, accountWbtc, accountToFund, amountToFund);

        console.log("send token ok")
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

