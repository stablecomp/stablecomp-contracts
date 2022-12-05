import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers, upgrades } = hardhat;

// constant json
const wethABI = require('../../abi/weth.json');
const baseRewardPoolABI = require('../../abi/baseRewardPoolAbi.json');
const boosterABI = require('../../abi/booster.json');
const poolCurveABI = require('../../abi/poolCurve.json');

// variable json
const curveSwapABI = require('../../abi/europoolSwap.json');
const info = require('../../strategyInfo/infoPool/frax3crv.json');

let deployer : SignerWithAddress;
let governance : SignerWithAddress;
let strategist : SignerWithAddress;
let rewards : SignerWithAddress;
let depositAccount1 : SignerWithAddress;
let depositAccount2 : SignerWithAddress;
let depositAccount3 : SignerWithAddress;

// contract deploy
let sCompVault : Contract;
let sCompController : Contract;
let sCompStrategy : Contract;
let sCompTimelockController : Contract;

// variable contract
let curveSwapWrapped : Contract;
let curveSwap : Contract;
let wantContract: Contract;
let tokenDepositContract: Contract;
let baseRewardPoolContract: Contract;

// constant contract
let cvxContract: Contract;
let crvContract: Contract;
let boosterContract: Contract;

let poolCurveContract: Contract;

// variable address
let wantAddress = info.wantAddress; // **name** // 18 decimals
let tokenCompoundAddress = info.tokenCompoundAddress; // **name** // 18 decimals
let curveSwapAddress = info.curveSwapAddress; // pool **name pool** curve
let tokenDepositAddress = info.tokenDepositAddress; // token deposit in pool curve
let accountDepositAddress1 = info.accountDepositAddress1; // account have amount of token deposit
let accountDepositAddress2 = info.accountDepositAddress2; // account have amount of token deposit
let accountDepositAddress3 = info.accountDepositAddress3; // account have amount of token deposit
let baseRewardPoolAddress = info.baseRewardPoolAddress; // address of baseRewardPool in convex

// constant address
let crvAddress = "0xD533a949740bb3306d119CC777fa900bA034cd52"
let cvxAddress = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B"
let boosterAddress = "0xF403C135812408BFbE8713b5A23a04b3D48AAE31";

// convex pool info
let nameStrategy = info.nameStrategy
let pidPool = info.pidPool;
let nElementPool = info.nElementPool;
let tokenCompoundPosition = info.tokenCompoundPosition;

// fee config
let feeGovernance = info.feeGovernance;
let feeStrategist = info.feeStrategist;
let feeWithdraw = info.feeWithdraw;
let feeDeposit = info.feeDeposit;
let minDelay = 86400

// test config
let maxUint = ethers.constants.MaxUint256;
let blockOneDay: any = 6646;
let blockTime: any = 13;
let dayToMine: any = 7;

let depositv1Value: any = [];
let initialBalanceDepositPool: any = [];
let blockFinishBaseReward: any;
let amountToDepositLiquidity: any = ethers.utils.parseEther(info.amountToDepositLiquidity);
let initialTimestamp: any;

async function main(): Promise<void> {
  let blockNumber = await ethers.provider.getBlockNumber();
  let block = await ethers.provider.getBlock(blockNumber);
  initialTimestamp = block.timestamp

  await run('compile');
  [deployer, governance, strategist, rewards] = await ethers.getSigners();
}

async function setupContract(): Promise<void> {
    await deployController();

    await deployVault();

    await deployStrategy();

    await deployTimeLockController();

    // set strategy in controller
    await sCompController.connect(governance).approveStrategy(wantAddress, sCompStrategy.address);
    await sCompController.connect(governance).setStrategy(wantAddress, sCompStrategy.address);
    await sCompController.connect(governance).setVault(wantAddress, sCompVault.address);

    // set timelock controller in strategy
    await sCompStrategy.connect(governance).setTimeLockController(sCompTimelockController.address);
    console.log("Setup complete")
}

