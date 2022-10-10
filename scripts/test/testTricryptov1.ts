import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {deploy} from "@openzeppelin/hardhat-upgrades/dist/utils";
import {BigNumber} from "ethers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers, upgrades } = hardhat;

const crv3CryptoABI = require('../../abi/3crv.json');
const curveCryptoSwapABI = require('../../abi/curveCryptoSwap.json');
const wethABI = require('../../abi/weth.json');
const boosterABI = require('../../abi/booster.json');
const gauge_ABI = require('../../abi/gauge.json');

const curveSwapABI = require('../../abi/europoolSwap.json');
const info = require('../../strategyInfo/infoPool/tricrypto.json');

let deployer : SignerWithAddress;
let governance : SignerWithAddress;
let strategist : SignerWithAddress;
let rewards : SignerWithAddress;
let account1 : SignerWithAddress;
let account2 : SignerWithAddress;
let wantAccount : SignerWithAddress;
let wethAccount1 : SignerWithAddress;
let wethAccount2 : SignerWithAddress;
let wethAccount3 : SignerWithAddress;
let wethAccount4 : SignerWithAddress;
let wethAccount5 : SignerWithAddress;
let wethAccount6 : SignerWithAddress;

let sCompVaultv1 : Contract;
let sCompVaultv2 : Contract;
let sCompControllerv1 : Contract;
let sCompControllerv2 : Contract;
let sCompStrategyTricryptov1 : Contract;
let sCompStrategyTricryptov2 : Contract;
let curveSwapWrapped : Contract;
let crv3CryptoContract: Contract;
let wethContract: Contract;
let boosterContract: Contract;
let gaugeContract: Contract;

let nameStrategy = info.nameStrategy
let want = info.wantAddress; // crv3crypto
let curveCryptoSwapAddress = info.curveSwapAddress; // pool tricrypto2 curve
//let curveCryptoSwapAddress = "0xD51a44d3FaE010294C616388b506AcdA1bfAAE46"; // pool tricrypto2 curve
let tokenDepositAddress = info.tokenDepositAddress;
let accountDepositAddress1 = info.accountDepositAddress1;
let accountDepositAddress2 = info.accountDepositAddress2;
let accountDepositAddress3 = info.accountDepositAddress3;
let accountDepositAddress4 = info.accountDepositAddress4;
let accountDepositAddress5 = info.accountDepositAddress5;
let accountDepositAddress6 = info.accountDepositAddress6;
let baseRewardPoolAddress = info.baseRewardPoolAddress;
let tokenCompoundAddress = info.tokenCompoundAddress

let boosterAddress = "0xF403C135812408BFbE8713b5A23a04b3D48AAE31";

let maxUint = ethers.constants.MaxUint256;
let blockOneDay: any = 6646;
let blockTime: any = 13;
let dayToMine: any = 7;
let pidPool = info.pidPool;
let nElementPool = info.nElementPool;
let tokenCompoundPosition = info.tokenCompoundPosition;


let depositv1Value: any = [];
let depositv2Value: any = [];

let amountToDepositLiquidity: any = ethers.utils.parseEther(info.amountToDepositLiquidity);

async function main(): Promise<void> {
  await run('compile');
  [deployer, governance, strategist, rewards, account1, account2] = await ethers.getSigners();
}

