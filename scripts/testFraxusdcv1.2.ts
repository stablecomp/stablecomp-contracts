import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers, upgrades } = hardhat;

const crv3CryptoABI = require('../abi/3crv.json');
const curveCryptoSwapABI = require('../abi/curveCryptoSwap.json');
const wethABI = require('../abi/weth.json');
const baseRewardPoolABI = require('../abi/baseRewardPoolAbi.json');
const boosterABI = require('../abi/booster.json');

let deployer : SignerWithAddress;
let governance : SignerWithAddress;
let strategist : SignerWithAddress;
let rewards : SignerWithAddress;
let account1 : SignerWithAddress;
let account2 : SignerWithAddress;
let wantAccount : SignerWithAddress;
let usdcAccount1 : SignerWithAddress;
let usdcAccount2 : SignerWithAddress;
let usdcAccount3 : SignerWithAddress;
let wethAccount4 : SignerWithAddress;
let wethAccount5 : SignerWithAddress;
let wethAccount6 : SignerWithAddress;

let sCompVaultv1 : Contract;
let sCompVaultv2 : Contract;
let sCompControllerv1 : Contract;
let sCompControllerv2 : Contract;
let sCompStrategyFraxusdcv1 : Contract;
let curveSwapWrapped : Contract;
let crvFraxCryptoContract: Contract;
let fraxContract: Contract;
let usdcContract: Contract;
let crvContract: Contract;
let cvxContract: Contract;
let baseRewardPoolContract: Contract;
let boosterContract: Contract;

let want = "0x3175Df0976dFA876431C2E9eE6Bc45b65d3473CC"; // crvFrax // 18 decimals
let curveCryptoSwapAddress = "0xDcEF968d416a41Cdac0ED8702fAC8128A64241A2"; // pool fraxusdc curve
let fraxContractAddress = "0x853d955aCEf822Db058eb8505911ED77F175b99e";
let usdcContractAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // 6 decimals
let usdcAddress1 = "0x19d675bbb76946785249a3ad8a805260e9420cb8";
let usdcAddress2 = "0x72a53cdbbcc1b9efa39c834a540550e23463aacb";
let usdcAddress3 = "0x1b7baa734c00298b9429b518d621753bb0f6eff2";
let baseRewardPoolCrvFraxAddress = "0x7e880867363A7e321f5d260Cade2B0Bb2F717B02";
let crvAddress = "0xD533a949740bb3306d119CC777fa900bA034cd52"
let cvxAddress = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B"
let boosterAddress = "0xF403C135812408BFbE8713b5A23a04b3D48AAE31";

let maxUint = ethers.constants.MaxUint256;
let blockOneDay: any = 6646;
let blockTime: any = 13;
let dayToMine: any = 8;

let depositv1Value: any = [];
let depositv2Value: any = [];
let initialBalanceUsdc: any = [];
let blockFinishBaseReward: any;
let usdcToDeposit: any = ethers.utils.parseUnits("10000", 6);

let initialTimestamp: any;

async function main(): Promise<void> {
  let blockNumber = await ethers.provider.getBlockNumber();
  let block = await ethers.provider.getBlock(blockNumber);
  initialTimestamp = block.timestamp

  await run('compile');
  [deployer, governance, strategist, rewards, account1, account2] = await ethers.getSigners();
}

async function setupContractv1(): Promise<void> {
  // deploy controller
  // todo understand split
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
  let pid = 100;
  let factoryStrategy = await ethers.getContractFactory("SCompStrategyFraxusdcv1_2")
  sCompStrategyFraxusdcv1 = await upgrades.deployProxy(factoryStrategy, [
    governance.address,
    strategist.address,
    sCompControllerv1.address,
    want,
    pid,
    [2000, 0, 0], // original fee withdraw 10
    {swap: curveCryptoSwapAddress, tokenCompoundPosition: 1, numElements: 2}
  ]);
  await sCompStrategyFraxusdcv1.deployed();

  console.log("Strategy v1 deployed to: ", sCompStrategyFraxusdcv1.address)

  // set strategy in controller
  await sCompControllerv1.connect(governance).approveStrategy(want, sCompStrategyFraxusdcv1.address);
  await sCompControllerv1.connect(governance).setStrategy(want, sCompStrategyFraxusdcv1.address);
  await sCompControllerv1.connect(governance).setVault(want, sCompVaultv1.address);
}

