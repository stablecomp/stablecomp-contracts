import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const { run, ethers } = hardhat;
let deployer : SignerWithAddress;

import { deployScompTask } from "../01_task/sCompTask";
const mainnetAddress = require('../../info/deploy_address/address_scaling_node/mainAddress.json');

async function main(): Promise<void> {
    await run('compile');
    [deployer] = await ethers.getSigners();
    console.log("Script run with deployer address: ", deployer.address)
}

main()
    .then(async () => {
        await deployScompTask.deployVe(mainnetAddress.sCompTokenContract.address);
        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

