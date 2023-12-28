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
        let sCompTokenAddress = "0x9A86494Ba45eE1f9EEed9cFC0894f6C5d13a1F0b"
        let sCompFarming = "0xFf658343244c0475b9305859F1b7CDAB9784762f"

        let factoryScompToken = await ethers.getContractFactory("StableCompToken");
        let sCompToken = factoryScompToken.attach(sCompTokenAddress);
        let factoryScompFarming = await ethers.getContractFactory("MasterChefScomp");
        let masterchefScomp = factoryScompFarming.attach(sCompFarming);


        let balanceDeployer = await sCompToken.balanceOf(deployer.address);

        let amountToFund = balanceDeployer.div(2);
        let txApprove = await sCompToken.connect(deployer).approve(masterchefScomp.address, amountToFund);
        await txApprove.wait();

        let tx = await masterchefScomp.connect(deployer).fund(amountToFund);
        await tx.wait();

        console.log("Fund done");

        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