async function deployController(): Promise<void> {
  // deploy controller
  let factoryController = await ethers.getContractFactory("SCompController")
  sCompController = await factoryController.deploy(
    governance.address,
    strategist.address,
    rewards.address,
  );
  await sCompController.deployed();

  console.log("Controller deployed to: ", sCompController.address)
}

async function deployVault(): Promise<void> {

    // deploy sCompVault
    let factoryVault = await ethers.getContractFactory("SCompVault")
    sCompVault = await factoryVault.deploy(
        wantAddress,
        sCompController.address,
        governance.address,
        feeDeposit
    );
    await sCompVault.deployed();

    console.log("Vault deployed to: ", sCompVault.address)
}

async function deployStrategy(): Promise<void> {
    // deploy strategies
    let factoryStrategy = await ethers.getContractFactory("SCompStrategyV1")
    sCompStrategy = await factoryStrategy.deploy(
        nameStrategy,
        governance.address,
        strategist.address,
        sCompController.address,
        wantAddress,
        tokenCompoundAddress,
        pidPool,
        [feeGovernance, feeStrategist, feeWithdraw],
        {swap: curveSwapAddress, tokenCompoundPosition: tokenCompoundPosition, numElements: nElementPool}
    );
    await sCompStrategy.deployed();

    console.log("Strategy deployed to: ", sCompStrategy.address)
}

async function deployTimeLockController(): Promise<void> {
    // deploy timeLockController
    let factoryTimeLock = await ethers.getContractFactory("SCompTimeLockController")
    sCompTimelockController = await factoryTimeLock.deploy(
        minDelay,
        [deployer.address],
        [deployer.address]
    );
    await sCompTimelockController.deployed();

    console.log("Timelock controller deployed to: ", sCompStrategy.address)
}

async function setupUtilityContract(): Promise<void> {

    console.log("Setup utility contract...")

    // deploy curveSwapWrapped
    let factoryCurveSwapWrapped = await ethers.getContractFactory("CurveSwapWrapped");
    curveSwapWrapped = await factoryCurveSwapWrapped.deploy(
        tokenDepositAddress,
        curveSwapAddress,
        wantAddress
    );

    console.log("Curve swap wrapped deploy to: ", curveSwapWrapped.address)


    // Get curve swap contract
    curveSwap = await new ethers.Contract(curveSwapAddress, curveSwapABI, ethers.provider);

    // get crv3cryptoContract
    wantContract = await new ethers.Contract(wantAddress, wethABI, ethers.provider);

    // get wethContract
    tokenDepositContract = await new ethers.Contract(tokenDepositAddress, wethABI, ethers.provider);
    crvContract = await new ethers.Contract(crvAddress, wethABI, ethers.provider);
    cvxContract = await new ethers.Contract(cvxAddress, wethABI, ethers.provider);
    baseRewardPoolContract = await new ethers.Contract(baseRewardPoolAddress, baseRewardPoolABI, ethers.provider);
    boosterContract = await new ethers.Contract(boosterAddress, boosterABI, ethers.provider);


}

async function impersonateAccount(): Promise<void> {
    console.log("Impersonate account...")
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [accountDepositAddress1],
    });
    depositAccount1 = await ethers.getSigner(accountDepositAddress1);

    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [accountDepositAddress2],
    });
    depositAccount2 = await ethers.getSigner(accountDepositAddress2);

    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [accountDepositAddress3],
    });
    depositAccount3 = await ethers.getSigner(accountDepositAddress3);

}

async function addLiquidity(account: SignerWithAddress, index: any): Promise<void> {
    console.log("Add liquidity with address: ", account.address);

    initialBalanceDepositPool[index] = await tokenDepositContract.balanceOf(account.address);

    //await depositToken.connect(account).transfer(curveSwapWrapped.address, amountToDepositLiquidity);

    await tokenDepositContract.connect(account).transfer(curveSwapWrapped.address, amountToDepositLiquidity);

    let tx = await curveSwapWrapped.connect(account).addLiquidity_2coins([amountToDepositLiquidity, 0],0);
    await tx.wait();

}

