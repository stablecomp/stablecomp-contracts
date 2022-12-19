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
let sCompFarm : Contract;
let sCompToken : Contract;

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

  const balance = await deployer.getBalance();
  let sCompControllerFactory = await ethers.getContractFactory("SCompController");
  sCompController = sCompControllerFactory.attach("0xc6B407503dE64956Ad3cF5Ab112cA4f56AA13517")
  let sCompVaultFactory = await ethers.getContractFactory("SCompVault");
  sCompVault = sCompVaultFactory.attach("0x6A47346e722937B60Df7a1149168c0E76DD6520f");

  let sCompStrategyFactory = await ethers.getContractFactory("SCompStrategyV1");
  sCompStrategy = sCompStrategyFactory.attach("0x7A28cf37763279F774916b85b5ef8b64AB421f79");

  let sCompFarmFactory = await ethers.getContractFactory("MasterChefScomp");
  sCompFarm = sCompFarmFactory.attach("0xc3023a2c9f7B92d1dd19F488AF6Ee107a78Df9DB");

  let sCompTokenFactory = await ethers.getContractFactory("GenericERC20");
  sCompToken = sCompTokenFactory.attach("0x2d13826359803522cCe7a4Cfa2c1b582303DD0B4");

  console.log("Get contract ok...")
}


async function depositFarming(accounts: SignerWithAddress[], pid: any, amountToDeposit: any): Promise<void> {
  if (amountToDeposit > 0 ) {
    for (let i = 0; i < accounts.length; i++) {
      //let balance = await sCompToken.balanceOf(accounts[i].address);
      //console.log("Balance: ", ethers.utils.formatEther(balance))
      let txApprove = await sCompVault.connect(accounts[i]).approve(sCompFarm.address, amountToDeposit);
      await txApprove.wait();
      console.log("Approve ok")
    }


    for (let i = 0; i < accounts.length; i++) {
      let tx = await sCompFarm.connect(accounts[i]).deposit(pid, amountToDeposit);
      await tx.wait();
    }
  }
}

  main()
    .then(async () => {
      console.log("Deployer address: ",  deployer.address)
      let initialBalance:any = await deployer.getBalance();

      console.log("Initial balance: ", initialBalance)

      await depositFarming([deployer], 0, ethers.utils.parseEther("1"));
      process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

