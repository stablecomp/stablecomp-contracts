import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const { run, ethers } = hardhat;
let deployer : SignerWithAddress;

import {poolCurveTask} from "../01_task/curve/curveTask";
import {utilsTask} from "../01_task/standard/utilsTask";
const info = require('../../info/infoPool/frax3crv.json');

async function main(): Promise<void> {
  await run('compile');
  [deployer] = await ethers.getSigners();
}


main()
    .then(async () => {
        let whaleAccountAddress = info.accountDepositAddress1
        console.log("LP balance: ", ethers.utils.formatEther(await utilsTask.getBalanceERC20(whaleAccountAddress, info.wantAddress)))
        console.log("Token deposit balance: ", ethers.utils.formatEther(await utilsTask.getBalanceERC20(whaleAccountAddress, info.tokenDepositAddress)))
        console.log("ETH balance: ", ethers.utils.formatEther(await ethers.provider.getBalance(whaleAccountAddress)))

        let whaleAccount: SignerWithAddress = await utilsTask.impersonateAccountLocalNode(whaleAccountAddress);
        let lpMinted = await poolCurveTask.addLiquidity(
            whaleAccount,
            info.tokenDepositAddress, info.curveSwapAddress,
            [ethers.utils.parseEther(info.amountToDepositLiquidity), 0], 0,
            "");

        console.log("LP balance: ", ethers.utils.formatEther(await utilsTask.getBalanceERC20(whaleAccountAddress, info.wantAddress)))
        console.log("Token deposit balance: ", ethers.utils.formatEther(await utilsTask.getBalanceERC20(whaleAccountAddress, info.tokenDepositAddress)))
        console.log("ETH balance: ", ethers.utils.formatEther(await ethers.provider.getBalance(whaleAccountAddress)))
        console.log("LP minted: ", lpMinted)
        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

