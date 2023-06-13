import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const { run, ethers } = hardhat;
let deployer : SignerWithAddress;

import { deployScompTask } from "../01_task/sCompTask";
const SCompTokenInfo = require('../../info/deploy_address/scaling_node/token/sCompTokenContract.json');

async function main(): Promise<void> {
    await run('compile');
    [deployer] = await ethers.getSigners();
    console.log("Script run with deployer address: ", deployer.address)
}

main()
    .then(async () => {
        await deployScompTask.deployVe(SCompTokenInfo.sCompTokenContract.address);
        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

