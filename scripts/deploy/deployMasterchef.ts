import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import fs from "fs";

const { run, ethers } = hardhat;

let deployer : SignerWithAddress;

// contract deploy
let masterchefScomp : Contract;
let sCompTokenContractAddress = "0x565328F2B262F1182df8b58e5FFD3bAa570C8498"
let veCrvAddress = "0xfa3315912FcD8ee6E8Feda78853d517b7bbeEDcc"

let tokenPerBlock = 9;
let initialBlock : any;

async function main(): Promise<void> {
  await run('compile');
  [deployer] = await ethers.getSigners();
}

async function deployMasterchef(): Promise<void> {
    let blockNumber = await ethers.provider.getBlockNumber();
    initialBlock = blockNumber + 1800;

    let factoryMasterchef = await ethers.getContractFactory("MasterChefScomp");
    masterchefScomp = await factoryMasterchef.deploy(
        sCompTokenContractAddress,
        veCrvAddress,
        tokenPerBlock,
        initialBlock
    );

    console.log("Masterchef contract deployed to address: ", masterchefScomp.address);

}

async function writeAddressInJson(): Promise<void> {

    let address = {
        masterchefScomp: {
            address: masterchefScomp.address,
            args: {
                sCompTokenAddress: sCompTokenContractAddress,
                veScompAddress: veCrvAddress,
                tokenPerBlock: tokenPerBlock,
                initialBlock: initialBlock
            }
        },
    };

    console.log("address")
    console.log(address)

}


async function verify(): Promise<void> {
    // Verifying contracts
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost" &&
        hardhat.network.name !== "scaling_node" &&
        hardhat.network.name !== "local_node"
    ) {

        // Wait 30 seconds
        await new Promise(resolve => setTimeout(resolve, 30000));

        await run("verify:verify", {
            address: masterchefScomp.address,
            constructorArguments: [
                sCompTokenContractAddress,
                veCrvAddress,
                tokenPerBlock,
                initialBlock
            ],
        });
    }
}


main()
    .then(async () => {
        await deployMasterchef();
        await writeAddressInJson();
        await verify();
        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