async function setupContractv1(): Promise<void> {
  // deploy controller

  let factoryController = await ethers.getContractFactory("SCompController")
  sCompControllerv1 = await upgrades.deployProxy(factoryController, [
    governance.address,
    strategist.address,
    rewards.address,
  ]);
  await sCompControllerv1.deployed();

  console.log("Controller deployed to: ", sCompControllerv1.address)

  // deploy sCompVault
  let factoryVault = await ethers.getContractFactory("SCompVault")
  sCompVaultv1 = await factoryVault.deploy(want, sCompControllerv1.address);
  await sCompVaultv1.deployed();

  console.log("Vault deployed to: ", sCompVaultv1.address)

  // deploy strategies
  let factoryStrategy = await ethers.getContractFactory("SCompStrategyV1")
  sCompStrategyTricryptov1 = await upgrades.deployProxy(factoryStrategy, [
      nameStrategy,
      governance.address,
      strategist.address,
      sCompControllerv1.address,
      want,
      tokenCompoundAddress,
      pidPool,
      [2000, 0, 0], // original fee withdraw 10
      {swap: curveCryptoSwapAddress, tokenCompoundPosition: tokenCompoundPosition, numElements: nElementPool}
  ]);
  await sCompStrategyTricryptov1.deployed();

  console.log("Strategy v1 deployed to: ", sCompStrategyTricryptov1.address)

  // set strategy in controller
  await sCompControllerv1.connect(governance).approveStrategy(want, sCompStrategyTricryptov1.address);
  await sCompControllerv1.connect(governance).setStrategy(want, sCompStrategyTricryptov1.address);
  await sCompControllerv1.connect(governance).setVault(want, sCompVaultv1.address);
}

async function setupContractv2(): Promise<void> {
  // deploy controller

  let factoryController = await ethers.getContractFactory("SCompController")
  sCompControllerv2 = await upgrades.deployProxy(factoryController, [
    governance.address,
    strategist.address,
    rewards.address,
  ]);
  await sCompControllerv2.deployed();

  console.log("Controller deployed to: ", sCompControllerv2.address)

  // deploy sCompVault
  let factoryVault = await ethers.getContractFactory("SCompVault")
  sCompVaultv2 = await factoryVault.deploy(want, sCompControllerv2.address);
  await sCompVaultv2.deployed();

  console.log("Vault deployed to: ", sCompVaultv2.address)

  // deploy strategies
  let pid = 38;
  let factoryStrategy = await ethers.getContractFactory("SCompStrategyTricryptov2")
  sCompStrategyTricryptov2 = await upgrades.deployProxy(factoryStrategy, [
    governance.address,
    strategist.address,
    sCompControllerv2.address,
    want,
    pid,
    [2000, 0, 0], // original fee withdraw 10
    {swap: curveCryptoSwapAddress, wbtcPosition: 1, numElements: 3}
  ]);
  await sCompStrategyTricryptov2.deployed();

  console.log("Strategy v2 deployed to: ", sCompStrategyTricryptov2.address)

  // set strategy in controller
  await sCompControllerv2.connect(governance).approveStrategy(want, sCompStrategyTricryptov2.address);
  await sCompControllerv2.connect(governance).setStrategy(want, sCompStrategyTricryptov2.address);
  await sCompControllerv2.connect(governance).setVault(want, sCompVaultv2.address);
}

async function setupUtilityContract(): Promise<void> {

  // deploy curveSwapWrapped
  let factoryCurveSwapWrapped = await ethers.getContractFactory("CurveSwapWrappedTricrypto");
  curveSwapWrapped = await factoryCurveSwapWrapped.deploy();

  // get crv3cryptoContract
  crv3CryptoContract = await new ethers.Contract(want, crv3CryptoABI, ethers.provider);

  // get wethContract
  wethContract = await new ethers.Contract(tokenDepositAddress, wethABI, ethers.provider);
  boosterContract = await new ethers.Contract(boosterAddress, boosterABI, ethers.provider);

}

async function impersonateAccountv1(): Promise<void> {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [accountDepositAddress1],
  });
  wethAccount1 = await ethers.getSigner(accountDepositAddress1);

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [accountDepositAddress2],
  });
  wethAccount2 = await ethers.getSigner(accountDepositAddress2);

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [accountDepositAddress3],
  });
  wethAccount3 = await ethers.getSigner(accountDepositAddress3);

}

async function impersonateAccountv2(): Promise<void> {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [accountDepositAddress4],
  });
  wethAccount4 = await ethers.getSigner(accountDepositAddress4);

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [accountDepositAddress5],
  });
  wethAccount5 = await ethers.getSigner(accountDepositAddress5);

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [accountDepositAddress6],
  });
  wethAccount6 = await ethers.getSigner(accountDepositAddress6);

}

