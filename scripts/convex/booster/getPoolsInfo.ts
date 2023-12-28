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
            if (poolInfo.lptoken.toUpperCase() == ("0xEcd5e75AFb02eFa118AF914515D6521aaBd189F1").toUpperCase()) {
                console.log(" Symbol: ", symbol);
                console.log("Lp token: ", poolInfo.lptoken);
                console.log("Token: ", poolInfo.token);
                console.log("Gauge: ", poolInfo.gauge);
                console.log("Crv rewards: ", poolInfo.crvRewards);
            }
        }
        process.exit(0)
    })

    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

