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
const info = require('../../strategyInfo/infoPool/3eur.json');
const curveAddress = require('../../strategyInfo/address_mainnet/curveAddress.json');
const routerAddress = require('../../strategyInfo/address_mainnet/routerAddress.json');
const tokenAddress = require('../../strategyInfo/address_mainnet/tokenAddress.json');
const tokenDecimals = require('../../strategyInfo/address_mainnet/tokenDecimals.json');
const tokenInfo = require('../../strategyInfo/address_mainnet/tokenInfo.json');
const uniswapAddress = require('../../strategyInfo/address_mainnet/uniswapAddress.json');

let deployer : SignerWithAddress;
let governance : SignerWithAddress;
let strategist : SignerWithAddress;
let rewards : SignerWithAddress;
let depositor : SignerWithAddress;
let operatorBaseReward : SignerWithAddress;
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
let wantAddress = info.wantAddress;
let tokenCompoundAddress = info.tokenCompoundAddress;
let curveSwapAddress = info.curveSwapAddress; // pool **name pool** curve
let tokenDepositAddress = info.tokenDepositAddress; // token deposit in pool curve // usdc 6 decimals
let accountDepositAddress1 = info.accountDepositAddress1; // account have amount of token deposit
let accountDepositAddress2 = info.accountDepositAddress2; // account have amount of token deposit
let accountDepositAddress3 = info.accountDepositAddress3; // account have amount of token deposit
let baseRewardPoolAddress = info.baseRewardPoolAddress; // address of baseRewardPool in convex

let decimalsTokenDeposit = 2
// constant address
let crvAddress = tokenAddress.crv
let cvxAddress = tokenAddress.cvx
let boosterAddress = curveAddress.boosterAddress;
let wethAddress = tokenAddress.weth;
let uniswapV2Address = routerAddress.uniswapV2;
let uniswapV3Address = routerAddress.uniswapV3;
let sushiswapAddress = routerAddress.sushiswap;
let quoterAddress = uniswapAddress.quoter;

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
let amountToDepositLiquidity: any = ethers.utils.parseUnits(info.amountToDepositLiquidity, decimalsTokenDeposit);
let amountToDepositVault: any = ethers.utils.parseEther("1000");
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
  [deployer, governance, strategist, rewards, depositor] = await ethers.getSigners();
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


    // set tokenSwapPath
    await sCompStrategy.connect(governance).setTokenSwapPathV3(tokenAddress.crv, tokenAddress.tetherEur, [tokenAddress.crv, tokenAddress.tetherUsd, tokenAddress.tetherEur], [10000, 500], 2);
    await sCompStrategy.connect(governance).setTokenSwapPathV3(tokenAddress.cvx, tokenAddress.tetherEur, [tokenAddress.cvx, tokenAddress.usdc, tokenAddress.tetherEur], [10000, 500], 2);

    await sCompStrategy.connect(governance).setUniswapV3Router(uniswapV3Address);
    await sCompStrategy.connect(governance).setUniswapV2Router(uniswapV2Address);
    await sCompStrategy.connect(governance).setSushiswapRouter(sushiswapAddress);
    await sCompStrategy.connect(governance).setQuoterUniswap(quoterAddress);

    let typeRouter = await sCompStrategy.getTypeSwap(tokenAddress.crv, tokenAddress.tetherUsd);
    console.log("type router: ", typeRouter);
    console.log("Token swap path v3 setted...")

    // set strategy and vault in controller
    await sCompController.connect(governance).approveStrategy(wantAddress, sCompStrategy.address);
    console.log("Approve strategy ok");
    await sCompController.connect(governance).setStrategy(wantAddress, sCompStrategy.address);
    console.log("Set strategy ok");
    await sCompController.connect(governance).setVault(wantAddress, sCompVault.address);
    console.log("Set vault ok");

    // set timelock controller in strategy
    await sCompStrategy.connect(governance).setTimeLockController(sCompTimelockController.address);
    console.log("Set time lock controller");

}

