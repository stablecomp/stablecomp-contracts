import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const fs = require('fs');

const { run, ethers } = hardhat;

const info = require('../../../strategyInfo/infoPool/tusd3Crv.json');
const tusdAddress = require('../../../../address/address_scaling_node/strategies/Tusd3crv/Tusd3crv.json');
const mainnetAddress = require('../../../../address/address_scaling_node/mainAddress.json');
const curveAddress = require('../../../../strategyInfo/address_mainnet/curveAddress.json');
const routerAddress = require('../../../../strategyInfo/address_mainnet/routerAddress.json');
const tokenAddress = require('../../../../strategyInfo/address_mainnet/tokenAddress.json');
const tokenDecimals = require('../../../../strategyInfo/address_mainnet/tokenDecimals.json');

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

async function setupContract(): Promise<void> {
    await getSCompVault();
    await getStrategy();

    await sCompStrategy.connect(deployer).setTokenSwapPathV3(tokenAddress.crv, tokenAddress.tusd, [tokenAddress.crv, tokenAddress.usdc, tokenAddress.tusd], [10000, 100], 2);
    await sCompStrategy.connect(deployer).setTokenSwapPathV3(tokenAddress.cvx, tokenAddress.tusd, [tokenAddress.cvx, tokenAddress.usdc, tokenAddress.tusd], [10000, 100], 2);

}

async function getSCompVault(): Promise<void> {
    // deploy sCompVault
    let factoryVault = await ethers.getContractFactory("SCompVault")
    sCompVault = await factoryVault.attach(tusdAddress.sCompVault.address);

    console.log("Vault deployed to: ", sCompVault.address)
}

async function getStrategy(): Promise<void> {
    // deploy strategies
    let factoryStrategy = await ethers.getContractFactory("SCompStrategyV1")
    sCompStrategy = await factoryStrategy.attach(tusdAddress.sCompStrategy.address);
    await sCompStrategy.deployed();

    console.log("Strategy deployed to: ", sCompStrategy.address)
}

main()
    .then(async () => {
        await setupContract();
        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

