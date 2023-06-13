import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers } = hardhat;

let deployer : SignerWithAddress;
let account1 : SignerWithAddress;

let accountsToFund = [
    "0x8E35a52eD9e5093eA55C62856aFE148f16B870e1",
    "0x45F29A7deF2Ff2312685b1E4fe2118B00C8e958c",
    "0x415C96e707c1539925A7D87cA67017Bc393019Dc",
    "0x0e09030F108Ec900E7febDe6322D5aee276b034a",
    "0x02464777f5a224db3449A70de5b83D29fF9008a3",
    "0x2EB2f0ceEeeeCE31eA243057c4ee5AcDa36B40B3",
    "0x4AcDC55CD3CF0b02547d45A2CC9CC50C2b866356",
    "0xACFB7997ada448F8eD3E47439461Da6A77DD17e1"]


//let accountsToFund = ["0x2060266bA136DC0b2f4D5Cebd147209F0954C756"]
let amountToFund = ethers.utils.parseEther("100")

const tokenJson = require('../../info/deploy_address/scaling_node/token/sCompTokenContract.json');

let sCompAddress = tokenJson.sCompTokenContract.address;
let sCompContract : Contract;

async function main(): Promise<void> {

    [deployer, account1] = await ethers.getSigners();
    console.log("Deployer address: ", deployer.address, " with balance: ", ethers.utils.formatEther(await deployer.getBalance()))
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

