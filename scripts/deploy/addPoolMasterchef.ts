import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers } = hardhat;

let deployer : SignerWithAddress;

// contract deploy json
const masterchefJson = require('../../info/deploy_address/scaling_node/farming/masterchefScompContract.json');
const tokenJson = require('../../info/deploy_address/scaling_node/token/sCompTokenContract.json');

let masterchefScomp : Contract;
let masterchefScompAddress = masterchefJson.masterchefScomp.address

let sCompTokenContract : Contract;
let sCompAddress = tokenJson.sCompTokenContract.address

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

        await addPool("0x1df2933B9c8815CC8990AFb4A079A717bC369185")
        console.log("Pool usdp-3crv added")
        await addPool("0x0a1da14519309eCEa6E19DC940D95A7Fc850a911")
        console.log("Pool tusd-3crv added")
        await addPool("0x5073383c90cFBcc666227a67F301dcF910C3971e")
        console.log("Pool mim-3crv added")
        await addPool("0x494d51A38ACEEBcc1D6b8e6A1EE8D8d489052033")
        console.log("Pool alusd-3crv added")
        await addPool("0xe87A72E170f7ab225b39f3Ba8d0E407e37F29B8A")
        console.log("Pool alusd-fraxbp added")
        await addPool("0xA918c6B097569B6584014257CE89cB546f85fe33")
        console.log("Pool usdd-3crv added")

        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