async function deployStableCompToken(): Promise<void> {
    // deploy stableComp token
    let tokenScompFactory = await ethers.getContractFactory("StableCompToken")
    sCompTokenContract = await tokenScompFactory.deploy();
    await sCompTokenContract.deployed();

    console.log("SComp token deployed to: ", sCompTokenContract.address)
/*
    let balanceOf = await sCompTokenContract.balanceOf(deployer.address);
    let tx = await sCompTokenContract.transfer(governance.address, balanceOf.div(2) );
    await tx.wait();
*/
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

    console.log("Surplus converter contract deploy to: ", surplusConverterV2Contract.address);
}

async function setSurplusConverterV2(): Promise<void> {
    let tx = await surplusConverterV2Contract.addToken(tokenInfo.crv.address, [tokenInfo.crv.address, tokenInfo.weth.address], 1);
    await tx.wait();
    tx = await surplusConverterV2Contract.addToken(tokenInfo.cvx.address, [tokenInfo.cvx.address, tokenInfo.weth.address], 1);
    await tx.wait();
    tx = await surplusConverterV2Contract.unpause();
    await tx.wait();
}

async function buyBackConverter(): Promise<void> {
    let balanceCrvOfSurplus = await crvContract.balanceOf(surplusConverterV2Contract.address);
    //console.log("Balance token compound of surplus: ", ethers.utils.formatEther(balanceTCOfSurplus));

    let balanceCvxOfSurplus = await cvxContract.balanceOf(surplusConverterV2Contract.address);
    //console.log("Balance token compound of surplus: ", ethers.utils.formatEther(balanceTCOfSurplus));

    let balanceFeeOfSurplus = await feeContract.balanceOf(surplusConverterV2Contract.address);
    //console.log("Balance fee of surplus: ", ethers.utils.formatEther(balanceFeeOfSurplus));

    let balanceFeeOfFeeDistributor = await feeContract.balanceOf(feeDistributionContract.address);
    //console.log("Balance fee of distributor: ", ethers.utils.formatEther(balanceFeeOfFeeDistributor));

    let slippage = balanceFeeOfSurplus.div(100).mul(5);
    let minAmount = balanceFeeOfSurplus.sub(slippage);

    if(balanceCrvOfSurplus > 0 ) {

        let tx = await surplusConverterV2Contract.buyback(crvAddress, balanceCrvOfSurplus, 0, true);
        await tx.wait();

    }

    if(balanceCvxOfSurplus > 0 ) {

        let tx = await surplusConverterV2Contract.buyback(cvxAddress, balanceCvxOfSurplus, 0, true);
        await tx.wait();

    }
    balanceCrvOfSurplus = await tokenCompoundContract.balanceOf(surplusConverterV2Contract.address);
    //console.log("Balance token compound of surplus after buyback: ", ethers.utils.formatEther(balanceTCOfSurplus));

    balanceFeeOfSurplus = await feeContract.balanceOf(surplusConverterV2Contract.address);
    //console.log("Balance weth of surplus after buyback: ", ethers.utils.formatEther(balanceFeeOfSurplus));

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

    let currentVotingPower = await veScompContract.balanceOf(account.address);
    let blockNumber = await ethers.provider.getBlockNumber();
    let block = await ethers.provider.getBlock(blockNumber);
    let currentVeForAT = await feeDistributionContract.ve_for_at(account.address, block.timestamp);

    let tx = await feeDistributionContract.connect(account).claim(account.address);
    await tx.wait();

    let balanceOfAfter = await feeContract.balanceOf(account.address);
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

async function impersonateAccount(): Promise<void> {
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [accountDepositAddress1],
    });
    depositAccount1 = await ethers.getSigner(accountDepositAddress1);

    await fundAccount(depositAccount1);

    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [accountDepositAddress2],
    });
    depositAccount2 = await ethers.getSigner(accountDepositAddress2);

    await fundAccount(depositAccount2);

    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [accountDepositAddress3],
    });
    depositAccount3 = await ethers.getSigner(accountDepositAddress3);

    await fundAccount(depositAccount3);
}

