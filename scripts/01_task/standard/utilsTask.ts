import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {EthereumProvider} from "hardhat/types";
import {BigNumber} from "ethers";

const { ethers } = hardhat;

async function getPrivateKeyToMnemonic(mnemonic: any) {
    let mnemonicWallet = ethers.Wallet.fromMnemonic(mnemonic);
    console.log(mnemonicWallet.privateKey);
    return mnemonicWallet.privateKey;
}

async function impersonateAccountLocalNode(accountAddress: string): Promise<SignerWithAddress> {

    await hardhat.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [accountAddress],
    });
    return await ethers.getSigner(accountAddress);

}

async function impersonateAccountExternalNode(accountAddress: string, urlNode: string): Promise<any> {

    const provider = new ethers.providers.JsonRpcProvider(urlNode);

    await provider.send("hardhat_impersonateAccount", [accountAddress]);
    return provider.getSigner(accountAddress);

}

async function fundAccountETH(accountAddress: string, amountToFund: any): Promise<any> {
    const [deployer] = await ethers.getSigners();

    await deployer.sendTransaction({
        from: deployer.address,
        to: accountAddress,
        value: amountToFund,
    });

    return ethers.provider.getBalance(accountAddress)
}

async function fundAccountToken(tokenAddress: string, fromAccount: SignerWithAddress, toAddress: string, amountToTransfer: any): Promise<any> {
    const [deployer] = await ethers.getSigners();
    let contract = await ethers.getContractAt("ERC20", tokenAddress, deployer)

    let tx = await contract.connect(fromAccount).transfer(toAddress, amountToTransfer);
    await tx.wait();

}

async function getBalanceERC20(accountAddress: string, erc20Address: string): Promise<any> {
    const [deployer] = await ethers.getSigners();
    let contract = await ethers.getContractAt("ERC20", erc20Address, deployer)
    return await contract.balanceOf(accountAddress);
}

async function getFeeTx(tx: any, txCompleted: any) {
    let gasPrice = tx.gasPrice;
    let gasUsed = txCompleted.gasUsed;
    let feeTx = gasUsed * gasPrice;
    return BigNumber.from(feeTx.toString());
    // todo update gas price calculation with mainnet value
}

async function getBlock(): Promise<any> {
    let blockNumber = await ethers.provider.getBlockNumber();
    return await ethers.provider.getBlock(blockNumber);
}

async function mineBlock(dayToMine: any): Promise<any> {
    let blockOneDay: any = 7200;
    let blockTime: any = 13;

    let blockNumber = await ethers.provider.getBlockNumber();
    let block = await ethers.provider.getBlock(blockNumber);
    let newTimestamp = block.timestamp + ( blockOneDay * dayToMine * blockTime)

    await ethers.provider.send('evm_mine', [newTimestamp]);

}

async function setTimestampBlock(timestampToSet: any): Promise<any> {
    await ethers.provider.send('evm_mine', [timestampToSet]);
}

export const utilsTask = {
    getPrivateKeyToMnemonic: async function (mnemonic: string): Promise<any>{
        return await getPrivateKeyToMnemonic(mnemonic);
    },
    impersonateAccountLocalNode: async function (accountAddress: string): Promise<any>{
        return await impersonateAccountLocalNode(accountAddress);
    },
    impersonateAccountExternalNode: async function (accountAddress: string, provider: string): Promise<any>{
        return await impersonateAccountExternalNode(accountAddress, provider);
    },
    fundAccountETH: async function (accountAddress: string, amountToFund: any): Promise<any>{
        return await fundAccountETH(accountAddress, amountToFund);
    },
    fundAccountToken: async function (tokenAddress: string, accountOperator: SignerWithAddress, accountAddress: string, amountToFund: any): Promise<any>{
        return await fundAccountToken(tokenAddress, accountOperator, accountAddress, amountToFund);
    },
    getBalanceERC20: async function (accountAddress: string, erc20Address: string): Promise<any>{
        return await getBalanceERC20(accountAddress, erc20Address);
    },
    getFeeTx: async function (tx: any, txCompleted: any) {
        return await getFeeTx(tx, txCompleted);
    },
    getBlock: async function () {
        return await getBlock();
    },
    mineBlock: async function (dayToMine: any) {
        return await mineBlock(dayToMine);
    },
    setTimestampBlock: async function (timestampToSet: any) {
        return await setTimestampBlock(timestampToSet);
    }
};
