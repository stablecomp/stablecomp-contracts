import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {deploy} from "@openzeppelin/hardhat-upgrades/dist/utils";
import {start} from "repl";
import {BigNumber} from "ethers";

const { run, ethers, upgrades } = hardhat;

const info = require('../../strategyInfo/infoPool/fraxUsdc.json');

let deployer : SignerWithAddress;
let account1 : SignerWithAddress;

const provider = new ethers.providers.JsonRpcProvider("http://104.248.142.30:8545")

let accountToFund = "0x8E3cB7784176379C7591cACd71E867b887FdB815"
let amountToFund = ethers.utils.parseEther("10000")

let sCompAddress = "0x05F6847ab9273366Ca4f18294efba0503513aFB7"
let sCompContract : Contract;

async function main(): Promise<void> {

    await run('compile');
    [deployer, account1] = await ethers.getSigners();
    console.log("account1.address")
    console.log(account1.address)
    console.log("Deployer addresss: ", deployer.address, " with balance: ", ethers.utils.formatEther(await deployer.getBalance()))
}

async function setupContract(): Promise<void> {

    let factorySComp = await ethers.getContractFactory("StableCompToken");
    sCompContract = await factorySComp.attach(sCompAddress);

}

async function readBalance(): Promise<void> {

    let balanceOfAccount1 = await sCompContract.balanceOf(deployer.address);
    console.log("Balance sComp of deployer is: ", ethers.utils.formatEther(balanceOfAccount1));

}

async function sendSComp(): Promise<void> {

    let tx = await sCompContract.connect(deployer).transfer(accountToFund, amountToFund);
    await tx.wait();
    console.log("Balance sComp of account to fund is: ", ethers.utils.formatEther(await sCompContract.balanceOf(accountToFund)));

}

async function readEventSComp(): Promise<void> {

    //     event Transfer(address indexed from, address indexed to, uint256 value);

    let filterDeposit = await sCompContract.filters.Transfer("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");

    let listTransfer = await sCompContract.queryFilter(filterDeposit)

    if (listTransfer.length > 0 ) {

        for (let i = 0; i < listTransfer.length; i++) {

            let args:any = listTransfer[i].args;
            let from = args[0];
            let to = args[1];
            let amount = args[2];

            console.log("Transfer from: ", from, " to: ", to, " of amount: ", amount)

        }
    }

}

  main()
    .then(async () => {
        await setupContract();
        await sendSComp();
        //await readEventSComp();

    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

