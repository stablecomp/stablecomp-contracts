import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers, upgrades } = hardhat;

const info = require('../../strategyInfo/infoPool/fraxUsdc.json');
const wethABI = require('../../abi/weth.json');

let deployer : SignerWithAddress;
let governance : SignerWithAddress;
let strategist : SignerWithAddress;
let rewards : SignerWithAddress;

// contract deploy
let sCompVault : Contract;
let sCompController : Contract;
let sCompStrategy : Contract;
let wantContract : Contract;

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

let addressGovernance = "0x2b276218D962dEEbF96C749ffB228601b2C7a587";

async function main(): Promise<void> {
  [deployer] = await ethers.getSigners();

  console.log("Deployer is: ", deployer.address);

  let sCompControllerFactory = await ethers.getContractFactory("SCompController");
  sCompController = sCompControllerFactory.attach("0x8caef41c1b564bb20be967e539c8a043f133c6e5")
  let sCompVaultFactory = await ethers.getContractFactory("SCompVault");
  sCompVault = sCompVaultFactory.attach("0x3f0d8746d07e7b60974Bbb1F275CD61B071d69D5");

  let sCompStrategyFactory = await ethers.getContractFactory("SCompStrategyV1");
  sCompStrategy = sCompStrategyFactory.attach("0xd245ae3e474da334ffd27468b286e38e05d97911");

  wantContract = await new ethers.Contract(wantAddress, wethABI, ethers.provider);
}

async function impersonateAccount(): Promise<void> {
  console.log("Impersonate account...")
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [addressGovernance],
  });
  governance = await ethers.getSigner(addressGovernance);

}

async function harvest(): Promise<void> {

  let tx = await sCompStrategy.connect(deployer).harvest();
  await tx.wait();

  console.log("Harvest executed")

}

async function tend(): Promise<void> {

  let tx = await sCompStrategy.connect(deployer).tend();
  await tx.wait();

  console.log("Tend executed")

}

async function read(): Promise<void> {

  let governance = await sCompStrategy.governance();

  console.log("Governance is: ", governance);
}

  main()
    .then(async () => {
      //await impersonateAccount()
      await read()
      await tend();
      await harvest();
      process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

