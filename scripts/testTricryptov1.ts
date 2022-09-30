import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {deploy} from "@openzeppelin/hardhat-upgrades/dist/utils";
import {BigNumber} from "ethers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers, upgrades } = hardhat;

const crv3CryptoABI = require('../abi/3crv.json');
const curveCryptoSwapABI = require('../abi/curveCryptoSwap.json');
const wethABI = require('../abi/weth.json');
const boosterABI = require('../abi/booster.json');

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
let cvxCrv3CryptoContract: Contract;
let curveTricryptoPool: Contract;
let wethContract: Contract;
let cvxContract: Contract;
let boosterContract: Contract;

let want = "0xc4ad29ba4b3c580e6d59105fff484999997675ff"; // crv3crypto
let curveCryptoSwapAddress = "0x3993d34e7e99Abf6B6f367309975d1360222D446"; // pool tricrypto2 curve
//let curveCryptoSwapAddress = "0xD51a44d3FaE010294C616388b506AcdA1bfAAE46"; // pool tricrypto2 curve
let wethContractAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
let wethAddress1 = "0x06920c9fc643de77b99cb7670a944ad31eaaa260";
let wethAddress2 = "0x06601571aa9d3e8f5f7cdd5b993192618964bab5";
let wethAddress3 = "0x2feb1512183545f48f6b9c5b4ebfcaf49cfca6f3";
let wethAddress4 = "0x56178a0d5f301baf6cf3e1cd53d9863437345bf9";
let wethAddress5 = "0x6b44ba0a126a2a1a8aa6cd1adeed002e141bcd44";
let wethAddress6 = "0x6a3528677e598b47952749b08469ce806c2524e7";
let stakerAddress = "0x989aeb4d175e16225e39e87d0d97a3360524ad80";
let gaugeAddress = "0xDeFd8FdD20e0f34115C7018CCfb655796F6B2168";
let cvxCrv3CryptoAddress = "0x903C9974aAA431A765e60bC07aF45f0A1B3b61fb";
let baseRewardPoolAddress = "0x9D5C5E364D81DaB193b72db9E9BE9D8ee669B652";
let cvxAddress = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B";
let boosterAddress = "0xF403C135812408BFbE8713b5A23a04b3D48AAE31";

let maxUint = ethers.constants.MaxUint256;
let blockOneDay: any = 6646;
let blockTime: any = 13;
let dayToMine: any = 7;

let depositv1Value: any = [];
let depositv2Value: any = [];

let ethToDeposit: any = ethers.utils.parseEther("100");

async function main(): Promise<void> {
  await run('compile');
  [deployer, governance, strategist, rewards, account1, account2] = await ethers.getSigners();
}

async function setupContractv1(): Promise<void> {
  // deploy controller
  let split = 500;

  let factoryController = await ethers.getContractFactory("SCompController")
  sCompControllerv1 = await upgrades.deployProxy(factoryController, [
    governance.address,
    strategist.address,
    rewards.address,
    split
  ]);
  await sCompControllerv1.deployed();

  console.log("Controller deployed to: ", sCompControllerv1.address)

  // deploy sCompVault
  let factoryVault = await ethers.getContractFactory("SCompVault")
  sCompVaultv1 = await factoryVault.deploy(want, sCompControllerv1.address);
  await sCompVaultv1.deployed();

  console.log("Vault deployed to: ", sCompVaultv1.address)

  // deploy strategies
  let pid = 38;
  let factoryStrategy = await ethers.getContractFactory("SCompStrategyTricryptov1")
  sCompStrategyTricryptov1 = await upgrades.deployProxy(factoryStrategy, [
    governance.address,
    strategist.address,
    sCompControllerv1.address,
    want,
    pid,
    [2000, 0, 0], // original fee withdraw 10
    {swap: curveCryptoSwapAddress, wbtcPosition: 1, numElements: 3}
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
  let split = 500;

  let factoryController = await ethers.getContractFactory("SCompController")
  sCompControllerv2 = await upgrades.deployProxy(factoryController, [
    governance.address,
    strategist.address,
    rewards.address,
    split
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

  cvxCrv3CryptoContract = await new ethers.Contract(cvxCrv3CryptoAddress, crv3CryptoABI, ethers.provider);

  // get wethContract
  wethContract = await new ethers.Contract(wethContractAddress, wethABI, ethers.provider);
  cvxContract = await new ethers.Contract(cvxAddress, wethABI, ethers.provider);
  boosterContract = await new ethers.Contract(boosterAddress, boosterABI, ethers.provider);

}

async function impersonateAccountv1(): Promise<void> {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [wethAddress1],
  });
  wethAccount1 = await ethers.getSigner(wethAddress1);

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [wethAddress2],
  });
  wethAccount2 = await ethers.getSigner(wethAddress2);

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [wethAddress3],
  });
  wethAccount3 = await ethers.getSigner(wethAddress3);

}

async function impersonateAccountv2(): Promise<void> {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [wethAddress4],
  });
  wethAccount4 = await ethers.getSigner(wethAddress4);

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [wethAddress5],
  });
  wethAccount5 = await ethers.getSigner(wethAddress5);

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [wethAddress6],
  });
  wethAccount6 = await ethers.getSigner(wethAddress6);

}

