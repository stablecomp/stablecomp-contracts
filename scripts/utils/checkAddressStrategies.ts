import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {deploy} from "@openzeppelin/hardhat-upgrades/dist/utils";

const { run, ethers, upgrades } = hardhat;

const info = require('../../strategyInfo/infoPool/fraxUsdc.json');
const mainnetAddress = require('../../address/address_scaling_node/mainAddress.json');

let deployer : SignerWithAddress;

// contract deploy
let sCompController : Contract;

let wantAddress = "0x19b080FE1ffA0553469D20Ca36219F17Fcf03859";

async function main(): Promise<void> {

    await run('compile');
    [deployer] = await ethers.getSigners();
    console.log("Deployer addresss: ", deployer.address)
}

async function getContractController(): Promise<void> {
    let factoryScompController = await ethers.getContractFactory("SCompController");
    sCompController = await factoryScompController.attach(mainnetAddress.sCompController.address);

    console.log("SComp vault deployed to: ", sCompController.address);
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

