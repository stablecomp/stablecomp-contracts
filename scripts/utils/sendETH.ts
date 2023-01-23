import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {deploy} from "@openzeppelin/hardhat-upgrades/dist/utils";
import {start} from "repl";

const { run, ethers, upgrades } = hardhat;

const info = require('../../strategyInfo/infoPool/fraxUsdc.json');

let deployer : SignerWithAddress;
let account1 : SignerWithAddress;

const provider = new ethers.providers.JsonRpcProvider("http://104.248.142.30:8545")

let accountToFound = "0x8E3cB7784176379C7591cACd71E867b887FdB815"
async function main(): Promise<void> {

    await run('compile');
    [deployer, account1] = await ethers.getSigners();
    console.log("Deployer addresss: ", deployer.address, " with balance: ", ethers.utils.formatEther(await deployer.getBalance()))
}

  main()
    .then(async () => {


        let tx = await account1.sendTransaction({
            to: accountToFound,
            value: ethers.utils.parseEther("15.0"), // Sends exactly 1.0 ether
        });
        await tx.wait();
        console.log("Send eth completed")

        let balance = await ethers.provider.getBalance(accountToFound)
        console.log("balance of: ", ethers.utils.formatEther(balance))
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

