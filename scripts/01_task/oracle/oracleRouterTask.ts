import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
const { ethers } = hardhat;

// SURPLUS CONVERTER FUNCTION
async function addFeed(oracleRouterAddress: string, assetAddress: string, feedAddress: string): Promise<void> {
    let oracleRouter = await getOracleRouter(oracleRouterAddress);
    let tx = await oracleRouter.setFeed(assetAddress, feedAddress);
    await tx.wait();
}

async function getOracleRouter(oracleRouterAddress: string): Promise<Contract> {
    let factory = await ethers.getContractFactory("OracleRouter");
    return factory.attach(oracleRouterAddress);
}

export const oracleRouterTask = {
    addFeed: async function (oracleRouterAddress: string, assetAddress: string, feedAddress: string): Promise<void>{
        return await addFeed(oracleRouterAddress, assetAddress, feedAddress);
    },
};
