import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers, upgrades } = hardhat;

const info = require('../../strategyInfo/infoPool/fraxUsdc.json');

let deployer : SignerWithAddress;
let governance : SignerWithAddress;
let strategist : SignerWithAddress;
let rewards : SignerWithAddress;

// contract deploy
let sCompVault : Contract;
let sCompController : Contract;
let sCompStrategy : Contract;

// variable address
let wantAddress = info.wantAddress; // **name** // 18 decimals
let tokenCompoundAddress = info.tokenCompoundAddress; // **name** // 18 decimals
let curveSwapAddress = info.curveSwapAddress; // pool **name pool** curve

// convex pool info
let nameStrategy = info.nameStrategy
let pidPool = info.pidPool;
let nElementPool = info.nElementPool;
let tokenCompoundPosition = info.tokenCompoundPosition;

// fee config
let feeGovernance = info.feeGovernance;
let feeStrategist = info.feeStrategist;
let feeWithdraw = info.feeWithdraw;

async function main(): Promise<void> {
  await run('compile');
  [deployer] = await ethers.getSigners();
}

async function verify(): Promise<void> {

    // Verifying contracts
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost"
    ) {

        // Wait 30 seconds
        //await new Promise(resolve => setTimeout(resolve, 30000));
/*
        await run("verify:verify", {
            address: "0x8cAEF41C1B564BB20be967E539C8a043F133C6E5",
            constructorArguments: [deployer.address, deployer.address, deployer.address],
        });

        await run("verify:verify", {
            address: "0x3f0d8746d07e7b60974Bbb1F275CD61B071d69D5",
            constructorArguments: [wantAddress, "0x8cAEF41C1B564BB20be967E539C8a043F133C6E5"],
        });

 */
        await run("verify:verify", {
            address: "0xb47364c23b188f86d6c445d4a2dbfc6914fb54bd",
            /*constructorArguments: [
                nameStrategy,
                deployer.address,
                deployer.address,
                "0x8cAEF41C1B564BB20be967E539C8a043F133C6E5",
                wantAddress,
                tokenCompoundAddress,
                pidPool,
                [feeGovernance, feeStrategist, feeWithdraw],
                {swap: curveSwapAddress, tokenCompoundPosition: tokenCompoundPosition, numElements: nElementPool}
            ],

             */
            constructorArguments:[]
        });
    }
}


  main()
    .then(async () => {
      await verify();
      process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

