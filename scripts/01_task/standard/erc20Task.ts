import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {ethers} from "hardhat";

async function getName(tokenAddress: string): Promise<string> {
    let contract = await getErc20(tokenAddress);
    return await contract.name();
}

async function getSymbol(tokenAddress: string): Promise<string> {
    let contract = await getErc20(tokenAddress);
    return await contract.symbol();
}

async function transfer(tokenAddress: string, accountFrom: SignerWithAddress, accountTo: string, amount: any): Promise<void> {
    let contract = await getErc20(tokenAddress);
    let tx = await contract.connect(accountFrom).transfer(accountTo, amount);
    await tx.wait()
}

async function approve(tokenAddress: string, accountFrom: SignerWithAddress, accountTo: string, amount: any): Promise<void> {
    let contract = await getErc20(tokenAddress);
    let tx = await contract.connect(accountFrom).approve(accountTo, amount);
    await tx.wait()
}

async function readEventTransfer(tokenAddress: string, accountToCheck: string): Promise<any> {
    let factory = await ethers.getContractFactory("ERC20");
    let erc20Contract = await factory.attach(tokenAddress)
    let filterTransfer = await erc20Contract.filters.Transfer(null, accountToCheck);

    return await erc20Contract.queryFilter(filterTransfer);
}

async function getErc20(address: string): Promise<any> {
    let factory = await ethers.getContractFactory("ERC20");
    return factory.attach(address);
}

export const erc20Task = {
    getName: async function (tokenAddress: string): Promise<string> {
        return await getName(tokenAddress);
    },
    getSymbol: async function (tokenAddress: string): Promise<string> {
        return await getSymbol(tokenAddress);
    },
    transfer: async function (tokenAddress: string, accountFrom: SignerWithAddress, accountTo: string, amount: any): Promise<void> {
        return await transfer(tokenAddress, accountFrom, accountTo, amount);
    },
    approve: async function (tokenAddress: string, accountFrom: SignerWithAddress, accountTo: string, amount: any): Promise<void> {
        return await approve(tokenAddress, accountFrom, accountTo, amount);
    },
    readEventTransfer: async function (tokenAddress: string, accountToCheck: string): Promise<any> {
        return await readEventTransfer(tokenAddress, accountToCheck);
    },
}
