import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { ethers } = hardhat;

let deployer : SignerWithAddress;
let account1 : SignerWithAddress;
let account2 : SignerWithAddress;
let account3 : SignerWithAddress;
let account4 : SignerWithAddress;
let account5 : SignerWithAddress;

let accountsToFund = [
    "0x8E35a52eD9e5093eA55C62856aFE148f16B870e1",
    "0x45F29A7deF2Ff2312685b1E4fe2118B00C8e958c",
    "0x415C96e707c1539925A7D87cA67017Bc393019Dc",
    "0x0e09030F108Ec900E7febDe6322D5aee276b034a",
    "0x02464777f5a224db3449A70de5b83D29fF9008a3",
    "0x2EB2f0ceEeeeCE31eA243057c4ee5AcDa36B40B3",
    "0x4AcDC55CD3CF0b02547d45A2CC9CC50C2b866356",
    "0xACFB7997ada448F8eD3E47439461Da6A77DD17e1"]


async function main(): Promise<void> {
    [deployer] = await ethers.getSigners();
    console.log("Deployer address: ", deployer.address, " with balance: "+ await deployer.getBalance())
}

  main()
    .then(async () => {
        for (let i = 0; i < accountsToFund.length ; i++) {
            let tx = await deployer.sendTransaction({
                to: accountsToFund[i],
                value: ethers.utils.parseEther("0.5"),
            });
            await tx.wait();
            console.log("Send eth completed")

            let balance = await ethers.provider.getBalance(accountsToFund[i])
            console.log("balance of: ", ethers.utils.formatEther(balance))
        }
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