async function addLiquidity(account: SignerWithAddress, index: any): Promise<void> {
    initialBalanceDepositPool[index] = await tokenDepositContract.balanceOf(account.address);
    console.log("add liquidity amount: ", ethers.utils.formatUnits(amountToDepositLiquidity, decimalsTokenDeposit))

    let txApprove = await tokenDepositContract.connect(account).approve(curveSwap.address, ethers.constants.MaxUint256);
    await txApprove.wait();

    let tx = await curveSwap.connect(account).add_liquidity([0, 0, amountToDepositLiquidity],0);
    await tx.wait();
}

async function setupUtilityContract(abiCurveSwap: any): Promise<void> {

    // Get curve swap contract
    curveSwap = await new ethers.Contract(curveSwapAddress, abiCurveSwap, ethers.provider);

    // get want contract
    wantContract = await new ethers.Contract(wantAddress, wethABI, ethers.provider);

    // get feeContract
    tokenDepositContract = await new ethers.Contract(tokenDepositAddress, wethABI, ethers.provider);

    boosterContract = await new ethers.Contract(boosterAddress, boosterABI, ethers.provider);

    tokenCompoundContract = await new ethers.Contract(tokenCompoundAddress, wethABI, ethers.provider);

    baseRewardPoolContract = await new ethers.Contract(baseRewardPoolAddress, baseRewardPoolABI, ethers.provider);


    crvContract = await new ethers.Contract(tokenInfo.crv.address, wethABI, ethers.provider);
    cvxContract = await new ethers.Contract(tokenInfo.cvx.address, wethABI, ethers.provider);

    feeContract = await new ethers.Contract(tokenInfo.weth.address, wethABI, ethers.provider);

}

async function removeLiquidity(account: SignerWithAddress, index: any): Promise<void> {

  let balanceWant = await wantContract.balanceOf(account.address);

  await wantContract.connect(account).approve(curveSwap.address, ethers.constants.MaxUint256);

  console.log("remove liquidity...")
  let tx = await curveSwap.connect(account).remove_liquidity_one_coin(balanceWant, 0,0);
  await tx.wait();

  let balanceTokenDeposit = await tokenDepositContract.balanceOf(account.address);

  let diff = balanceTokenDeposit.sub(initialBalanceDepositPool[index]);
  console.log("Initial balance of account ", account.address, " is: ", ethers.utils.formatUnits(initialBalanceDepositPool[index], decimalsTokenDeposit));
  console.log("Actual balance is: ", ethers.utils.formatUnits(balanceTokenDeposit, decimalsTokenDeposit));
  console.log("Diff is: ", ethers.utils.formatUnits(diff,decimalsTokenDeposit))
}

let lastBalanceOfGovernance : any = 0;
let lastBalanceOfConverter : any = 0;
let lastBalanceWantOfStrategy : any = 0;

async function checkBalance(): Promise<void> {
    // check governance want balance
    let balanceGovernance = await tokenCompoundContract.balanceOf(governance.address);
    if (lastBalanceOfGovernance != 0) {
        let diffBalance = ethers.utils.formatUnits(balanceGovernance.sub(lastBalanceOfGovernance), decimalsTokenDeposit)
        console.log("Token compound gained by governance : ", diffBalance)
    }

    // check converter want balance
    let balanceConverter = await tokenCompoundContract.balanceOf(surplusConverterV2Contract.address);
    if (lastBalanceOfConverter != 0) {
        let diffBalance = ethers.utils.formatUnits(balanceConverter.sub(lastBalanceOfConverter), decimalsTokenDeposit)
        console.log("Token compound gained by converter : ", diffBalance)
    }

    // check balanceOf want in strategy
    let balanceWantStrategy = await sCompStrategy.balanceOf();
    if (lastBalanceWantOfStrategy != 0) {
        let diffBalance = ethers.utils.formatEther(balanceWantStrategy.sub(lastBalanceWantOfStrategy))
        console.log("Want gained by strategy: ", diffBalance)
    }
    lastBalanceOfGovernance = balanceGovernance;
    lastBalanceOfConverter = balanceConverter;
    lastBalanceWantOfStrategy = balanceWantStrategy;
}

