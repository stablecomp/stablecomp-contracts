import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers, upgrades } = hardhat;

let deployer : SignerWithAddress;

// contract deploy
let sCompController : Contract;

async function main(): Promise<void> {
  await run('compile');
  [deployer] = await ethers.getSigners();

}

async function setupContract(): Promise<void> {
    // deploy controller
    let factoryController = await ethers.getContractFactory("SCompController")
    sCompController = await factoryController.deploy(
        deployer.address,
        deployer.address,
        deployer.address,
    );
    await sCompController.deployed();

    console.log("Controller deployed to: ", sCompController.address)
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
            address: sCompController.address,
            constructorArguments: [deployer.address, deployer.address, deployer.address],
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

