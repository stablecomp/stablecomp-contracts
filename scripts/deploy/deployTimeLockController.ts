import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const { run, ethers } = hardhat;
let deployer : SignerWithAddress;
let account2 : SignerWithAddress;

import {deployScompTask} from "../01_task/sCompTask";


async function main(): Promise<void> {
    await run('compile');
    [deployer, account2] = await ethers.getSigners();
    console.log("Deployer address: ", deployer.address)
    console.log("Account 2 address: ", account2.address)
    console.log("----------------------------")
}

main()
    .then(async () => {
        await deployScompTask.deployTimeLockController([deployer.address], [deployer.address]);
        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

