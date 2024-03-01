import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const {ethers} = hardhat;
let deployer: SignerWithAddress;

import {taskPoolCurve} from "../01_task/curve/curveTask";
import {utilsTask} from "../01_task/standard/utilsTask";
import {ConfigStrategy, deployScompTask} from "../01_task/sCompTask";
import {erc20Task} from "../01_task/standard/erc20Task";

async function main(): Promise<void> {
    [deployer] = await ethers.getSigners();

    console.log("Deployer address: ", deployer.address)

    let usdtAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
    let zapperAddress = "0xC1435960b07655E6F8678ec53db4D14d15FD1589"
    let factoryAbi = ["function recoverTokens(address _token, uint256 _amount) external"]

    let zapper = await ethers.getContractAt(factoryAbi, zapperAddress);

    let balanceUSDTBefore = await erc20Task.balanceOf(usdtAddress, deployer.address);
    console.log("Balance USDT before: ", ethers.utils.formatUnits(balanceUSDTBefore, 6));

    let balanceContract = await erc20Task.balanceOf(usdtAddress, zapperAddress);

    let tx = await zapper.recoverTokens(usdtAddress, balanceContract);
    await tx.wait();

    let balanceUSDTAfter = await erc20Task.balanceOf(usdtAddress, deployer.address);
    console.log("Balance USDT after: ", ethers.utils.formatUnits(balanceUSDTAfter, 6));

    let withdraw = balanceUSDTAfter.sub(balanceUSDTBefore);
    console.log("Withdraw: ", ethers.utils.formatUnits(withdraw, 6));
}


main()
    .then(async () => {
        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });
