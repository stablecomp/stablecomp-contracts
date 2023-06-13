import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { ethers } = hardhat;

let deployer : SignerWithAddress;

async function main(): Promise<void> {

    [deployer] = await ethers.getSigners();
    console.log("Deployer address: ", deployer.address)

    console.log("balance is: ", await ethers.provider.getBalance("0x8e35a52ed9e5093ea55c62856afe148f16b870e1"))
    console.log("balance is: ", await ethers.provider.getBalance("0xdf371d2d4b4736082a5b7e87dc2f35cfe9d7bfa5"))
    console.log("balance is: ", await ethers.provider.getBalance("0x2b276218D962dEEbF96C749ffB228601b2C7a587"))
}

main()
    .then(async () => {

    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