async function deposit(account: SignerWithAddress, index: any): Promise<void> {

    let balanceWantGovernance1 = await wantContract.balanceOf(governance.address);

    let balanceLp = await wantContract.balanceOf(account.address);
    depositv1Value[index] = balanceLp;

    //console.log("deposit of account is : ", ethers.utils.formatEther(balanceLp))

    await wantContract.connect(account).approve(sCompVault.address, maxUint)
    let tx = await sCompVault.connect(account).deposit(balanceLp);
    let txCompleted = await tx.wait();
    let feeDeposit = await price.getFeeTx(tx, txCompleted);
    //console.log("Fee transaction deposit is: ", ethers.utils.formatEther(feeDeposit));

    let balanceShare = await sCompVault.balanceOf(account.address);
    //console.log("Share balance after deposit: ", ethers.utils.formatEther(balanceShare));

    // check fee
    let balanceWantGovernance2 = await wantContract.balanceOf(governance.address);
    let diff = balanceWantGovernance2.sub(balanceWantGovernance1);
    //console.log("Amount fee deposit: ", ethers.utils.formatEther(diff));

}

async function depositFor(account: SignerWithAddress, index: any): Promise<void> {

    let balanceWantGovernance1 = await wantContract.balanceOf(governance.address);

    let balanceLp = await wantContract.balanceOf(account.address);
    depositv1Value[index] = balanceLp;

    console.log("deposit of account is : ", ethers.utils.formatEther(balanceLp))

    await wantContract.connect(account).transfer(depositor.address, balanceLp);

    await wantContract.connect(depositor).approve(sCompVault.address, maxUint)
    let tx = await sCompVault.connect(depositor).depositFor(balanceLp, account.address);
    let txCompleted = await tx.wait();
    let feeDeposit = await price.getFeeTx(tx, txCompleted);
    console.log("Fee transaction deposit is: ", ethers.utils.formatEther(feeDeposit));
    let balanceShare = await sCompVault.balanceOf(account.address);
    //console.log("Share balance after deposit: ", ethers.utils.formatEther(balanceShare));

    // check fee
    let balanceWantGovernance2 = await wantContract.balanceOf(governance.address);
    let diff = balanceWantGovernance2.sub(balanceWantGovernance1);
    //console.log("Amount fee deposit: ", ethers.utils.formatEther(diff));

}

async function earn(): Promise<void> {
    let tx = await sCompVault.earn();
    let txCompleted = await tx.wait();
    let feeEarn = await price.getFeeTx(tx, txCompleted);
    console.log("Fee cost for earn transaction is: ", ethers.utils.formatEther(feeEarn))
}

async function harvest(): Promise<void> {

    console.log("Harvest...")
    let estimation:any = await sCompStrategy.estimateGas.harvest();
    console.log("Estimation fee harvest is: ", ethers.utils.formatUnits(estimation, "gwei"))

    let rewardsEarned = await baseRewardPoolContract.earned(sCompStrategy.address);
    console.log("Rewards earned: ", ethers.utils.formatEther(rewardsEarned));

    let priceCRV:any = await price.getPriceCRV();
    console.log({priceCRV: priceCRV["curve-dao-token"].usd})
    let priceETH:any = await price.getPriceETH();
    console.log({priceETH: priceETH["ethereum"].usd})

    let priceETHParsed = ethers.utils.parseUnits((priceETH["ethereum"].usd).toString(), "gwei")
    let estimateHarvestUSD = estimation.mul(priceETHParsed)
    console.log({estimateHarvestUSD: ethers.utils.formatEther(estimateHarvestUSD)})

    let priceCRVParsed = ethers.utils.parseEther((priceCRV["curve-dao-token"].usd).toString())
    let estimateEarnedUSD = rewardsEarned.mul(priceCRVParsed);
    console.log({EstimateEarnedUSD: ethers.utils.formatUnits(estimateEarnedUSD, 36)});

    let tx = await sCompStrategy.connect(governance).harvest();
    let txCompleted = await tx.wait();
    let feeTx = await price.getFeeTx(tx, txCompleted);
    console.log("Fee transaction harvest is: ", ethers.utils.formatEther(feeTx));

}

