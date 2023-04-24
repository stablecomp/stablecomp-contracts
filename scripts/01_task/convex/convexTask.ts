import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";

const { ethers } = hardhat;

const curveInfo = require('../../../info/address_mainnet/curveAddress.json');
const boosterABI = require('../../../info/abi/booster.json');

async function earnmarkReward(pidPool: any): Promise<void> {
    const [deployer] = await ethers.getSigners();
    let booster = await getBooster(curveInfo.boosterAddress);
    await booster.connect(deployer).earmarkRewards(pidPool);
}

async function getPoolInfo(id: any): Promise<any> {
    let booster = await getBooster(curveInfo.boosterAddress);
    return await booster.poolInfo(id);
}

async function getPoolLength(): Promise<any> {
    let booster = await getBooster(curveInfo.boosterAddress);
    return await booster.poolLength();
}

async function getBooster(boosterAddress: string): Promise<Contract> {
    return await new ethers.Contract(boosterAddress, boosterABI, ethers.provider);
}


export const boosterTask = {
    earnmarkReward: async function (pid: any): Promise<void>{
        return await earnmarkReward(pid);
    },
    getPoolInfo: async function (id: any): Promise<any>{
        return await getPoolInfo(id);
    },
    getPoolLength: async function (): Promise<any>{
        return await getPoolLength();
    },
};
