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

let accountsToFund = ["0x55B4FE600db6984e9C7bD218924970e48b323961"]
let amountToFund = ethers.utils.parseEther("10000")

const mainAddress = require('../../address/address_scaling_node/mainAddress.json');

let sCompAddress = mainAddress.sCompTokenContract.address;
let sCompContract : Contract;

async function main(): Promise<void> {

    await run('compile');
    [deployer, account1] = await ethers.getSigners();
    console.log("account1.address")
    console.log(account1.address)
    console.log("Deployer addresss: ", deployer.address, " with balance: ", ethers.utils.formatEther(await deployer.getBalance()))
}

async function setupContract(): Promise<void> {

    console.log("Scomp token address is: ", sCompAddress)
    let factorySComp = await ethers.getContractFactory("StableCompToken");
    sCompContract = await factorySComp.attach(sCompAddress);

}

async function readBalance(): Promise<void> {

    let balanceOfAccount1 = await sCompContract.balanceOf(deployer.address);
    console.log("Balance sComp of deployer is: ", ethers.utils.formatEther(balanceOfAccount1));

}

async function sendSComp(): Promise<void> {

    for(let i = 0; i < accountsToFund.length; i++) {

        let tx = await sCompContract.connect(deployer).transfer(accountsToFund[i], amountToFund);
        await tx.wait();
        console.log("Balance sComp of account to fund is: ", ethers.utils.formatEther(await sCompContract.balanceOf(accountsToFund[i])));

    }
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

