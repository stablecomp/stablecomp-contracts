import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers } = hardhat;

let deployer : SignerWithAddress;

const provider = new ethers.providers.JsonRpcProvider("https://johnchain.org/ethereum")

async function main(): Promise<void> {

    await run('compile');
    [deployer] = await ethers.getSigners();
    console.log("Deployer addresss: ", deployer.address)
}

const sleep = async function (ms: any): Promise<any> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

const mineBlock = async function(newTimestamp: any) :Promise<any> {
    return sleep(1000).then( async function () : Promise<void> {
        await provider.send('evm_mine', [newTimestamp]);
        console.log("mined")
    })
}

  main()
    .then(async () => {

        //await provider.send("evm_setAutomine", [true]);
        //await provider.send("evm_setIntervalMining", [12000]);

        let blockNumber = await provider.getBlockNumber();
        let block = await provider.getBlock(blockNumber);
        let newTimestamp = block.timestamp + 12000
        for (let index = 0; index < 10000; index++) {
            await mineBlock(newTimestamp);
            newTimestamp += 12000
        }
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

