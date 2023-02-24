import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const fs = require('fs');

const { run, ethers } = hardhat;

const info = require('../../../../strategyInfo/infoPool/3eur.json');
const threeEurAddress = require('../../../../address/address_scaling_node/strategies/3Eur/3Eur.json');
const mainnetAddress = require('../../../../address/address_scaling_node/mainAddress.json');
const curveAddress = require('../../../../strategyInfo/address_mainnet/curveAddress.json');
const routerAddress = require('../../../../strategyInfo/address_mainnet/routerAddress.json');
const tokenAddress = require('../../../../strategyInfo/address_mainnet/tokenAddress.json');
const tokenDecimals = require('../../../../strategyInfo/address_mainnet/tokenDecimals.json');

let deployer : SignerWithAddress;

// contract deploy
let sCompVault : Contract;
let sCompStrategy : Contract;

async function main(): Promise<void> {
  await run('compile');
  [deployer] = await ethers.getSigners();
}

async function setupContract(): Promise<void> {
    await getSCompVault();
    await getStrategy();
}

async function setTokenSwapPath(): Promise<void> {
    await sCompStrategy.connect(deployer).setTokenSwapPathV3(tokenAddress.crv, tokenAddress.tetherEur, [tokenAddress.crv, tokenAddress.tetherUsd, tokenAddress.tetherEur], [10000, 500], 2);
    await sCompStrategy.connect(deployer).setTokenSwapPathV3(tokenAddress.cvx, tokenAddress.tetherEur, [tokenAddress.cvx, tokenAddress.usdc, tokenAddress.tetherEur], [10000, 500], 2);
}

async function getSCompVault(): Promise<void> {
    // deploy sCompVault
    let factoryVault = await ethers.getContractFactory("SCompVault")
    sCompVault = await factoryVault.attach(threeEurAddress.sCompVault.address);

    console.log("Vault deployed to: ", sCompVault.address)
}

async function getStrategy(): Promise<void> {
    // deploy strategies
    let factoryStrategy = await ethers.getContractFactory("SCompStrategyV1")
    sCompStrategy = await factoryStrategy.attach(threeEurAddress.sCompStrategy.address);
    await sCompStrategy.deployed();

    console.log("Strategy deployed to: ", sCompStrategy.address)
}

main()
    .then(async () => {
        await setupContract();
        await setTokenSwapPath();
        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

