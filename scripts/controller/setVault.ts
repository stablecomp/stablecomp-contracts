import {ethers} from "hardhat";
const controllerJson = require('../../info/deploy_address/eth_mainnet/controller/sCompControllerContract.json');

async function main(): Promise<void> {

}

main()
    .then(async () => {
        let controllerAddress = controllerJson.sCompController.address;
        let wantAddress = "0x3175Df0976dFA876431C2E9eE6Bc45b65d3473CC";
        let sCompVaultAddress = "0x8f5adC58b32D4e5Ca02EAC0E293D35855999436C";

        let sCompControllerFactory = await ethers.getContractFactory("SCompController");
        let sCompController = await sCompControllerFactory.attach(controllerAddress);
        const [deployer] = await ethers.getSigners();
        let tx = await sCompController.connect(deployer).setVault(wantAddress, sCompVaultAddress);
        await tx.wait();

    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