async function setupUtilityContract(): Promise<void> {

  // deploy curveSwapWrapped
  let factoryCurveSwapWrapped = await ethers.getContractFactory("CurveSwapWrappedFraxusdc");
  curveSwapWrapped = await factoryCurveSwapWrapped.deploy();

  // get crv3cryptoContract
  crvFraxCryptoContract = await new ethers.Contract(want, crv3CryptoABI, ethers.provider);

  // get wethContract
  fraxContract = await new ethers.Contract(fraxContractAddress, wethABI, ethers.provider);
  usdcContract = await new ethers.Contract(usdcContractAddress, wethABI, ethers.provider);
  crvContract = await new ethers.Contract(crvAddress, wethABI, ethers.provider);
  cvxContract = await new ethers.Contract(cvxAddress, wethABI, ethers.provider);
  baseRewardPoolContract = await new ethers.Contract(baseRewardPoolCrvFraxAddress, baseRewardPoolABI, ethers.provider);
  boosterContract = await new ethers.Contract(boosterAddress, boosterABI, ethers.provider);

  blockFinishBaseReward = await baseRewardPoolContract.periodFinish();
  console.log("Block period finish: ", ethers.utils.formatUnits(blockFinishBaseReward, 0));

}

async function impersonateAccountv1(): Promise<void> {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [usdcAddress1],
  });
  usdcAccount1 = await ethers.getSigner(usdcAddress1);

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [usdcAddress2],
  });
  usdcAccount2 = await ethers.getSigner(usdcAddress2);

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [usdcAddress3],
  });
  usdcAccount3 = await ethers.getSigner(usdcAddress3);

}

async function addLiquidity(account: SignerWithAddress, index: any): Promise<void> {

  initialBalanceUsdc[index] = await usdcContract.balanceOf(account.address);

  // transfer usdc to curveSwapWrapped
  await usdcContract.connect(account).transfer(curveSwapWrapped.address, usdcToDeposit);

  let tx = await curveSwapWrapped.connect(account).addLiquidity([0,usdcToDeposit],0);
  await tx.wait();

}

async function removeLiquidity(account: SignerWithAddress, index: any): Promise<void> {

  let balanceCrvFrax = await crvFraxCryptoContract.balanceOf(account.address);

  // transfer usdc to curveSwapWrapped
  await crvFraxCryptoContract.connect(account).transfer(curveSwapWrapped.address, balanceCrvFrax);

  let tx = await curveSwapWrapped.connect(account).removeLiquidity();
  await tx.wait();

  let balanceUsdc = await usdcContract.balanceOf(account.address);

  let diff = balanceUsdc.sub(initialBalanceUsdc[index]);
  console.log("Initial balance of account ", account.address, " is: ", ethers.utils.formatUnits(initialBalanceUsdc[index], 6));
  console.log("Actual balance is: ", ethers.utils.formatUnits(balanceUsdc, 6));
  console.log("Diff is: ", ethers.utils.formatUnits(diff, 6))
}

async function checkBalance(): Promise<void> {
  let balanceBoosterCrv = await crvContract.balanceOf(boosterAddress);
  console.log("Balance crv booster: ", ethers.utils.formatEther(balanceBoosterCrv))
  let balanceCrv = await crvContract.balanceOf(baseRewardPoolCrvFraxAddress);
  let balanceCvx = await cvxContract.balanceOf(baseRewardPoolCrvFraxAddress);

  console.log("Balance crv: ", ethers.utils.formatEther(balanceCrv))
  console.log("Balance cvx: ", ethers.utils.formatEther(balanceCvx))

  let balanceContractUsdc = await usdcContract.balanceOf(curveSwapWrapped.address)
  console.log("Balance usdc Contract : ", ethers.utils.formatUnits(balanceContractUsdc, 6))

  let balanceContractCrvFrax = await crvFraxCryptoContract.balanceOf(curveSwapWrapped.address)
  console.log("Balance crvFrax Contract : ", ethers.utils.formatEther(balanceContractCrvFrax))

  let balanceCrvInStrategy = await crvContract.balanceOf(sCompStrategyFraxusdcv1.address);
  console.log("Balance crv strategy : ", ethers.utils.formatEther(balanceCrvInStrategy))

  let balanceCvxInStrategy = await cvxContract.balanceOf(sCompStrategyFraxusdcv1.address);
  console.log("Balance cvx strategy : ", ethers.utils.formatEther(balanceCvxInStrategy))

}

