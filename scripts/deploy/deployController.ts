import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const { run, ethers } = hardhat;
let deployer : SignerWithAddress;

import {deployScompTask} from "../01_task/sCompTask";

async function main(): Promise<void> {
  await run('compile');
  [deployer] = await ethers.getSigners();

}

main()
    .then(async () => {
        let governance = deployer.address;
        let strategist = deployer.address;
        let rewards = deployer.address;

        let balanceBeforeController = await deployer.getBalance();
        await deployScompTask.deployController(governance, strategist, rewards);
        let balanceAfterController = await deployer.getBalance();
        let diff = balanceBeforeController.sub(balanceAfterController);

        console.log("Cost deploy: " + diff)

        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

