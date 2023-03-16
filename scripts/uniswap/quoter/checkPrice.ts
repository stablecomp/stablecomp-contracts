import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const { run, ethers } = hardhat;

// contract ABI
const uniswapV3Abi = require('../../../info/abi/uniswapV3ABI.json');
const quoterUniswapV3Abi = require('../../../info/abi/quoterUniswapV3.json');

// info token
const tokenInfo = require('../../../info/address_mainnet/tokenInfo.json');
const routerAddress = require('../../../info/address_mainnet/routerAddress.json');

let deployer : SignerWithAddress;

// contract
let uniswapV3Contract : Contract;
let quoterV3Contract : Contract;

// contract address
let uniswapV3Address = routerAddress.uniswapV3;
let quoterV3Address = routerAddress.quoter;

async function main(): Promise<void> {
    await run('compile');
    [deployer] = await ethers.getSigners();

    uniswapV3Contract = new ethers.Contract(
        uniswapV3Address,
        uniswapV3Abi,
        ethers.provider
    )

    quoterV3Contract = new ethers.Contract(
        quoterV3Address,
        quoterUniswapV3Abi,
        ethers.provider
    )

}

main()
    .then(async () => {

        let tokenIn = tokenInfo.crv.address;
        let tokenOut = tokenInfo.mim.address;
        let tokenOutDecimals = tokenInfo.mim.decimals;

        let amountIn = ethers.utils.parseUnits("1", tokenInfo.crv.decimals)
        let types: any = ['address', 'uint24', 'address', 'uint24', 'address'];
        let data = ethers.utils.defaultAbiCoder.encode(types, [tokenIn, 10000, tokenInfo.weth.address, 10000, tokenOut]);

        let quote = await quoterV3Contract.callStatic.quoteExactInput(
            data,
            amountIn,
        );

        console.log("quote")
        console.log(ethers.utils.formatUnits(quote, tokenOutDecimals))

        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

