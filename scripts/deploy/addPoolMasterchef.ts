import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers } = hardhat;

const mainnetAddress = require('../../info/deploy_address/address_scaling_node/mainAddress.json');

let deployer : SignerWithAddress;

// contract deploy
let masterchefScomp : Contract;
let masterchefScompAddress = mainnetAddress.masterchefScomp.address
let sCompTokenContract : Contract;
let sCompAddress = mainnetAddress.sCompTokenContract.address;

const busd3Crv = require('../../info/deploy_address/address_scaling_node/strategies/Busd3crv/Busd3crv.json')
const dola3crv = require('../../info/deploy_address/address_scaling_node/strategies/Dola3crv/Dola3crv.json')
const fraxusdc = require('../../info/deploy_address/address_scaling_node/strategies/FraxUsdc/FraxUsdc.json')

let fundAmountToMasterchef = ethers.utils.parseEther("100000");

async function main(): Promise<void> {
  await run('compile');
  [deployer] = await ethers.getSigners();
}

async function setupContract(): Promise<void> {
    let factoryMasterchef = await ethers.getContractFactory("MasterChefScomp");
    masterchefScomp = await factoryMasterchef.attach(masterchefScompAddress);

    let factorySCompToken = await ethers.getContractFactory("StableCompToken")
    sCompTokenContract = await factorySCompToken.attach(sCompAddress)
}

async function fundContract(): Promise<void> {
    let txApprove = await sCompTokenContract.connect(deployer).approve(masterchefScomp.address, fundAmountToMasterchef);
    await txApprove.wait();

    let tx = await masterchefScomp.connect(deployer).fund(fundAmountToMasterchef);
    await tx.wait();
}

async function addPool(lpToken: any): Promise<void> {
    let tx = await masterchefScomp.add(1000, lpToken, true);
    await tx.wait();
}



main()
    .then(async () => {
        await setupContract();
        await fundContract();
        await addPool(busd3Crv.sCompVault.address)
        console.log("Pool busd3crv added")
        await addPool(dola3crv.sCompVault.address)
        console.log("Pool dola3crv added")
        await addPool(fraxusdc.sCompVault.address)
        console.log("Pool fraxusdc added")

        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

