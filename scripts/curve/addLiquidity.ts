import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const { ethers } = hardhat;
let deployer : SignerWithAddress;

import {taskPoolCurve} from "../01_task/curve/curveTask";
import {utilsTask} from "../01_task/standard/utilsTask";
import {ConfigStrategy, deployScompTask} from "../01_task/sCompTask";

async function main(): Promise<void> {
  [deployer] = await ethers.getSigners();
}


main()
    .then(async () => {
        const info: ConfigStrategy = await deployScompTask.getConfig("eusdfraxbp");

        let whaleAccountAddress = info.account1
        console.log("LP balance: ", ethers.utils.formatEther(await utilsTask.getBalanceERC20(whaleAccountAddress, info.want)))
        console.log("Token deposit balance: ", ethers.utils.formatEther(await utilsTask.getBalanceERC20(whaleAccountAddress, info.tokenDeposit)))
        console.log("ETH balance: ", ethers.utils.formatEther(await ethers.provider.getBalance(whaleAccountAddress)))

        let whaleAccount: SignerWithAddress = await utilsTask.impersonateAccountLocalNode(whaleAccountAddress);
        let lpMinted = await taskPoolCurve.addLiquidity(
            whaleAccount,
            info.tokenDeposit, info.curveSwap,
            info.pathAddLiquidityCurve, 0);

        console.log("LP balance: ", ethers.utils.formatEther(await utilsTask.getBalanceERC20(whaleAccountAddress, info.want)))
        console.log("Token deposit balance: ", ethers.utils.formatEther(await utilsTask.getBalanceERC20(whaleAccountAddress, info.tokenDeposit)))
        console.log("ETH balance: ", ethers.utils.formatEther(await ethers.provider.getBalance(whaleAccountAddress)))
        console.log("LP minted: ", lpMinted)
        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

