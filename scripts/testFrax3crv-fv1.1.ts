import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers, upgrades } = hardhat;

const crv3CryptoABI = require('../abi/3crv.json');
const curveCryptoSwapABI = require('../abi/curveCryptoSwap.json');
const wethABI = require('../abi/weth.json');
const baseRewardPoolABI = require('../abi/baseRewardPoolAbi.json');
const boosterABI = require('../abi/booster.json');
const frax3crv_fABI = require('../abi/frax3crv_f.json');

let deployer : SignerWithAddress;
let governance : SignerWithAddress;
let strategist : SignerWithAddress;
let rewards : SignerWithAddress;
let account1 : SignerWithAddress;
let account2 : SignerWithAddress;
let wantAccount : SignerWithAddress;
let fraxAccount1 : SignerWithAddress;
let fraxAccount2 : SignerWithAddress;
let fraxAccount3 : SignerWithAddress;
let wethAccount4 : SignerWithAddress;
let wethAccount5 : SignerWithAddress;
let wethAccount6 : SignerWithAddress;

let sCompVaultv1 : Contract;
let sCompVaultv2 : Contract;
let sCompControllerv1 : Contract;
let sCompControllerv2 : Contract;
let sCompStrategyFrax3crv_fv1_1 : Contract;
let curveSwapWrapped : Contract;
let frax3crv_fContract: Contract;
let threeCrvContract: Contract;
let fraxContract: Contract;
let usdcContract: Contract;
let crvContract: Contract;
let cvxContract: Contract;
let baseRewardPoolContract: Contract;
let boosterContract: Contract;

let want = "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B"; // frax3crv-f // 18 decimals
let curveCryptoSwapAddress = "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B"; // pool fraxusdc curve
let fraxContractAddress = "0x853d955aCEf822Db058eb8505911ED77F175b99e";
let threecrvAddress = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490";
let usdcContractAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // 6 decimals
let fraxAddress1 = "0x183d0dc5867c01bfb1dbbc41d6a9d3de6e044626";
let fraxAddress2 = "0xc83a1bb26dc153c009d5baad9855fe90cf5a1529";
let fraxAddress3 = "0xd3d176f7e4b43c70a68466949f6c64f06ce75bb9";
let baseRewardPoolAddress = "0xB900EF131301B307dB5eFcbed9DBb50A3e209B2e";
let crvAddress = "0xD533a949740bb3306d119CC777fa900bA034cd52"
let cvxAddress = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B"
let boosterAddress = "0xF403C135812408BFbE8713b5A23a04b3D48AAE31";

let pidPool = 32;

let maxUint = ethers.constants.MaxUint256;
let blockOneDay: any = 6646;
let blockTime: any = 13;
let dayToMine: any = 7;

let depositv1Value: any = [];
let depositv2Value: any = [];
let initialBalanceFrax: any = [];
let blockFinishBaseReward: any;
let fraxToDeposit: any = ethers.utils.parseEther("10000");

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
  let factoryStrategy = await ethers.getContractFactory("SCompStrategyFrax3crv_fv1_1")
  sCompStrategyFrax3crv_fv1_1 = await upgrades.deployProxy(factoryStrategy, [
    governance.address,
    strategist.address,
    sCompControllerv1.address,
    want,
      pidPool,
    [2000, 0, 0], // original fee withdraw 10
    {swap: curveCryptoSwapAddress, tokenCompoundPosition: 0, numElements: 2}
  ]);
  await sCompStrategyFrax3crv_fv1_1.deployed();

  console.log("Strategy v1 deployed to: ", sCompStrategyFrax3crv_fv1_1.address)

  // set strategy in controller
  await sCompControllerv1.connect(governance).approveStrategy(want, sCompStrategyFrax3crv_fv1_1.address);
  await sCompControllerv1.connect(governance).setStrategy(want, sCompStrategyFrax3crv_fv1_1.address);
  await sCompControllerv1.connect(governance).setVault(want, sCompVaultv1.address);
}

async function setupUtilityContract(): Promise<void> {

  // deploy curveSwapWrapped
  let factoryCurveSwapWrapped = await ethers.getContractFactory("CurveSwapWrappedFrax3crv_f");
  curveSwapWrapped = await factoryCurveSwapWrapped.deploy();

  // get crv3cryptoContract
  frax3crv_fContract = await new ethers.Contract(want, wethABI, ethers.provider);

  // get wethContract
  fraxContract = await new ethers.Contract(fraxContractAddress, wethABI, ethers.provider);
  threeCrvContract = await new ethers.Contract(threecrvAddress, wethABI, ethers.provider);
  crvContract = await new ethers.Contract(crvAddress, wethABI, ethers.provider);
  cvxContract = await new ethers.Contract(cvxAddress, wethABI, ethers.provider);
  baseRewardPoolContract = await new ethers.Contract(baseRewardPoolAddress, baseRewardPoolABI, ethers.provider);
  boosterContract = await new ethers.Contract(boosterAddress, boosterABI, ethers.provider);

  blockFinishBaseReward = await baseRewardPoolContract.periodFinish();
  console.log("Block period finish: ", ethers.utils.formatUnits(blockFinishBaseReward, 0));

}

async function impersonateAccountv1(): Promise<void> {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [fraxAddress1],
  });
  fraxAccount1 = await ethers.getSigner(fraxAddress1);

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [fraxAddress2],
  });
  fraxAccount2 = await ethers.getSigner(fraxAddress2);

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [fraxAddress3],
  });
  fraxAccount3 = await ethers.getSigner(fraxAddress3);

}