async function addLiquidity(account: SignerWithAddress): Promise<void> {

  let balanceWethAccount = await wethContract.balanceOf(account.address);
  //console.log("Deployer balance: ", ethers.utils.formatEther(balanceWethAccount))

  // transfer weth to curveSwapWrapped
  await wethContract.connect(account).transfer(curveSwapWrapped.address, amountToDepositLiquidity);

  let balanceBeforeAddLiquidity = await crv3CryptoContract.balanceOf(account.address);
  //console.log("BalanceBeforeAddLiquidity: ", ethers.utils.formatEther(balanceBeforeAddLiquidity));

  let tx = await curveSwapWrapped.connect(account).addLiquidity([0,0,amountToDepositLiquidity],0);
  await tx.wait();

  let balanceAfterAddLiquidity = await crv3CryptoContract.balanceOf(account.address);
  //console.log("BalanceAfterAddLiquidity: ", ethers.utils.formatEther(balanceAfterAddLiquidity));
}

async function depositv1(account: SignerWithAddress, index: any): Promise<void> {
  let balancecrv3crypto = await crv3CryptoContract.balanceOf(account.address);
  console.log("Deposit of ", account.address, " is: ", ethers.utils.formatEther(balancecrv3crypto))
  depositv1Value[index] = balancecrv3crypto;
  await crv3CryptoContract.connect(account).approve(sCompVaultv1.address, maxUint)
  let tx = await sCompVaultv1.connect(account).depositAll();
  await tx.wait();

  let balanceShare = await sCompVaultv1.balanceOf(account.address);
  //console.log("Share balance after deposit: ", ethers.utils.formatEther(balanceShare));
}

async function depositv2(account: SignerWithAddress, index: any): Promise<void> {
  let balancecrv3crypto = await crv3CryptoContract.balanceOf(account.address);
  console.log("Deposit of ", account.address, " is: ", ethers.utils.formatEther(balancecrv3crypto))
  depositv2Value[index] = balancecrv3crypto;
  await crv3CryptoContract.connect(account).approve(sCompVaultv2.address, maxUint)
  let tx = await sCompVaultv2.connect(account).depositAll();
  await tx.wait();

  let balanceShare = await sCompVaultv2.balanceOf(account.address);
  //console.log("Share balance after deposit: ", ethers.utils.formatEther(balanceShare));
}

async function earnv1(): Promise<void> {

  console.log("Earn v1...")
  let tx = await sCompVaultv1.earn();
  await tx.wait();

}

async function earnv2(): Promise<void> {

  console.log("Earn v2...")
  let tx = await sCompVaultv2.earn();
  await tx.wait();

}

async function tendv1(): Promise<void> {

  console.log("Tend v1...")
  let tx = await sCompStrategyTricryptov1.connect(governance).tend();
  await tx.wait();

}

async function tendv2(): Promise<void> {

  console.log("Tend v2...")
  let tx = await sCompStrategyTricryptov2.connect(governance).tend();
  await tx.wait();

}

async function harvestv1(): Promise<void> {

  console.log("Harvest...")
  let tx = await sCompStrategyTricryptov1.connect(governance).harvest();
  await tx.wait();

}

async function harvestv2(): Promise<void> {

  console.log("Harvest...")
  let tx = await sCompStrategyTricryptov2.connect(governance).harvest();
  await tx.wait();

}

async function mineBlock(dayToMine: any): Promise<void> {
  let blockNumber = await ethers.provider.getBlockNumber();
  let block = await ethers.provider.getBlock(blockNumber);
  let newTimestamp = block.timestamp + blockTime

  console.log("Mine block...");
  for (let i = 0; i < blockOneDay*dayToMine; i++) {
    newTimestamp = newTimestamp + blockTime
    await ethers.provider.send('evm_mine', [newTimestamp]);
  }

}

async function mineBlockFake(): Promise<void> {
  let blockNumber = await ethers.provider.getBlockNumber();
  let block = await ethers.provider.getBlock(blockNumber);
  let newTimestamp = block.timestamp + (blockTime * 10000000)

  console.log("Mine block...");
  for (let i = 0; i < blockOneDay; i++) {
    newTimestamp = newTimestamp + blockTime
    await ethers.provider.send('evm_mine', [newTimestamp]);
  }

}

