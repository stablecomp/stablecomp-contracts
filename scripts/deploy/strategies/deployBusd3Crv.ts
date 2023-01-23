import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const fs = require('fs');

const { run, ethers } = hardhat;

const info = require('../../../strategyInfo/infoPool/busd3Crv.json');
const mainnetAddress = require('../../../address/address_scaling_node/mainAddress.json');

let deployer : SignerWithAddress;
let governance : SignerWithAddress;
let strategist : SignerWithAddress;
let rewards : SignerWithAddress;

// Main contract address
let sCompTokenAddress = mainnetAddress.sCompTokenContract.address;
let veScompAddress = mainnetAddress.veScompContract.address;
let masterchefAddress = mainnetAddress.masterchefScomp.address;
let feeDistributionAddress = mainnetAddress.feeDistributionContract.address;
let surplusConverterV2Address = mainnetAddress.surplusConverterV2Contract.address;
let sCompControllerAddress = mainnetAddress.sCompController.address;
let timeLockControllerAddress = mainnetAddress.sCompTimelockController.address;

// Main contract
let sCompController: Contract;

// contract deploy
let sCompVault : Contract;
let sCompStrategy : Contract;

// variable address
let wantAddress = info.wantAddress; // **name** // 18 decimals
let tokenCompoundAddress = info.tokenCompoundAddress; // **name** // 18 decimals
let curveSwapAddress = info.curveSwapAddress; // pool **name pool** curve

// convex pool info
let nameStrategy = info.nameStrategy
let pidPool = info.pidPool;
let nElementPool = info.nElementPool;
let tokenCompoundPosition = info.tokenCompoundPosition;

// fee config
let feeGovernance = info.feeGovernance;
let feeStrategist = info.feeStrategist;
let feeWithdraw = info.feeWithdraw;
let feeDeposit = info.feeDeposit;

async function main(): Promise<void> {
  await run('compile');
  [deployer] = await ethers.getSigners();
}

async function getControllerContract(): Promise<void> {
    sCompController = await ethers.getContractAt("SCompController", sCompControllerAddress, deployer);
}

async function setupContract(): Promise<void> {
    await deploySCompVault();
    await deployStrategy();

    // set strategy in controller
    let tx = await sCompController.connect(deployer).approveStrategy(wantAddress, sCompStrategy.address);
    await tx.wait();
    console.log("Strategy approved in controller");

    tx = await sCompController.connect(deployer).setStrategy(wantAddress, sCompStrategy.address);
    tx.wait();
    console.log("Strategy set in controller");

    tx = await sCompController.connect(deployer).setVault(wantAddress, sCompVault.address);
    tx.wait();
    console.log("Vault set in controller")

    // set timelock controller in strategy
    await sCompStrategy.connect(deployer).setTimeLockController(timeLockControllerAddress);
    console.log("Set time lock controller in strategy");

}

async function deploySCompVault(): Promise<void> {
    // deploy sCompVault
    let factoryVault = await ethers.getContractFactory("SCompVault")
    sCompVault = await factoryVault.deploy(
        wantAddress,
        sCompControllerAddress,
        deployer.address,
        feeDeposit
    );
    await sCompVault.deployed();

    console.log("Vault deployed to: ", sCompVault.address)
}

async function deployStrategy(): Promise<void> {
    // deploy strategies
    let factoryStrategy = await ethers.getContractFactory("SCompStrategyV1")
    sCompStrategy = await factoryStrategy.deploy(
        nameStrategy,
        deployer.address,
        surplusConverterV2Address,
        sCompControllerAddress,
        wantAddress,
        tokenCompoundAddress,
        pidPool,
        [feeGovernance, feeStrategist, feeWithdraw],
        {swap: curveSwapAddress, tokenCompoundPosition: tokenCompoundPosition, numElements: nElementPool}
    );
    await sCompStrategy.deployed();

    console.log("Strategy deployed to: ", sCompStrategy.address)
}

async function writeAddressInJson(): Promise<void> {

    let path = "./address/address_scaling_node/strategies/"+nameStrategy+"/"+nameStrategy+".json"
    let pathRename = "./address/address_scaling_node/strategies/"+nameStrategy+"/"+nameStrategy+"_"+Date.now()+".json"

    await fs.rename(path, pathRename, function(err:any) {
        console.log("error rename file address")
    });

    let address = {
        sCompVault: {
            address: sCompVault.address,
            args: {
                wantAddress: wantAddress,
                sCompControllerAddress: sCompControllerAddress,
                treasuryFee: deployer.address,
                depositFee: feeDeposit
            }
        },
        sCompStrategy: {
            address: sCompStrategy.address,
            args: {
                nameStrategy: nameStrategy,
                governance: deployer.address,
                strategist: surplusConverterV2Address,
                controller: sCompControllerAddress,
                want: wantAddress,
                tokenCompound: tokenCompoundAddress,
                pid: pidPool,
                feeConfig: [feeGovernance, feeStrategist, feeWithdraw],
                curvePool: {swap: curveSwapAddress, tokenCompoundPosition: tokenCompoundPosition, numElements: nElementPool}
            }
        }
    };

    let data = JSON.stringify(address);
    fs.writeFileSync(path, data);
}

async function verify(): Promise<void> {

    // Verifying contracts
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost" &&
        hardhat.network.name !== "scaling_node" &&
        hardhat.network.name !== "local_node"
    ) {

        // Wait 30 seconds
        await new Promise(resolve => setTimeout(resolve, 30000));

        await run("verify:verify", {
            address: sCompVault.address,
            constructorArguments: [
                wantAddress,
                sCompControllerAddress,
                deployer.address,
                feeDeposit
            ],

        });

        await run("verify:verify", {
            address: sCompStrategy.address,
            constructorArguments: [
                nameStrategy,
                deployer.address,
                surplusConverterV2Address,
                sCompControllerAddress,
                wantAddress,
                tokenCompoundAddress,
                pidPool,
                [feeGovernance, feeStrategist, feeWithdraw],
                {swap: curveSwapAddress, tokenCompoundPosition: tokenCompoundPosition, numElements: nElementPool}
            ],
        });
    }
}

main()
    .then(async () => {
        await getControllerContract();
        await setupContract();
        await writeAddressInJson();
        await verify();
        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

