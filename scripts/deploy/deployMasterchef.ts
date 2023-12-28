import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const { run, ethers } = hardhat;
let deployer : SignerWithAddress;
let tokenInfo = require('../../info/address_mainnet/tokenInfo.json')

import { deployScompTask } from "../01_task/sCompTask";

async function main(): Promise<void> {
    await run('compile');
    [deployer] = await ethers.getSigners();
    console.log("Script run with deployer address: ", deployer.address)
}

main()
    .then(async () => {
        let sCompTokenContract = await deployScompTask.deploySCompToken();
        console.log("sCompTokenContract: ", sCompTokenContract.address)

        let veScompContract = await deployScompTask.deployVe(
            sCompTokenContract.address
        );
        console.log("veScompContract: ", veScompContract.address)

        let masterchefScompContract = await deployScompTask.deployMasterchef(
            sCompTokenContract.address, veScompContract.address
        );
        console.log("masterchefScompContract: ", masterchefScompContract.address)

        let feeDistributionContract = await deployScompTask.deployFeeDistribution(
            sCompTokenContract.address, veScompContract.address, deployer.address, deployer.address
        );
        console.log("feeDistributionContract: ", feeDistributionContract.address)

        let surplusConverterContract = await deployScompTask.deploySurplusConverter(
            feeDistributionContract.address, tokenInfo.weth.address, deployer.address, deployer.address, [deployer.address, deployer.address]
        )
        console.log("surplusConverterContract: ", surplusConverterContract.address)

        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

