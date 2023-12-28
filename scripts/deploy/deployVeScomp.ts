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
        let sCompToken = "0xde0f01EA4d2eFd7E8Cd4f2FC2eb0F788ad49f552";
        let ve = await deployScompTask.deployVe(sCompToken);
        console.log("Ve deployed to: ", ve.address)
        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

