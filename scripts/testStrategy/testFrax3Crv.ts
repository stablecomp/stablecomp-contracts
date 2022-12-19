import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {min} from "hardhat/internal/util/bigint";
import price from "../utils/price";

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
let sCompTokenContract : Contract;
let sCompController : Contract;
let sCompStrategy : Contract;
let sCompTimelockController : Contract;

// variable contract
let curveSwapWrapped : Contract;
let curveSwap : Contract;
let wantContract: Contract;
let tokenDepositContract: Contract;
let tokenCompoundContract: Contract;
let feeContract: Contract;
let baseRewardPoolContract: Contract;

// constant contract
let cvxContract: Contract;
let crvContract: Contract;
let boosterContract: Contract;
let feeDistributionContract: Contract;
let surplusConverterV2Contract: Contract;
let surplusConverterV3Contract: Contract;
let veScompContract: Contract;

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
let wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
let uniswapV2Address = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
let uniswapV3Address = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";
let sushiswapAddress = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F";

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
let blockOneDay: any = 7200;
let blockTime: any = 13;
let dayToMine: any = 7;
let WEEK = 7 * 86400;

let depositv1Value: any = [];
let initialBalanceDepositPool: any = [];
let blockFinishBaseReward: any;
let amountToDepositLiquidity: any = ethers.utils.parseEther(info.amountToDepositLiquidity);
let initialTimestamp: any;

let name = "Voting Escrow Scomp"
let symbol = "veScomp"
let version = "veScomp1.0.0";

let firstTokenTime : any;

async function main(): Promise<void> {
  let blockNumber = await ethers.provider.getBlockNumber();
  let block = await ethers.provider.getBlock(blockNumber);
  initialTimestamp = block.timestamp

  await run('compile');
  [deployer, governance, strategist, rewards] = await ethers.getSigners();
}

async function setupContract(): Promise<void> {

    await deployStableCompToken();

    await deployVeScomp();

    await deployFeeDistribution();

    await deploySurplusConverter();
    await setSurplusConverterV2();

    await deployController();

    await deployVault();

    await deployStrategy();

    await deployTimeLockController();


    // set strategy and vault in controller
    await sCompController.connect(governance).approveStrategy(wantAddress, sCompStrategy.address);
    await sCompController.connect(governance).setStrategy(wantAddress, sCompStrategy.address);
    await sCompController.connect(governance).setVault(wantAddress, sCompVault.address);

    // set timelock controller in strategy
    await sCompStrategy.connect(governance).setTimeLockController(sCompTimelockController.address);
    console.log("Setup complete")
}

