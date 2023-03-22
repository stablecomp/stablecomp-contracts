import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers } = hardhat;

let deployer : SignerWithAddress;
let account1 : SignerWithAddress;

let accountsToFund = ["0x5ed48b2D93487C55b7eC6C5e033Cc1B81D737E1e"]
let amountToFund = ethers.utils.parseEther("10000")

const mainAddress = require('../../info/deploy_address/address_scaling_node/mainAddress.json');

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

async function sendSComp(): Promise<void> {

    for(let i = 0; i < accountsToFund.length; i++) {

        let tx = await sCompContract.connect(deployer).transfer(accountsToFund[i], amountToFund);
        await tx.wait();
        console.log("Balance sComp of account to fund is: ", ethers.utils.formatEther(await sCompContract.balanceOf(accountsToFund[i])));

    }
}

  main()
    .then(async () => {
        await setupContract();
        await sendSComp();
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

