import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const { ethers } = hardhat;

const tokenInfo = require('../../info/address_mainnet/tokenInfo.json');
const routerInfo = require('../../info/address_mainnet/routerAddress.json');
const curveInfo = require('../../info/address_mainnet/curveAddress.json');
const boosterABI = require('../../info/abi/booster.json');

// SURPLUS CONVERTER FUNCTION
async function buyback(surplusConverterAddress: string, tokenAddress: string, amount: any, minAmount: any, withTransfer: boolean): Promise<void> {
    let surplusConverter = await getSurplusConverter(surplusConverterAddress);
    let tx = await surplusConverter.buyback(tokenAddress, amount, minAmount, withTransfer);
    await tx.wait();
}

async function getSurplusConverter(surplusConverterAddress: string): Promise<Contract> {
    let factory = await ethers.getContractFactory("SurplusConverterUniV2Sushi");
    return factory.attach(surplusConverterAddress);
}

// FEE DISTRIBUTION FUNCTION
async function checkpointToken(feeDistributionAddress: string): Promise<void> {
    let feeDistribution = await getFeeDistribution(feeDistributionAddress);
    let tx = await feeDistribution.checkpoint_token();
    await tx.wait();
}
async function claimFee(feeDistributionAddress: string, operator: SignerWithAddress, receiverAddress: string): Promise<void> {
    let feeDistribution = await getFeeDistribution(feeDistributionAddress);

    let tx = await feeDistribution.connect(operator).claim(receiverAddress);
    await tx.wait();
}

async function getFeeDistribution(feeDistributionAddress: string): Promise<Contract> {
    const [deployer] = await ethers.getSigners();
    return await ethers.getContractAt("IFeeDistributorFront", feeDistributionAddress, deployer);
}

export const surplusConverterTask = {
    buyback: async function (surplusConverterAddress: string, tokenAddress: string, amount: any, minAmount: any, withTransfer: boolean): Promise<void>{
        return await buyback(surplusConverterAddress, tokenAddress, amount, minAmount, withTransfer);
    },
};

export const feeDistributionTask = {
    checkpointToken: async function (feeDistributionAddress: string): Promise<void>{
        return await checkpointToken(feeDistributionAddress);
    },
    claimFee: async function (feeDistributionAddress: string, operator: SignerWithAddress, receiverAddress: string): Promise<void>{
        return await claimFee(feeDistributionAddress, operator, receiverAddress);
    },
};