async function depositv1(account: SignerWithAddress, index: any): Promise<void> {
  let balancecrvFrax = await crvFraxCryptoContract.balanceOf(account.address);
  console.log("Deposit of ", account.address, " is: ", ethers.utils.formatEther(balancecrvFrax))
  depositv1Value[index] = balancecrvFrax;
  await crvFraxCryptoContract.connect(account).approve(sCompVaultv1.address, maxUint)
  let tx = await sCompVaultv1.connect(account).depositAll();
  await tx.wait();

  let balanceShare = await sCompVaultv1.balanceOf(account.address);
  //console.log("Share balance after deposit: ", ethers.utils.formatEther(balanceShare));
}

async function earnv1(): Promise<void> {

  let balanceBeforeWantVault = await crvFraxCryptoContract.balanceOf(sCompVaultv1.address);
  //console.log("Want in vault: ", await ethers.utils.formatEther(balanceBeforeWantVault));

  let min = 9500;
  let max = 10000;
  let expectedTransfer = balanceBeforeWantVault.mul(min).div(max);

  let expectedRemainInVault = balanceBeforeWantVault.sub(expectedTransfer);

  //console.log("Expected transfer in earn: ", ethers.utils.formatEther(expectedTransfer));
  //console.log("Expected remaing in vault: ", ethers.utils.formatEther(expectedRemainInVault));

  let tx = await sCompVaultv1.earn();
  await tx.wait();

  let balanceAfterWantVault = await crvFraxCryptoContract.balanceOf(sCompVaultv1.address);
  //console.log("Want in vault: ", await ethers.utils.formatEther(balanceAfterWantVault));

}

async function tendv1(): Promise<void> {

  console.log("Tend...")
  let tx = await sCompStrategyFraxusdcv1.connect(governance).tend();
  await tx.wait();

}

async function harvestv1(): Promise<void> {

  console.log("Harvest...")
  let tx = await sCompStrategyFraxusdcv1.connect(governance).harvest();
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

  let balanceAfterWantVault = await crvFraxCryptoContract.balanceOf(account.address);
  console.log("Want of ", account.address," after withdraw: ", await ethers.utils.formatEther(balanceAfterWantVault));
  let diff = balanceAfterWantVault.sub(depositv1Value[index])
  console.log("Diff v1: ", ethers.utils.formatEther(diff))

}

async function earnMarkReward(): Promise<void> {

  await boosterContract.connect(governance).earmarkRewards(100);
}


  main()
    .then(async () => {
      await setupContractv1();
      await setupUtilityContract();
      await impersonateAccountv1();
      await addLiquidity(usdcAccount1, 0);
      await addLiquidity(usdcAccount2, 1);
      await addLiquidity(usdcAccount3, 2);
      await checkBalance();
      await depositv1(usdcAccount1, 0);
      await depositv1(usdcAccount2, 1);
      await depositv1(usdcAccount3, 2);
      await earnv1();
      await mineBlock(dayToMine);
      await tendv1();
      await harvestv1();
      await earnMarkReward();
      await mineBlock(dayToMine);
      await tendv1();
      await harvestv1();
      await earnMarkReward();
      await mineBlock(dayToMine);
      await tendv1();
      await harvestv1();
      await withdrawv1(usdcAccount1, 0);
      await withdrawv1(usdcAccount2, 1);
      await withdrawv1(usdcAccount3, 2);
      await removeLiquidity(usdcAccount1, 0);
      await removeLiquidity(usdcAccount2, 1);
      await removeLiquidity(usdcAccount3, 2);
      await checkBalance();

      let blockNumber = await ethers.provider.getBlockNumber();
      let block = await ethers.provider.getBlock(blockNumber);

      let finalTimestamp = block.timestamp
      console.log("Timestamp passed: ", finalTimestamp - initialTimestamp);

      process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

