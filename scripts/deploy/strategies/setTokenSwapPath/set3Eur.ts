import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {strategyTask} from "../../../01_task/sCompTask";

const { run, ethers } = hardhat;

const threeEurAddress = require('../../../../info/deploy_address/address_scaling_node/strategies/3Eur/3Eur.json');

let deployer : SignerWithAddress;

async function main(): Promise<void> {
  await run('compile');
  [deployer] = await ethers.getSigners();
}

main()
    .then(async () => {
        await strategyTask.setTokenSwapPathConfig(threeEurAddress.sCompStrategy.address, "crv_eurT")
        await strategyTask.setTokenSwapPathConfig(threeEurAddress.sCompStrategy.address, "cvx_eurT")
        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

