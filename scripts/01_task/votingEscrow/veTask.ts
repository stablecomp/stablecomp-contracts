import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import fs from "fs";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {utilsTask} from "../standard/utilsTask";
import {erc20Task} from "../standard/erc20Task";
const { run, ethers } = hardhat;

const tokenInfo = require('../../../info/address_mainnet/tokenInfo.json');
const routerInfo = require('../../../info/address_mainnet/routerAddress.json');
const curveInfo = require('../../../info/address_mainnet/curveAddress.json');
const boosterABI = require('../../../info/abi/booster.json');

// BOOSTER FUNCTION
async function createLock(tokenAddress: string, veContract: Contract, accountOperator: SignerWithAddress, amountToLock: any, timeLock: any): Promise<void> {
    await erc20Task.approve(tokenAddress, accountOperator, veContract.address, amountToLock);

    let tx = await veContract.connect(accountOperator).create_lock(amountToLock, timeLock);
    await tx.wait()

}

export const veTask = {
    createLock: async function (tokenAddress: string, veContract: Contract, accountOperator: SignerWithAddress, amountToLock: any, timeLock: any): Promise<void>{
        return await createLock(tokenAddress, veContract, accountOperator, amountToLock, timeLock);
    },
};
