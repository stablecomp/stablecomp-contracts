import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
const { ethers } = hardhat;

// SURPLUS CONVERTER FUNCTION
async function addFeed(_oracleRouterAddress: string, _assetAddress: string, _feedAddress: string, _priceAdmin: any, _isStablecoin: boolean): Promise<void> {
    let oracleRouter = await getOracleRouter(_oracleRouterAddress);
    if (_feedAddress.length == 0) {
        _feedAddress = ethers.constants.AddressZero
    }
    let tx = await oracleRouter.setFeed(_assetAddress, _feedAddress, _priceAdmin, _isStablecoin);
    await tx.wait();
}

async function getOracleRouter(_oracleRouterAddress: string): Promise<Contract> {
    let factory = await ethers.getContractFactory("OracleRouter");
    return factory.attach(_oracleRouterAddress);
}

export const oracleRouterTask = {
    addFeed: async function (_oracleRouterAddress: string, _assetAddress: string, _feedAddress: string, _priceAdmin: any, _isStablecoin: boolean): Promise<void>{
        return await addFeed(_oracleRouterAddress, _assetAddress, _feedAddress, _priceAdmin, _isStablecoin);
    },
};
