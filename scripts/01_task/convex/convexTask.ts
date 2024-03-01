import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {erc20Task} from "../standard/erc20Task";

const { ethers } = hardhat;

const curveInfo = require('../../../info/address_mainnet/curveAddress.json');
const tokenInfo = require('../../../info/address_mainnet/tokenInfo.json');
const boosterABI = require('../../../info/abi/booster.json');

async function earnmarkReward(pidPool: any): Promise<void> {
    const [deployer] = await ethers.getSigners();
    let booster = await getBooster(curveInfo.boosterAddress);
    console.log("Booster address: ", booster.address)
    console.log("Earmark rewards for pid: ", pidPool)
    let balancePyUsd = await erc20Task.balanceOf(tokenInfo.pyUsdc.address, "0x9da75997624C697444958aDeD6790bfCa96Af19A");
    console.log("Balance pyusd before: ", balancePyUsd)

    await booster.connect(deployer).earmarkRewards(pidPool);

    balancePyUsd = await erc20Task.balanceOf(tokenInfo.pyUsdc.address, "0x9da75997624C697444958aDeD6790bfCa96Af19A");
    console.log("Balance pyusd after: ", balancePyUsd)

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
