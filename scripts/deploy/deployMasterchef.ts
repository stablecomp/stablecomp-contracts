import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers } = hardhat;

let deployer : SignerWithAddress;

// contract deploy
let masterchefScomp : Contract;
let tokenLockAddress = ""
let veCrvAddress = ""

let tokenPerBlock = 9;
let initialBlock : any;
async function main(): Promise<void> {
  await run('compile');
  [deployer] = await ethers.getSigners();
}

async function setupContract(): Promise<void> {
    let blockNumber = await ethers.provider.getBlockNumber();
    initialBlock = blockNumber + 50;

    let factoryMasterchef = await ethers.getContractFactory("MasterChefScomp");
    masterchefScomp = await factoryMasterchef.deploy(
        tokenLockAddress,
        veCrvAddress,
        tokenPerBlock,
        initialBlock
    );

    console.log("Masterchef contract deployed to address: ", masterchefScomp.address);

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
            address: masterchefScomp.address,
            constructorArguments: [
                tokenLockAddress,
                veCrvAddress,
                tokenPerBlock,
                initialBlock
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

