import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers } = hardhat;

let deployer : SignerWithAddress;

// contract deploy
let masterchefScomp : Contract;
let masterchefScompAddress = "0xC48528F72A23525dBC77A3C2D85B7Aea4d2F7205"
let sCompTokenContract : Contract;
let sCompAddress = "0x565328F2B262F1182df8b58e5FFD3bAa570C8498";

const infoBusd3Crv = require('../../strategyInfo/infoPool/busd3Crv.json');
const infoDola3Crv = require('../../strategyInfo/infoPool/dola3Crv.json');
const infoFrax3Crv = require('../../strategyInfo/infoPool/frax3crv.json');
const infoFraxUsdc = require('../../strategyInfo/infoPool/fraxUsdc.json');
const infoibEursEur = require('../../strategyInfo/infoPool/ibEURsEUR.json');
const infoMim3Crv = require('../../strategyInfo/infoPool/mim3Crv.json');
const infoTusd3Crv = require('../../strategyInfo/infoPool/tusd3Crv.json');
const mainAddress = require('../../address/address_scaling_node/mainAddress.json')
const busd3Crv = require('../../address/address_scaling_node/strategies/Busd3crv/Busd3crv.json')
const dola3crv = require('../../address/address_scaling_node/strategies/Dola3crv/Dola3crv.json')
const frax3crv = require('../../address/address_scaling_node/strategies/Frax3crv/Frax3crv.json')
const fraxusdc = require('../../address/address_scaling_node/strategies/FraxUsdc/FraxUsdc.json')
const ibEursEur = require('../../address/address_scaling_node/strategies/ibEURsEUR/ibEURsEUR.json')
const mim3crv = require('../../address/address_scaling_node/strategies/Mim3crv/Mim3crv.json')
const tusd3crv = require('../../address/address_scaling_node/strategies/Tusd3crv/Tusd3crv.json')


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
    let balanceDeployer = await sCompTokenContract.balanceOf(deployer.address);

    let amountToFund = balanceDeployer.div(2);
    let txApprove = await sCompTokenContract.connect(deployer).approve(masterchefScomp.address, amountToFund);
    await txApprove.wait();

    let tx = await masterchefScomp.connect(deployer).fund(amountToFund);
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
        //await addPool(busd3Crv.sCompVault.address)
        //await addPool(dola3crv.sCompVault.address)
        //await addPool(frax3crv.sCompVault.address)
        await addPool(fraxusdc.sCompVault.address)
        //await addPool(ibEursEur.sCompVault.address)
        //await addPool(mim3crv.sCompVault.address)
        //await addPool(tusd3crv.sCompVault.address)

        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

