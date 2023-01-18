import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {deploy} from "@openzeppelin/hardhat-upgrades/dist/utils";
import {start} from "repl";

const { run, ethers, upgrades } = hardhat;

const info = require('../../strategyInfo/infoPool/fraxUsdc.json');

let deployer : SignerWithAddress;

const provider = new ethers.providers.JsonRpcProvider("http://104.248.142.30:8545")

async function main(): Promise<void> {

    await run('compile');
    [deployer] = await ethers.getSigners();
    console.log("Deployer addresss: ", deployer.address)
}

  main()
    .then(async () => {

        await deployer.sendTransaction({
            to: "0x2060266bA136DC0b2f4D5Cebd147209F0954C756",
            value: ethers.utils.parseEther("2.0"), // Sends exactly 1.0 ether
        });
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