async function addLiquidity(account: SignerWithAddress, index: any): Promise<void> {


    initialBalanceFrax[index] = await fraxContract.balanceOf(account.address);


    // transfer usdc to curveSwapWrapped

    await fraxContract.connect(account).transfer(curveSwapWrapped.address, fraxToDeposit);

    let tx = await curveSwapWrapped.connect(account).addLiquidity([fraxToDeposit, 0],0);
    await tx.wait();

}

async function removeLiquidity(account: SignerWithAddress, index: any): Promise<void> {

  let balanceCrvFrax = await frax3crv_fContract.balanceOf(account.address);

  // transfer usdc to curveSwapWrapped
  await frax3crv_fContract.connect(account).transfer(curveSwapWrapped.address, balanceCrvFrax);

  let tx = await curveSwapWrapped.connect(account).removeLiquidity();
  await tx.wait();

  let balanceFrax = await fraxContract.balanceOf(account.address);

  let diff = balanceFrax.sub(initialBalanceFrax[index]);
  console.log("Initial balance of account ", account.address, " is: ", ethers.utils.formatEther(initialBalanceFrax[index]));
  console.log("Actual balance is: ", ethers.utils.formatEther(balanceFrax));
  console.log("Diff is: ", ethers.utils.formatEther(diff))
}

async function checkBalance(): Promise<void> {
  let balanceBoosterCrv = await crvContract.balanceOf(boosterAddress);
  console.log("Balance crv booster: ", ethers.utils.formatEther(balanceBoosterCrv))
  let balanceCrv = await crvContract.balanceOf(baseRewardPoolAddress);
  let balanceCvx = await cvxContract.balanceOf(baseRewardPoolAddress);

  console.log("Balance crv: ", ethers.utils.formatEther(balanceCrv))
  console.log("Balance cvx: ", ethers.utils.formatEther(balanceCvx))

  let balanceContractFrax = await fraxContract.balanceOf(curveSwapWrapped.address)
  console.log("Balance usdc Contract : ", ethers.utils.formatEther(balanceContractFrax))

  let balanceContractCrvFrax = await frax3crv_fContract.balanceOf(curveSwapWrapped.address)
  console.log("Balance frax3crv_f Contract : ", ethers.utils.formatEther(balanceContractCrvFrax))

  let balanceCrvInStrategy = await crvContract.balanceOf(sCompStrategyFrax3crv_fv1_1.address);
  console.log("Balance crv strategy : ", ethers.utils.formatEther(balanceCrvInStrategy))

  let balanceCvxInStrategy = await cvxContract.balanceOf(sCompStrategyFrax3crv_fv1_1.address);
  console.log("Balance cvx strategy : ", ethers.utils.formatEther(balanceCvxInStrategy))

}

async function depositv1(account: SignerWithAddress, index: any): Promise<void> {

    let balanceLp = await frax3crv_fContract.balanceOf(account.address);
    console.log("Deposit of ", account.address, " is: ", ethers.utils.formatEther(balanceLp))
    depositv1Value[index] = balanceLp;

    await frax3crv_fContract.connect(account).approve(sCompVaultv1.address, maxUint)
    let tx = await sCompVaultv1.connect(account).depositAll();
    await tx.wait();

    let balanceShare = await sCompVaultv1.balanceOf(account.address);
    //console.log("Share balance after deposit: ", ethers.utils.formatEther(balanceShare));
}

async function earnv1(): Promise<void> {
    console.log("Earn...")
    let tx = await sCompVaultv1.earn();
    await tx.wait();
}

async function tendv1(): Promise<void> {

    console.log("Tend...")
    let tx = await sCompStrategyFrax3crv_fv1_1.connect(governance).tend();
    await tx.wait();

}

async function harvestv1(): Promise<void> {

  console.log("Harvest...")
  let tx = await sCompStrategyFrax3crv_fv1_1.connect(governance).harvest();
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

async function withdrawv1(account: SignerWithAddress, index: any): Promise<void> {
  console.log("Start withdraw...")

  let tx = await sCompVaultv1.connect(account).withdrawAll();
  await tx.wait();

  let balanceShare = await sCompVaultv1.balanceOf(account.address);
  //console.log("Share balance after deposit: ", ethers.utils.formatEther(balanceShare));

  let balanceAfterWantVault = await frax3crv_fContract.balanceOf(account.address);
  console.log("Want of ", account.address," after withdraw: ", await ethers.utils.formatEther(balanceAfterWantVault));
  let diff = balanceAfterWantVault.sub(depositv1Value[index])
  console.log("Diff v1: ", ethers.utils.formatEther(diff))

}

async function earnMarkReward(): Promise<void> {

  await boosterContract.connect(governance).earmarkRewards(pidPool);
}


  main()
    .then(async () => {
      await setupContractv1();
      await setupUtilityContract();
      await impersonateAccountv1();
      await addLiquidity(fraxAccount1, 0);
      await addLiquidity(fraxAccount2, 1);
      await addLiquidity(fraxAccount3, 2);
      await depositv1(fraxAccount1, 0);
      await depositv1(fraxAccount2, 1);
      await depositv1(fraxAccount3, 2);
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
      await withdrawv1(fraxAccount1, 0);
      await withdrawv1(fraxAccount2, 1);
      await withdrawv1(fraxAccount3, 2);
      await removeLiquidity(fraxAccount1, 0);
      await removeLiquidity(fraxAccount2, 1);
      await removeLiquidity(fraxAccount3, 2);

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

