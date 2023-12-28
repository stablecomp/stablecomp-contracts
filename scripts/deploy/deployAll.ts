import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const { run, ethers } = hardhat;

import { deployScompTask } from "../01_task/sCompTask";
let tokenInfo = require('../../info/address_mainnet/tokenInfo.json')

let deployer : SignerWithAddress;
let account2 : SignerWithAddress;

// contract deploy
let sCompTokenContract : Contract;
let veScompContract : Contract;
let masterchefScompContract : Contract;
let feeDistributionContract : Contract;
let surplusConverterContract : Contract;
let sCompControllerContract : Contract;
let sCompTimelockControllerContract : Contract;
let oracleRouterContract : Contract;

async function main(): Promise<void> {

    await run('compile');
    [deployer, account2] = await ethers.getSigners();
    console.log("Deployer address: ", deployer.address)
    console.log("Account 2 address: ", account2.address)
    console.log("----------------------------")
}

main()
    .then(async () => {
        let initialBalance:any = await deployer.getBalance();
        console.log("Initial balance: ", ethers.utils.formatEther(initialBalance))

        //await deployOneClick();
        sCompTokenContract = await deployScompTask.deploySCompToken();
        veScompContract = await deployScompTask.deployVe(sCompTokenContract.address);
        masterchefScompContract = await deployScompTask.deployMasterchef(sCompTokenContract.address, veScompContract.address);
        feeDistributionContract = await deployScompTask.deployFeeDistribution(sCompTokenContract.address, veScompContract.address, deployer.address, deployer.address);
        surplusConverterContract = await deployScompTask.deploySurplusConverter(feeDistributionContract.address, tokenInfo.weth.address, deployer.address, deployer.address, [deployer.address, deployer.address])
        sCompTimelockControllerContract = await deployScompTask.deployTimeLockController([deployer.address], [deployer.address]);

        sCompControllerContract = await deployScompTask.deployController(deployer.address, deployer.address, deployer.address);
        oracleRouterContract = await deployScompTask.deployOracleRouter();

        let finalBalance:any = await deployer.getBalance();
        let totalFee = initialBalance.sub(finalBalance);

        console.log("Deploy cost: ", ethers.utils.formatEther(totalFee));

        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

