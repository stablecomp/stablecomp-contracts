import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers } = hardhat;

let deployer : SignerWithAddress;

// contract deploy
let sCompTokenContract : Contract;

async function main(): Promise<void> {
    await run('compile');
    [deployer] = await ethers.getSigners();
}

async function setupContract(): Promise<void> {
    // deploy stableComp token
    let tokenScompFactory = await ethers.getContractFactory("StableCompToken")
    sCompTokenContract = await tokenScompFactory.deploy();
    await sCompTokenContract.deployed();

    console.log("SComp token deployed to: ", sCompTokenContract.address)
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
            address: sCompTokenContract.address,
            constructorArguments: [],
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

