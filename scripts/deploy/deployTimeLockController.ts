import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers, upgrades } = hardhat;

let deployer : SignerWithAddress;

// contract deploy
let sCompTimelockController : Contract;
let minDelay = 86400

async function main(): Promise<void> {
  await run('compile');
  [deployer] = await ethers.getSigners();
}

async function setupContract(): Promise<void> {
    // deploy timeLockController
    let factoryTimeLock = await ethers.getContractFactory("SCompTimeLockController")
    sCompTimelockController = await factoryTimeLock.deploy(
        minDelay,
        [deployer.address],
        [deployer.address]
    );
    await sCompTimelockController.deployed();

    console.log("Timelock controller deployed to: ", sCompTimelockController.address)
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
            address: sCompTimelockController.address,
            constructorArguments: [
                minDelay,
                [deployer.address],
                [deployer.address]
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

