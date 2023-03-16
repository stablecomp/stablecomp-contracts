import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const fs = require('fs');

const { run, ethers } = hardhat;

const info = require('../../../../info/infoPool/dola3crv.json');
const dolaAddress = require('../../../../info/deploy_address/address_scaling_node/strategies/Dola3crv/Dola3crv.json');
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
    await sCompStrategy.connect(deployer).setTokenSwapPathV2(tokenAddress.crv, tokenAddress.dola, [tokenAddress.crv, tokenAddress.weth, tokenAddress.dola], 0);
    await sCompStrategy.connect(deployer).setTokenSwapPathV3(tokenAddress.cvx, tokenAddress.dola, [tokenAddress.cvx, tokenAddress.usdc, tokenAddress.dola], [10000, 3000], 2);
}

async function getSCompVault(): Promise<void> {
    // deploy sCompVault
    let factoryVault = await ethers.getContractFactory("SCompVault")
    sCompVault = await factoryVault.attach(dolaAddress.sCompVault.address);

    console.log("Vault deployed to: ", sCompVault.address)
}

async function getStrategy(): Promise<void> {
    // deploy strategies
    let factoryStrategy = await ethers.getContractFactory("SCompStrategyV1")
    sCompStrategy = await factoryStrategy.attach(dolaAddress.sCompStrategy.address);

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

