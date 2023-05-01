import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const { run, ethers } = hardhat;
let deployer : SignerWithAddress;

async function main(): Promise<void> {
  await run('compile');
  [deployer] = await ethers.getSigners();

}

main()
    .then(async () => {
        let governance = deployer.address;
        let strategist = deployer.address;
        let rewards = deployer.address;

        let factoryController = await ethers.getContractFactory("SCompController")
        let transactionRequest = await factoryController.deploy(
            governance,
            strategist,
            rewards,
            {gasPrice: 500000000}
        );


        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

