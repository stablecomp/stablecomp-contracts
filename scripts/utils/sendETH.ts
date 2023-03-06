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

let accountToFound = "0xD1b261c4C515f85bDaC55c6e6F6da9fce277BfFa"
async function main(): Promise<void> {

    await run('compile');
    [deployer, account1] = await ethers.getSigners();
    console.log("Account 1 addresss: ", account1.address, " with balance: ", ethers.utils.formatEther(await account1.getBalance()))
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

