import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers } = hardhat;

let deployer : SignerWithAddress;

// contract deploy
let veScompContract : Contract;
let sCompTokenAddress = ""

let name = "Voting Escrow Scomp"
let symbol = "veScomp"
let version = "veScomp1.0.0";

async function main(): Promise<void> {
  await run('compile');
  [deployer] = await ethers.getSigners();
}

async function setupContract(): Promise<void> {
    let factory = await ethers.getContractFactory("veScomp");
    veScompContract = await factory.deploy(
        sCompTokenAddress,
        name,
        symbol,
        version
    );
    await veScompContract.deployed();

    console.log("Voting escrow sComp address: ", veScompContract.address);

    veScompContract = await ethers.getContractAt("veScomp", veScompContract.address, deployer);
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
            address: veScompContract.address,
            constructorArguments: [
                sCompTokenAddress,
                name,
                symbol,
                version
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