async function removeLiquidity(account: SignerWithAddress, index: any): Promise<void> {

  let balanceCrvFrax = await wantContract.balanceOf(account.address);

  // transfer usdc to curveSwapWrapped
  await wantContract.connect(account).transfer(curveSwapWrapped.address, balanceCrvFrax);

  let tx = await curveSwapWrapped.connect(account).removeLiquidity();
  await tx.wait();

  let balanceFrax = await tokenDepositContract.balanceOf(account.address);

  let diff = balanceFrax.sub(initialBalanceDepositPool[index]);
  console.log("Initial balance of account ", account.address, " is: ", ethers.utils.formatEther(initialBalanceDepositPool[index]));
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

  let balanceContractFrax = await tokenDepositContract.balanceOf(curveSwapWrapped.address)
  console.log("Balance usdc Contract : ", ethers.utils.formatEther(balanceContractFrax))

  let balanceContractCrvFrax = await wantContract.balanceOf(curveSwapWrapped.address)
  console.log("Balance frax3crv_f Contract : ", ethers.utils.formatEther(balanceContractCrvFrax))

  let balanceCrvInStrategy = await crvContract.balanceOf(sCompStrategy.address);
  console.log("Balance crv strategy : ", ethers.utils.formatEther(balanceCrvInStrategy))

  let balanceCvxInStrategy = await cvxContract.balanceOf(sCompStrategy.address);
  console.log("Balance cvx strategy : ", ethers.utils.formatEther(balanceCvxInStrategy))

}

async function depositv1(account: SignerWithAddress, index: any): Promise<void> {

    let balanceWantGovernance1 = await wantContract.balanceOf(governance.address);

    let balanceLp = await wantContract.balanceOf(account.address);
    console.log("Deposit of ", account.address, " is: ", ethers.utils.formatEther(balanceLp))
    depositv1Value[index] = balanceLp;

    await wantContract.connect(account).approve(sCompVault.address, maxUint)
    let tx = await sCompVault.connect(account).depositAll();
    await tx.wait();

    let balanceShare = await sCompVault.balanceOf(account.address);
    console.log("Share balance after deposit: ", ethers.utils.formatEther(balanceShare));

    // check fee
    let balanceWantGovernance2 = await wantContract.balanceOf(governance.address);
    let diff = balanceWantGovernance2.sub(balanceWantGovernance1);
    console.log("Amount fee deposit: ", ethers.utils.formatEther(diff));

}

async function earnv1(): Promise<void> {
    console.log("Earn...")
    let tx = await sCompVault.earn();
    await tx.wait();
}

async function tendv1(): Promise<void> {

    console.log("Tend...")
    let tx = await sCompStrategy.connect(governance).tend();
    await tx.wait();

}

