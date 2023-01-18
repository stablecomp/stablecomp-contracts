import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers } = hardhat;

let deployer : SignerWithAddress;
let strategist : SignerWithAddress;

// contract deploy
let surplusConverterV2Contract : Contract;
let feeDistributionAddress = ""
let uniswapV2Address = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
let sushiswapAddress = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F";

let wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

async function main(): Promise<void> {
  await run('compile');
  [deployer, strategist] = await ethers.getSigners();
}

async function setupContract(): Promise<void> {

    // todo change weth address with stable comp token in production

    let surplusConverterFactory = await ethers.getContractFactory("SurplusConverterUniV2Sushi");
    surplusConverterV2Contract = await surplusConverterFactory.deploy(
        wethAddress,
        feeDistributionAddress,
        uniswapV2Address,
        sushiswapAddress,
        deployer.address,
        deployer.address,
        [deployer.address, strategist.address]
    )

    console.log("Surplus converter contract deploy to: ", surplusConverterV2Contract.address);
}

async function verify(): Promise<void> {

    // Verifying contracts
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost"
    ) {
        // Wait 30 seconds
        await new Promise(resolve => setTimeout(resolve, 30000));

        await run("verify:verify", {
            address: surplusConverterV2Contract.address,
            constructorArguments: [
                wethAddress,
                feeDistributionAddress,
                uniswapV2Address,
                sushiswapAddress,
                deployer.address,
                deployer.address,
                [deployer.address, strategist.address]
            ],
        });
    }
}


main()
    .then(async () => {
        await setupContract();
        await verify();
        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

