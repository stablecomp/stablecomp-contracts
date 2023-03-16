import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const { run, ethers } = hardhat;
let deployer : SignerWithAddress;

const info = require('../../../info/infoPool/3eur.json');
const tokenInfo = require('../../../info/address_mainnet/tokenInfo.json');
const mainnetAddress = require('../../../info/deploy_address/address_scaling_node/mainAddress.json');
import {deployScompTask, strategyTask} from "../../01_task/sCompTask";

// contract deploy
let sCompVault : Contract;
let sCompStrategy : Contract;

async function main(): Promise<void> {
  await run('compile');
  [deployer] = await ethers.getSigners();
}

main()
    .then(async () => {
        sCompVault = await deployScompTask.deployVault(mainnetAddress.sCompController.address, info.wantAddress, deployer.address, info.feeDeposit);
        sCompStrategy = await deployScompTask.deployStrategy(info.nameStrategy, deployer.address, mainnetAddress.surplusConverterV2Contract.address, mainnetAddress.sCompController.address,
            info.wantAddress, info.tokenCompoundAddress, info.tokenCompoundPosition, info.pidPool, info.feeGovernance, info.feeStrategist, info.feeWithdraw,
            info.curveSwapAddress, info.nElementPool, mainnetAddress.sCompTimelockController.address,
            );

        await strategyTask.setTokenSwapPathConfig(sCompStrategy.address, "crv_eurT")
        await strategyTask.setTokenSwapPathConfig(sCompStrategy.address, "cvx_eurT")

        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

