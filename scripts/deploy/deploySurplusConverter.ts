import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const { run, ethers } = hardhat;
let deployer : SignerWithAddress;
let account2 : SignerWithAddress;

import {deployScompTask} from "../01_task/sCompTask";
const mainnetAddress = require('../../info/deploy_address/address_scaling_node/mainAddress.json');

async function main(): Promise<void> {
    await run('compile');
    [deployer, account2] = await ethers.getSigners();
    console.log("Deployer address: ", deployer.address)
    console.log("Account 2 address: ", account2.address)
    console.log("----------------------------")
}

main()
    .then(async () => {
        await deployScompTask.deploySurplusConverterV2(mainnetAddress.feeDistributionContract.address, deployer.address, deployer.address, [deployer.address, deployer.address]);
        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

