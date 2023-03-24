import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers } = hardhat;

let deployer : SignerWithAddress;

const provider = new ethers.providers.JsonRpcProvider("https://johnchain.org/")

async function main(): Promise<void> {

    await run('compile');
    [deployer] = await ethers.getSigners();
    console.log("Deployer addresss: ", deployer.address)
}

  main()
    .then(async () => {

        await provider.send("evm_setAutomine", [true]);
        await provider.send("evm_setIntervalMining", [12000]);

    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

