import hardhat from 'hardhat';
import {SushiswapPair, ChainId, TradePath} from "simple-sushiswap-sdk-v2";
import fs from "fs";
const {  ethers } = hardhat;

async function getBestQuoteSwap(tokenInAddress: any, tokenOutAddress: any, amountIn: any): Promise<any> {

    const [deployer] = await ethers.getSigners();

    const sushiswapPair = new SushiswapPair({
        // the contract address of the token you want to convert FROM
        fromTokenContractAddress: tokenInAddress,
        // the contract address of the token you want to convert TO
        toTokenContractAddress: tokenOutAddress,
        // the ethereum address of the user using this part of the dApp
        ethereumAddress: deployer.address,
        // you can pass in the provider url as well if you want
        // providerUrl: YOUR_PROVIDER_URL,
        chainId: ChainId.MAINNET,
        // the kind of transaction that should be carried out
        tradePath: TradePath.erc20ToErc20,
    });

    // now to create the factory you just do
    const sushiswapPairFactory = await sushiswapPair.createFactory();

    const trade = await sushiswapPairFactory.trade('10');

    console.log(trade);
}

async function writeBestQuoteUniswap(nameQuote: string, coinPath: string[], feePath: string[], versionProtocol: string): Promise<any> {
    let infoPath = "./info"
    if (!fs.existsSync(infoPath)) {
        fs.mkdirSync(infoPath);
    }
    let quotePath = infoPath+"/bestQuote/"
    if (!fs.existsSync(quotePath)) {
        fs.mkdirSync(quotePath);
    }

    let path = quotePath + nameQuote+".json"

    let routerIndex = versionProtocol === "V2" ? 0 : versionProtocol === "V3" ? 2 : 1

    let jsonData = {
        coinPath: coinPath,
        feePath: feePath,
        versionProtocol: versionProtocol,
        routerIndex: routerIndex
    }
    let data = JSON.stringify(jsonData);
    fs.writeFileSync(path, data);
}

export const sushiswapSdkTask = {
    getBestQuoteSwap: async function (tokenInAddress: any, tokenOutAddress: any, amountIn: any): Promise<any>{
        return await getBestQuoteSwap(tokenInAddress, tokenOutAddress, amountIn);
    },
    writeBestQuoteSushiswap: async function (nameQuote: string, coinPath: string[], feePath: string[], versionProtocol: string): Promise<any>{
        return await writeBestQuoteUniswap(nameQuote, coinPath, feePath, versionProtocol);
    },
};