async function withdrawv1(account: SignerWithAddress, index: any): Promise<void> {
  console.log("Start withdraw...")

  let tx = await sCompVaultv1.connect(account).withdrawAll();
  await tx.wait();

  let balanceShare = await sCompVaultv1.balanceOf(account.address);
  //console.log("Share balance after deposit: ", ethers.utils.formatEther(balanceShare));

  let balanceAfterWantVault = await crv3CryptoContract.balanceOf(account.address);
  console.log("Want of ", account.address," after withdraw: ", await ethers.utils.formatEther(balanceAfterWantVault));
  let diff = balanceAfterWantVault.sub(depositv1Value[index])
  console.log("Diff v1: ", ethers.utils.formatEther(diff))

}

async function withdrawv2(account: SignerWithAddress, index: any): Promise<void> {
  console.log("Start withdraw...")

  let tx = await sCompVaultv2.connect(account).withdrawAll();
  await tx.wait();

  let balanceShare = await sCompVaultv2.balanceOf(account.address);
  //console.log("Share balance after deposit: ", ethers.utils.formatEther(balanceShare));

  let balanceAfterWantVault = await crv3CryptoContract.balanceOf(account.address);
  console.log("Want of ", account.address," after withdraw: ", await ethers.utils.formatEther(balanceAfterWantVault));
  let diff = balanceAfterWantVault.sub(depositv2Value[index])
  console.log("Diff v2: ", ethers.utils.formatEther(diff))

}

async function earnMarkReward(): Promise<void> {

  await boosterContract.connect(governance).earmarkRewards(38);
}

async function getTotalValueLocked(): Promise<void> {
  // get totalValueLocked
  let poolInfo = await boosterContract.poolInfo(pidPool);
  let gaugeAddress = poolInfo.gauge;
  console.log("gaugeAddress: ", gaugeAddress);
  gaugeContract = await new ethers.Contract(gaugeAddress, gauge_ABI, ethers.provider);

  let balanceOfStrategyInGauge = await gaugeContract.balanceOf(sCompStrategyTricryptov1.address);
  console.log("Balance of strategy in gauge: ", ethers.utils.formatEther(balanceOfStrategyInGauge));

  let pricePerFullShare = await sCompVaultv1.getPricePerFullShare()
  console.log("price per full share: ", ethers.utils.formatEther(pricePerFullShare));

  let balanceVault = await sCompVaultv1.balance();
  console.log("balance: ", ethers.utils.formatEther(balanceVault));

}



  main()
    .then(async () => {
      await setupContractv1();
      await setupContractv2();
      await setupUtilityContract();
      await impersonateAccountv1();
      await impersonateAccountv2();
      await addLiquidity(wethAccount1);
      await addLiquidity(wethAccount2);
      await addLiquidity(wethAccount3);
      await addLiquidity(wethAccount4);
      await addLiquidity(wethAccount5);
      await addLiquidity(wethAccount6);
      await depositv1(wethAccount1, 0);
      await depositv1(wethAccount2, 1);
      await depositv1(wethAccount3, 2);
      await depositv2(wethAccount4, 0);
      await depositv2(wethAccount5, 1);
      await depositv2(wethAccount6, 2);
      await getTotalValueLocked()
      await earnv1();
      await earnv2();
      await mineBlock(dayToMine);
      await tendv1();
      await tendv2();
      await harvestv1();
      await harvestv2();
      await earnMarkReward();
      await mineBlock(dayToMine);
      await tendv1();
      await tendv2();
      await harvestv1();
      await harvestv2();
      await getTotalValueLocked()
      await withdrawv1(wethAccount1, 0);
      await withdrawv1(wethAccount2, 1);
      await withdrawv1(wethAccount3, 2);
      await withdrawv2(wethAccount4, 0);
      await withdrawv2(wethAccount5, 1);
      await withdrawv2(wethAccount6, 2);

      process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

