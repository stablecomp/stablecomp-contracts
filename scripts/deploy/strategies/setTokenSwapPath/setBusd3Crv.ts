import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const fs = require('fs');

const { run, ethers } = hardhat;

const info = require('../../../strategyInfo/infoPool/busd3Crv.json');
const busdAddress = require('../../../../address/address_scaling_node/strategies/Busd3crv/Busd3crv.json');
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
    await sCompStrategy.connect(deployer).setTokenSwapPathV2(tokenAddress.crv, tokenAddress.busd, [tokenAddress.crv, tokenAddress.weth, tokenAddress.busd], 0);
    await sCompStrategy.connect(deployer).setTokenSwapPathV3(tokenAddress.cvx, tokenAddress.busd, [tokenAddress.cvx, tokenAddress.weth, tokenAddress.busd], [10000, 10000], 2);
}

async function getSCompVault(): Promise<void> {
    // deploy sCompVault
    let factoryVault = await ethers.getContractFactory("SCompVault")
    sCompVault = await factoryVault.attach(busdAddress.sCompVault.address);

    console.log("Vault deployed to: ", sCompVault.address)
}

async function getStrategy(): Promise<void> {
    // deploy strategies
    let factoryStrategy = await ethers.getContractFactory("SCompStrategyV1")
    sCompStrategy = await factoryStrategy.attach(busdAddress.sCompStrategy.address);

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

