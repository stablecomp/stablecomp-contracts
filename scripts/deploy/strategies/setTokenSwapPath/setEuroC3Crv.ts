import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const fs = require('fs');

const { run, ethers } = hardhat;

const info = require('../../../../info/infoPool/euroc3Crv.json');
const euroC3CrvAddress = require('../../../../info/deploy_address/address_scaling_node/strategies/EuroC3Crv/EuroC3Crv.json');
const mainnetAddress = require('../../../../info/deploy_address/address_scaling_node/mainAddress.json');
const curveAddress = require('../../../../info/address_mainnet/curveAddress.json');
const routerAddress = require('../../../../info/address_mainnet/routerAddress.json');
const tokenAddress = require('../../../../info/address_mainnet/tokenAddress.json');
const tokenDecimals = require('../../../../info/address_mainnet/tokenDecimals.json');

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
    await sCompStrategy.connect(deployer).setTokenSwapPathV3(tokenAddress.crv, tokenAddress.euroC, [tokenAddress.crv, tokenAddress.weth, tokenAddress.euroC], [10000, 500], 2);
    await sCompStrategy.connect(deployer).setTokenSwapPathV3(tokenAddress.cvx, tokenAddress.euroC, [tokenAddress.cvx, tokenAddress.usdc, tokenAddress.euroC], [10000, 500], 2);
}

async function getSCompVault(): Promise<void> {
    // deploy sCompVault
    let factoryVault = await ethers.getContractFactory("SCompVault")
    sCompVault = await factoryVault.attach(euroC3CrvAddress.sCompVault.address);

    console.log("Vault deployed to: ", sCompVault.address)
}

async function getStrategy(): Promise<void> {
    // deploy strategies
    let factoryStrategy = await ethers.getContractFactory("SCompStrategyV1")
    sCompStrategy = await factoryStrategy.attach(euroC3CrvAddress.sCompStrategy.address);
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

