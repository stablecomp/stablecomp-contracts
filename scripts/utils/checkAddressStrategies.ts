import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { ethers } = hardhat;

const mainnetAddress = require('../../info/deploy_address/eth_mainnet/controller/sCompControllerContract.json');

let deployer : SignerWithAddress;

// contract deploy
let sCompController : Contract;

let wantAddress = "0xe6b5cc1b4b47305c58392ce3d359b10282fc36ea";

async function main(): Promise<void> {

    [deployer] = await ethers.getSigners();
    console.log("Deployer address: ", deployer.address)
}

async function getContractController(): Promise<void> {
    let factoryScompController = await ethers.getContractFactory("SCompController");
    sCompController = await factoryScompController.attach(mainnetAddress.sCompController.address);

    console.log("Controller deployed to: ", sCompController.address);
}

  main()
    .then(async () => {
        await getContractController();
        let vaultAddress = await sCompController.vaults(wantAddress);
        console.log("Vault address: ", vaultAddress)
        let strategyAddress = await sCompController.strategies(wantAddress);
        console.log("Strategy address: ", strategyAddress)

        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