async function addLiquidity(account: SignerWithAddress): Promise<void> {

  let balanceWethAccount = await wethContract.balanceOf(account.address);
  //console.log("Deployer balance: ", ethers.utils.formatEther(balanceWethAccount))

  // transfer weth to curveSwapWrapped
  await wethContract.connect(account).transfer(curveSwapWrapped.address, ethToDeposit);

  let balanceBeforeAddLiquidity = await crv3CryptoContract.balanceOf(account.address);
  //console.log("BalanceBeforeAddLiquidity: ", ethers.utils.formatEther(balanceBeforeAddLiquidity));

  let tx = await curveSwapWrapped.connect(account).addLiquidity([0,0,ethToDeposit],0);
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

  let balanceBeforeWantVault = await crv3CryptoContract.balanceOf(sCompVaultv1.address);
  //console.log("Want in vault: ", await ethers.utils.formatEther(balanceBeforeWantVault));

  let min = 9500;
  let max = 10000;
  let expectedTransfer = balanceBeforeWantVault.mul(min).div(max);

  let expectedRemainInVault = balanceBeforeWantVault.sub(expectedTransfer);

  //console.log("Expected transfer in earn: ", ethers.utils.formatEther(expectedTransfer));
  //console.log("Expected remaing in vault: ", ethers.utils.formatEther(expectedRemainInVault));

  let balanceWantGaugeBefore = await crv3CryptoContract.balanceOf(gaugeAddress);
  let balanceCvxCrvBaseRewardPoolBefore = await cvxCrv3CryptoContract.balanceOf(baseRewardPoolAddress);

  let tx = await sCompVaultv1.earn();
  await tx.wait();

  let balanceAfterWantVault = await crv3CryptoContract.balanceOf(sCompVaultv1.address);
  //console.log("Want in vault: ", await ethers.utils.formatEther(balanceAfterWantVault));

  let balanceWantGaugeAfter = await crv3CryptoContract.balanceOf(gaugeAddress);
  //console.log("Want in gauge: ", await ethers.utils.formatEther(balanceWantGaugeAfter));
  //console.log("Diff want in gauge: ", await ethers.utils.formatEther(balanceWantGaugeAfter.sub(balanceWantGaugeBefore)))

  let balanceCvxCrvBaseRewardPoolAfter = await cvxCrv3CryptoContract.balanceOf(baseRewardPoolAddress);
  //console.log("CvxCrv in baseRewardPool: ", await ethers.utils.formatEther(balanceCvxCrvBaseRewardPoolAfter));
  //console.log("Diff cvxCrv in baseRewardPool: ", await ethers.utils.formatEther(balanceCvxCrvBaseRewardPoolAfter.sub(balanceCvxCrvBaseRewardPoolBefore)))

}

async function earnv2(): Promise<void> {

  let balanceBeforeWantVault = await crv3CryptoContract.balanceOf(sCompVaultv2.address);
  //console.log("Want in vault: ", await ethers.utils.formatEther(balanceBeforeWantVault));

  let min = 9500;
  let max = 10000;
  let expectedTransfer = balanceBeforeWantVault.mul(min).div(max);

  let expectedRemainInVault = balanceBeforeWantVault.sub(expectedTransfer);

  //console.log("Expected transfer in earn: ", ethers.utils.formatEther(expectedTransfer));
  //console.log("Expected remaing in vault: ", ethers.utils.formatEther(expectedRemainInVault));

  let balanceWantGaugeBefore = await crv3CryptoContract.balanceOf(gaugeAddress);
  let balanceCvxCrvBaseRewardPoolBefore = await cvxCrv3CryptoContract.balanceOf(baseRewardPoolAddress);

  let tx = await sCompVaultv2.earn();
  await tx.wait();

  let balanceAfterWantVault = await crv3CryptoContract.balanceOf(sCompVaultv2.address);
  //console.log("Want in vault: ", await ethers.utils.formatEther(balanceAfterWantVault));

  let balanceWantGaugeAfter = await crv3CryptoContract.balanceOf(gaugeAddress);
  //console.log("Want in gauge: ", await ethers.utils.formatEther(balanceWantGaugeAfter));
  //console.log("Diff want in gauge: ", await ethers.utils.formatEther(balanceWantGaugeAfter.sub(balanceWantGaugeBefore)))

  let balanceCvxCrvBaseRewardPoolAfter = await cvxCrv3CryptoContract.balanceOf(baseRewardPoolAddress);
  //console.log("CvxCrv in baseRewardPool: ", await ethers.utils.formatEther(balanceCvxCrvBaseRewardPoolAfter));
  //console.log("Diff cvxCrv in baseRewardPool: ", await ethers.utils.formatEther(balanceCvxCrvBaseRewardPoolAfter.sub(balanceCvxCrvBaseRewardPoolBefore)))

}

async function tendv1(): Promise<void> {

  console.log("Tend...")
  let tx = await sCompStrategyTricryptov1.connect(governance).tend();
  await tx.wait();

}

async function tendv2(): Promise<void> {

  console.log("Tend...")
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

async function checkTokenInContract(): Promise<void> {

  let balanceCvxOfStrategy = await cvxContract.balanceOf(sCompStrategyTricryptov1.address);
  console.log("Balance of cvx in strategy: ", ethers.utils.formatEther(balanceCvxOfStrategy))
  let balanceCvxCrvOfStrategy = await cvxCrv3CryptoContract.balanceOf(sCompStrategyTricryptov1.address);
  console.log("Balance of cvxCrv in strategy: ", ethers.utils.formatEther(balanceCvxCrvOfStrategy))
}


async function earnMarkReward(): Promise<void> {

  await boosterContract.connect(governance).earmarkRewards(38);
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
      await withdrawv1(wethAccount1, 0);
      await withdrawv1(wethAccount2, 1);
      await withdrawv1(wethAccount3, 2);
      await checkTokenInContract();
      await withdrawv2(wethAccount4, 0);
      await withdrawv2(wethAccount5, 1);
      await withdrawv2(wethAccount6, 2);

      process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