async function deployStableCompToken(): Promise<void> {
    // deploy stableComp token
    let tokenScompFactory = await ethers.getContractFactory("StableCompToken")
    sCompTokenContract = await tokenScompFactory.deploy();
    await sCompTokenContract.deployed();

    console.log("SComp token deployed to: ", sCompTokenContract.address)

    // todo delete
    // fund

    let balanceOf = await sCompTokenContract.balanceOf(deployer.address);
    let tx = await sCompTokenContract.transfer(governance.address, balanceOf.div(2) );
    await tx.wait();

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
        surplusConverterV2Contract.address,
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

async function deployFeeDistribution(): Promise<void> {
    let blockNumber = await ethers.provider.getBlockNumber();
    let block = await ethers.provider.getBlock(blockNumber);

    // todo change weth address with stable comp token in production

    let feeDistributionFactory = await ethers.getContractFactory("FeeDistribution");
    feeDistributionContract = await feeDistributionFactory.deploy(
        veScompContract.address,
        block.timestamp + blockTime*blockOneDay*20,
        wethAddress,
        deployer.address,
        deployer.address
    )

    console.log("Fee distribution contract deploy to: ", feeDistributionContract.address);

    feeDistributionContract = await ethers.getContractAt("IFeeDistributorFront", feeDistributionContract.address, deployer);

}

async function checkpointFeeDistribution(): Promise<void> {
    let tx = await feeDistributionContract.checkpoint_token();
    await tx.wait();
    console.log("checkpoint over...")
}

async function deploySurplusConverter(): Promise<void> {

    // todo change weth address with stable comp token in production

    let surplusConverterFactory = await ethers.getContractFactory("SurplusConverterUniV2Sushi");
    surplusConverterV2Contract = await surplusConverterFactory.deploy(
        wethAddress,
        feeDistributionContract.address,
        uniswapV2Address,
        sushiswapAddress,
        deployer.address,
        deployer.address,
        [deployer.address, strategist.address]
    )

    console.log("Surplus converter contract deploy to: ", feeDistributionContract.address);
}

async function setSurplusConverterV2(): Promise<void> {
    let tx = await surplusConverterV2Contract.addToken(tokenCompoundAddress, [tokenCompoundAddress, wethAddress], 1);
    await tx.wait();
    tx = await surplusConverterV2Contract.unpause();
    await tx.wait();
}

async function buyBackConverter(): Promise<void> {
    let balanceTCOfSurplus = await tokenCompoundContract.balanceOf(surplusConverterV2Contract.address);
    console.log("Balance token compound of surplus: ", ethers.utils.formatEther(balanceTCOfSurplus));

    let balanceFeeOfSurplus = await feeContract.balanceOf(surplusConverterV2Contract.address);
    console.log("Balance fee of surplus: ", ethers.utils.formatEther(balanceFeeOfSurplus));

    let balanceFeeOfFeeDistributor = await feeContract.balanceOf(feeDistributionContract.address);
    console.log("Balance fee of distributor: ", ethers.utils.formatEther(balanceFeeOfFeeDistributor));

    let slippage = balanceFeeOfSurplus.div(100).mul(5);
    let minAmount = balanceFeeOfSurplus.sub(slippage);

    if(balanceTCOfSurplus > 0 ) {

        let tx = await surplusConverterV2Contract.buyback(tokenCompoundAddress, balanceTCOfSurplus, 0, true);
        await tx.wait();

    }
    balanceTCOfSurplus = await tokenCompoundContract.balanceOf(surplusConverterV2Contract.address);
    console.log("Balance token compound of surplus after buyback: ", ethers.utils.formatEther(balanceTCOfSurplus));

    balanceFeeOfSurplus = await feeContract.balanceOf(surplusConverterV2Contract.address);
    console.log("Balance weth of surplus after buyback: ", ethers.utils.formatEther(balanceFeeOfSurplus));

    balanceFeeOfFeeDistributor = await feeContract.balanceOf(feeDistributionContract.address);
    console.log("Balance weth of fee distributor after buyback: ", ethers.utils.formatEther(balanceFeeOfFeeDistributor));

}

async function getFeeToDistribute(): Promise<void> {
    let week_cursor = firstTokenTime.sub(1).div(WEEK).mul(WEEK)
    for(let i = 0; i < 20; i++) {
        let feeToDistribute = await feeDistributionContract.tokens_per_week(week_cursor);
        console.log("Fee to distribute is: ", ethers.utils.formatEther(feeToDistribute))
        week_cursor = week_cursor.add(WEEK);
    }
    let balanceFeeOfFeeDistributor = await feeContract.balanceOf(feeDistributionContract.address);
    console.log("Balance weth of fee distributor: ", ethers.utils.formatEther(balanceFeeOfFeeDistributor));

    firstTokenTime = week_cursor.add(1);
}

async function claimFeeFromDistributor(account: SignerWithAddress): Promise<void> {
    let balanceOfBefore = await feeContract.balanceOf(account.address);
    console.log("Balance of before: ", ethers.utils.formatEther(balanceOfBefore));


    let currentVotingPower = await veScompContract.balanceOf(account.address);
    console.log("Current voting power: ", ethers.utils.formatEther(currentVotingPower));

    let blockNumber = await ethers.provider.getBlockNumber();
    let block = await ethers.provider.getBlock(blockNumber);
    let currentVeForAT = await feeDistributionContract.ve_for_at(account.address, block.timestamp);
    console.log("Current ve for at: ", ethers.utils.formatEther(currentVeForAT));

    let tx = await feeDistributionContract.connect(account).claim(account.address);
    await tx.wait();
    console.log("claimed...")

    let balanceOfAfter = await feeContract.balanceOf(account.address);
    console.log("Balance of after: ", ethers.utils.formatEther(balanceOfAfter));
    let diff = balanceOfAfter.sub(balanceOfBefore);
    console.log("Amount fee claimed: ", ethers.utils.formatEther(diff))

    let balanceFeeOfFeeDistributor = await feeContract.balanceOf(feeDistributionContract.address);
    console.log("Balance weth of fee distributor after buyback: ", ethers.utils.formatEther(balanceFeeOfFeeDistributor));

}

async function deployVeScomp(): Promise<void> {
    let factory = await ethers.getContractFactory("veScomp");
    veScompContract = await factory.deploy(sCompTokenContract.address, name, symbol, version);
    await veScompContract.deployed();

    console.log("Voting escrow sComp address: ", veScompContract.address);

    veScompContract = await ethers.getContractAt("IVotingEscrow", veScompContract.address, deployer);

}

async function setupUtilityContract(): Promise<void> {

    console.log("Setup utility contract...")

    // deploy curveSwapWrapped
    // utility contract add liquidity in curve -- custom and wrapped
    let factoryCurveSwapWrapped = await ethers.getContractFactory("CurveSwapWrapped");
    curveSwapWrapped = await factoryCurveSwapWrapped.deploy(
        tokenDepositAddress,
        curveSwapAddress,
        wantAddress
    );

    console.log("Curve swap wrapped deploy to: ", curveSwapWrapped.address)


    // Get curve swap contract
    curveSwap = await new ethers.Contract(curveSwapAddress, curveSwapABI, ethers.provider);

    // get want contract
    wantContract = await new ethers.Contract(wantAddress, wethABI, ethers.provider);

    // get feeContract
    tokenDepositContract = await new ethers.Contract(tokenDepositAddress, wethABI, ethers.provider);
    crvContract = await new ethers.Contract(crvAddress, wethABI, ethers.provider);
    cvxContract = await new ethers.Contract(cvxAddress, wethABI, ethers.provider);
    baseRewardPoolContract = await new ethers.Contract(baseRewardPoolAddress, baseRewardPoolABI, ethers.provider);
    boosterContract = await new ethers.Contract(boosterAddress, boosterABI, ethers.provider);

    tokenCompoundContract = await new ethers.Contract(tokenCompoundAddress, wethABI, ethers.provider);
    feeContract = await new ethers.Contract(wethAddress, wethABI, ethers.provider);

}

async function impersonateAccount(): Promise<void> {
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

let lastBalanceOfGovernance : any = 0;
let lastBalanceOfConverter : any = 0;
let lastBalanceWantOfStrategy : any = 0;

async function checkBalance(): Promise<void> {
    // check governance want balance
    let balanceGovernance = await tokenCompoundContract.balanceOf(governance.address);
    console.log("Balance token compound of governance: ", ethers.utils.formatEther(balanceGovernance));
    if (lastBalanceOfGovernance != 0) {
        let diffBalance = ethers.utils.formatEther(balanceGovernance.sub(lastBalanceOfGovernance))
        console.log("Diff balance : ", diffBalance)
    }

    // check converter want balance
    let balanceConverter = await tokenCompoundContract.balanceOf(surplusConverterV2Contract.address);
    console.log("Balance token compound of Converter: ", ethers.utils.formatEther(balanceConverter));
    if (lastBalanceOfConverter != 0) {
        let diffBalance = ethers.utils.formatEther(balanceConverter.sub(lastBalanceOfConverter))
        console.log("Diff balance : ", diffBalance)
    }

    // check balanceOf want in strategy
    let balanceWantStrategy = await sCompStrategy.balanceOf();
    console.log("Balance token compound strategy. ", ethers.utils.formatEther(balanceWantStrategy))
    if (lastBalanceWantOfStrategy != 0) {
        let diffBalance = ethers.utils.formatEther(balanceWantStrategy.sub(lastBalanceWantOfStrategy))
        console.log("Diff balance: ", diffBalance)
    }
    lastBalanceOfGovernance = balanceGovernance;
    lastBalanceOfConverter = balanceConverter;
    lastBalanceWantOfStrategy = balanceWantStrategy;
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
    //console.log("Amount fee deposit: ", ethers.utils.formatEther(diff));

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
    let newTimestamp = block.timestamp + ( blockOneDay * dayToMine * blockTime)

    console.log("Mine block...");

    await ethers.provider.send('evm_mine', [newTimestamp]);

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
    console.log("Earn mark reward in booster contract...");
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

async function proposeChangeFeeStrategy(newfeeGovernance:any): Promise<void> {
    let factoryStrategy = await ethers.getContractFactory("SCompStrategyV1")
    let data = factoryStrategy.interface.encodeFunctionData("setPerformanceFeeGovernance", [newfeeGovernance]);

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

async function executeChangeFeeStrategy(newfeeGovernance:any): Promise<void> {

    let oldFeeGovernance = await sCompStrategy.performanceFeeGovernance();
    console.log("Old fee governance: ", ethers.utils.formatUnits(oldFeeGovernance, 0));

    let factoryStrategy = await ethers.getContractFactory("SCompStrategyV1")
    let data = factoryStrategy.interface.encodeFunctionData("setPerformanceFeeGovernance", [newfeeGovernance]);

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

async function createLock(account: SignerWithAddress): Promise<void> {

    let txApprove = await sCompTokenContract.connect(account).approve(veScompContract.address, ethers.constants.MaxUint256);
    await txApprove.wait();

    const current_date: Date = new Date();
    let timeLock: any = (((current_date.getTime() / 1000)) + (2 * 365 * 86400)).toFixed(0)

    let amountToLock = ethers.utils.parseEther("1000");

    let balanceOfToken = await sCompTokenContract.balanceOf(account.address);
    console.log("Initial balance of token is: ", ethers.utils.formatEther(balanceOfToken));

    let tx = await veScompContract.connect(account).create_lock(balanceOfToken, timeLock);
    let txCompleted = await tx.wait()
    let feeTx = await price.getFeeTx(tx, txCompleted);
    console.log("Fee tx lock: ", ethers.utils.formatEther(feeTx));

}



  main()
    .then(async () => {
        await setupContract();
        await setupUtilityContract();
        await impersonateAccount();
        //await fundAccount(depositAccount1);
        await addLiquidity(depositAccount1, 0);
        await addLiquidity(depositAccount2, 1);
        await addLiquidity(depositAccount3, 2);

        /*
        // change fee
        await proposeChangeFeeStrategy(feeGovernance/2);
        await mineBlock(2);
        await executeChangeFeeStrategy(feeGovernance/2);

        await proposeChangeFeeStrategy(feeGovernance);
        await mineBlock(2);
        await executeChangeFeeStrategy(feeGovernance);
        */

        await depositv1(depositAccount1, 0);
        await depositv1(depositAccount2, 1);
        await depositv1(depositAccount3, 2);

        await earnv1();
        await mineBlock(dayToMine);
        await tendv1();
        await earnMarkReward();
        await checkBalance();


        await createLock(deployer);
        await createLock(governance);


        await harvestv1();

        await buyBackConverter();
        firstTokenTime = await feeDistributionContract.last_token_time();
        await checkBalance();

        await earnMarkReward();
        await mineBlock(dayToMine);
        await tendv1();

        await checkBalance();
        await harvestv1();
        await buyBackConverter();
        await checkBalance();

        await earnMarkReward();
        await mineBlock(dayToMine);
        await tendv1();
        await checkBalance();
        await harvestv1();
        await buyBackConverter();
        await checkBalance();

        //await createLock(deployer);
        //await createLock(governance);

        //await buyBackConverter();
        await mineBlock(20);
        await checkpointFeeDistribution();

        await claimFeeFromDistributor(deployer);
        await claimFeeFromDistributor(governance);

        await mineBlock(22);
        await checkpointFeeDistribution();

        await claimFeeFromDistributor(deployer);
        await claimFeeFromDistributor(governance);

        await earnMarkReward();
        await harvestv1();
        await checkBalance();
        await buyBackConverter();

        await claimFeeFromDistributor(deployer);
        await claimFeeFromDistributor(governance);


        await getFeeToDistribute();

        /*

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

