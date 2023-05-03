import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {strategyTask} from "../01_task/sCompTask";
const { ethers } = hardhat;

let deployer : SignerWithAddress;

async function main(): Promise<void> {
  [deployer] = await ethers.getSigners();
  console.log("Deployer is: ", deployer.address);
}

  main()
    .then(async () => {
        let strategyAddress = "0x05bc871D6BB506A3cD2Ab05A1336ef50B5a75500"
        let tokenCompoundAddress = await strategyTask.getTokenCompound(strategyAddress);
        console.log("tokenCompoundAddress");
        console.log(tokenCompoundAddress);
        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

