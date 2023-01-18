import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers, upgrades } = hardhat;

let deployer : SignerWithAddress;

// contract deploy
let feeDistributionContract : Contract;
let veScompAddress = ""


let wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

let blockTimestamp : any;
async function main(): Promise<void> {
  await run('compile');
  [deployer] = await ethers.getSigners();
}

async function setupContract(): Promise<void> {
    let blockNumber = await ethers.provider.getBlockNumber();
    let block = await ethers.provider.getBlock(blockNumber);
    blockTimestamp = block.timestamp;
    // todo change weth address with stable comp token in production

    let feeDistributionFactory = await ethers.getContractFactory("FeeDistribution");
    feeDistributionContract = await feeDistributionFactory.deploy(
        veScompAddress,
        blockTimestamp,
        wethAddress,
        deployer.address,
        deployer.address
    )

    console.log("Fee distribution contract deploy to: ", feeDistributionContract.address);

    feeDistributionContract = await ethers.getContractAt("IFeeDistributorFront", feeDistributionContract.address, deployer);

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
            address: feeDistributionContract.address,
            constructorArguments: [
                veScompAddress,
                blockTimestamp,
                wethAddress,
                deployer.address,
                deployer.address
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

