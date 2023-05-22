import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
const { ethers } = hardhat;
let deployer : SignerWithAddress;

import {boosterTask} from "../../01_task/convex/convexTask";
import {erc20Task} from "../../01_task/standard/erc20Task";

async function main(): Promise<void> {
  [deployer] = await ethers.getSigners();
}


main()
    .then(async () => {
        let poolLength = await boosterTask.getPoolLength();
        for (let i = 0; i < poolLength; i++) {
            let poolInfo = await boosterTask.getPoolInfo(i);
            let symbol = await erc20Task.getSymbol(poolInfo.lptoken)
            console.log("PID: ", i, " -- Symbol: ", symbol);
            if (poolInfo.lptoken.toUpperCase() == ("0xB30dA2376F63De30b42dC055C93fa474F31330A5").toUpperCase()) {
                console.log(" Symbol: ", symbol);
                console.log("Lp token: ", poolInfo.lptoken);
                console.log("Token: ", poolInfo.token);
                console.log("Gauge: ", poolInfo.gauge);
                console.log("Crv rewards: ", poolInfo.crvRewards);
            }
        }
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