async function harvestv1(): Promise<void> {

    console.log("Harvest...")
    let tx = await sCompStrategy.connect(governance).harvest();
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

async function withdraw(account: SignerWithAddress, index: any): Promise<void> {
    console.log("Start withdraw...")

    /*
    let pricePerFullShare = await sCompVaultv1.getPricePerFullShare()

    let balanceShare = await sCompVaultv1.balanceOf(account.address);

    let wantExpectedWithdraw = balanceShare.mul(pricePerFullShare);
    console.log("Want expected to withdraw: ", ethers.utils.formatUnits(wantExpectedWithdraw, 36))

     */
    let tx = await sCompVault.connect(account).withdrawAll();
    await tx.wait();

    let balanceWantAfterWithdraw = await wantContract.balanceOf(account.address);
    console.log("Want of ", account.address," after withdraw: ", await ethers.utils.formatEther(balanceWantAfterWithdraw));
    let diffWantAfterWithdraw = balanceWantAfterWithdraw.sub(depositv1Value[index])
    console.log("Diff want after withdraw: ", ethers.utils.formatEther(diffWantAfterWithdraw))

}

async function earnMarkReward(): Promise<void> {

    await boosterContract.connect(governance).earmarkRewards(pidPool);
}

async function getTimePassed(): Promise<void> {
    let blockNumber = await ethers.provider.getBlockNumber();
    let block = await ethers.provider.getBlock(blockNumber);

    let finalTimestamp = block.timestamp
    console.log("Timestamp passed: ", finalTimestamp - initialTimestamp);
}

async function fundAccount(account: SignerWithAddress): Promise<void> {
    console.log("fund account...")
    let balanceDeployer = await deployer.getBalance()
    console.log("Balance deployer: ", ethers.utils.formatEther(balanceDeployer))
    await deployer.sendTransaction({
        to: accountDepositAddress3,
        value: ethers.utils.parseEther("1"), // Sends exactly 1.0 ether
    });
    console.log("account funded")
}

async function proposeChangeFeeStrategy(): Promise<void> {
    let factoryStrategy = await ethers.getContractFactory("SCompStrategyV1")
    let data = factoryStrategy.interface.encodeFunctionData("setPerformanceFeeGovernance", [feeGovernance/2]);

    console.log("Data: ", data);

    let tx = await sCompTimelockController.schedule(
        sCompStrategy.address,
        0,
        data,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        ethers.utils.formatBytes32String("100"),
        minDelay
    );
    await tx.wait();

    console.log("change fee proposed")

    /*
    let tx = await sCompStrategy.setPerformanceFeeGovernance(feeGovernance / 2);
    await tx.wait();

    tx = await sCompStrategy.setPerformanceFeeStrategist(feeStrategist / 2);
    await tx.wait();

    tx = await sCompStrategy.setWithdrawalFee(feeWithdraw / 2);
    await tx.wait();
     */
}

async function executeChangeFeeStrategy(): Promise<void> {

    let oldFeeGovernance = await sCompStrategy.performanceFeeGovernance();
    console.log("Old fee governance: ", ethers.utils.formatUnits(oldFeeGovernance, 0));

    let factoryStrategy = await ethers.getContractFactory("SCompStrategyV1")
    let data = factoryStrategy.interface.encodeFunctionData("setPerformanceFeeGovernance", [feeGovernance/2]);

    let tx = await sCompTimelockController.execute(
        sCompStrategy.address,
        0,
        data,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        ethers.utils.formatBytes32String("100"),
    );
    await tx.wait();

    console.log("Change fee executed")

    let newFeeGovernance = await sCompStrategy.performanceFeeGovernance();
    console.log("New fee governance: ", ethers.utils.formatUnits(newFeeGovernance, 0));

    /*
    let tx = await sCompStrategy.setPerformanceFeeGovernance(feeGovernance / 2);
    await tx.wait();

    tx = await sCompStrategy.setPerformanceFeeStrategist(feeStrategist / 2);
    await tx.wait();

    tx = await sCompStrategy.setWithdrawalFee(feeWithdraw / 2);
    await tx.wait();
     */
}

async function readCoins(): Promise<void> {
    poolCurveContract = await new ethers.Contract("0xa5407eae9ba41422680e2e00537571bcc53efbfd", poolCurveABI, ethers.provider);

    let coins = await poolCurveContract.coins();

    console.log("coins: ", coins);

}




  main()
    .then(async () => {
        await readCoins();
        /*
        await setupContract();
        await setupUtilityContract();
        await impersonateAccount();
        //await fundAccount(depositAccount1);
        await addLiquidity(depositAccount1, 0);
        await addLiquidity(depositAccount2, 1);
        await addLiquidity(depositAccount3, 2);

        // change fee
        await proposeChangeFeeStrategy();
        await mineBlock(2);
        await executeChangeFeeStrategy();

        await depositv1(depositAccount1, 0);
        await depositv1(depositAccount2, 1);
        await depositv1(depositAccount3, 2);
        await earnv1();
        await mineBlock(dayToMine);
        await tendv1();
        await harvestv1();
        /*
        await earnMarkReward();
        await mineBlock(dayToMine);
        await tendv1();
        await harvestv1();
        await earnMarkReward();
        await mineBlock(dayToMine);
        await tendv1();
        await harvestv1();
          await withdraw(depositAccount1, 0);
        await withdraw(depositAccount2, 1);
        await withdraw(depositAccount3, 2);
        await removeLiquidity(depositAccount1, 0);
        await removeLiquidity(depositAccount2, 1);
        await removeLiquidity(depositAccount3, 2);
  */
        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