async function mineBlock(dayToMine: any): Promise<void> {
    let blockNumber = await ethers.provider.getBlockNumber();
    let block = await ethers.provider.getBlock(blockNumber);
    let newTimestamp = block.timestamp + ( blockOneDay * dayToMine * blockTime)

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

    console.log("Deposit: ", ethers.utils.formatEther(depositv1Value[index]))
    console.log("Diff want after withdraw: ", ethers.utils.formatEther(diffWantAfterWithdraw))

}

async function earnMarkReward(): Promise<void> {
    console.log("Earnmark reward...")
    await boosterContract.connect(governance).earmarkRewards(pidPool);
}

async function getTimePassed(): Promise<void> {
    let blockNumber = await ethers.provider.getBlockNumber();
    let block = await ethers.provider.getBlock(blockNumber);

    let finalTimestamp = block.timestamp
    console.log("Timestamp passed: ", finalTimestamp - initialTimestamp);
}

async function fundAccount(account: SignerWithAddress): Promise<void> {
    await deployer.sendTransaction({
        from: deployer.address,
        to: account.address,
        value: 1, // Sends exactly 1.0 ether
    });
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

    let tx = await veScompContract.connect(account).create_lock(balanceOfToken, timeLock);
    let txCompleted = await tx.wait()
    let feeTx = await price.getFeeTx(tx, txCompleted);

}

main()
    .then(async () => {
        await setupContract();
        let abi = [
            "function add_liquidity(uint[3] calldata amounts, uint min_mint_amount)",
            "function remove_liquidity(uint amounts, uint[3] calldata min_mint_amounts)",
            "function remove_liquidity_one_coin(uint amounts, int128 index, uint min_mint_amounts)",
            "function balanceOf(address arg0) view returns(uint)"
        ];

        await setupUtilityContract(abi);

        await impersonateAccount();

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
        await deposit(depositAccount1, 0);
        await deposit(depositAccount2, 1);
        //await deposit(depositAccount3, 2);
        await depositFor(depositAccount3, 2);

        await earn();
        await mineBlock(dayToMine);
        await earnMarkReward();
        await checkBalance();


        await createLock(deployer);
        await createLock(governance);


        await harvest();

        await buyBackConverter();
        firstTokenTime = await feeDistributionContract.last_token_time();
        await checkBalance();

        await earnMarkReward();
        await mineBlock(dayToMine);
        await harvest();
        await buyBackConverter();
        await checkBalance();

        await earnMarkReward();
        await mineBlock(dayToMine);
        await harvest();
        await buyBackConverter();
        await checkBalance();


        await mineBlock(dayToMine);
        await harvest();
        await buyBackConverter();
        await checkBalance();


        await mineBlock(dayToMine);
        await harvest();
        await buyBackConverter();
        await checkBalance();


        await mineBlock(dayToMine);
        await harvest();
        await buyBackConverter();
        await checkBalance();

        await mineBlock(20);
        await checkpointFeeDistribution();

        await claimFeeFromDistributor(deployer);
        await claimFeeFromDistributor(governance);

        await mineBlock(22);
        //await checkpointFeeDistribution();

        await claimFeeFromDistributor(deployer);
        await claimFeeFromDistributor(governance);

        await mineBlock(50);
        await earnMarkReward();
        await harvest();
        await checkBalance();
        await buyBackConverter();

        await claimFeeFromDistributor(deployer);
        await claimFeeFromDistributor(governance);

        await getFeeToDistribute();

        await withdraw(depositAccount1, 0);
        await withdraw(depositAccount2, 1);
        await withdraw(depositAccount3, 2);

        await removeLiquidity(depositAccount1, 0);
        await removeLiquidity(depositAccount2, 1);
        await removeLiquidity(depositAccount3, 2);

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

