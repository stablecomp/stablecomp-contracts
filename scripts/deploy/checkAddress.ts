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

  let sCompControllerFactory = await ethers.getContractFactory("SCompController");
  sCompController = sCompControllerFactory.attach("0x8caef41c1b564bb20be967e539c8a043f133c6e5")
  let sCompVaultFactory = await ethers.getContractFactory("SCompVault");
  sCompVault = sCompVaultFactory.attach("0x3f0d8746d07e7b60974Bbb1F275CD61B071d69D5");

  let sCompStrategyFactory = await ethers.getContractFactory("SCompStrategyV1");
  sCompStrategy = sCompStrategyFactory.attach("0xd245ae3e474da334ffd27468b286e38e05d97911");

  let rewards = await sCompController.rewards();
  console.log("Rewards:", rewards);
  let decimals = await sCompVault.decimals();
  console.log("Decimals:", decimals);
  let want = await sCompStrategy.want();
  console.log("Want: ", want)


}

async function setupContract(): Promise<void> {
  // set strategy in controller
  let tx = await sCompController.connect(deployer).approveStrategy(wantAddress, sCompStrategy.address);
  await tx.wait();
  console.log("Strategy approved in controller");

  tx = await sCompController.connect(deployer).setStrategy(wantAddress, sCompStrategy.address);
  tx.wait();
  console.log("Strategy set in controller");

  tx = await sCompController.connect(deployer).setVault(wantAddress, sCompVault.address);
  tx.wait();
  console.log("Vault set in controller")


}

  main()
    .then(async () => {
      await setupContract();
      process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

