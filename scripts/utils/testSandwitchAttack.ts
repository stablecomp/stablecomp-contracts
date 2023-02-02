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
const info = require('../../strategyInfo/infoPool/busd3Crv.json');

let deployer : SignerWithAddress;
let governance : SignerWithAddress;
let strategist : SignerWithAddress;
let rewards : SignerWithAddress;
let depositor : SignerWithAddress;
let operatorBaseReward : SignerWithAddress;
let depositAccount1 : SignerWithAddress;
let depositAccount2 : SignerWithAddress;
let depositAccount3 : SignerWithAddress;
let account1 : SignerWithAddress;

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
let wantAddress = info.wantAddress; // **MIM3Crv** // 18 decimals
let tokenCompoundAddress = info.tokenCompoundAddress; // **MIM** // 18 decimals
let curveSwapAddress = info.curveSwapAddress; // pool **name pool** curve
let tokenDepositAddress = info.tokenDepositAddress; // token deposit in pool curve // usdc 6 decimals
let accountDepositAddress1 = info.accountDepositAddress1; // account have amount of token deposit
let accountDepositAddress2 = info.accountDepositAddress2; // account have amount of token deposit
let accountDepositAddress3 = info.accountDepositAddress3; // account have amount of token deposit
let baseRewardPoolAddress = info.baseRewardPoolAddress; // address of baseRewardPool in convex

let decimalsTokenDeposit = 18
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
let amountToDepositVault: any = ethers.utils.parseEther("100000");
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
  [deployer, governance, strategist, rewards, depositor, account1] = await ethers.getSigners();
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

}

async function deployStableCompToken(): Promise<void> {
    // deploy stableComp token
    let tokenScompFactory = await ethers.getContractFactory("StableCompToken")
    sCompTokenContract = await tokenScompFactory.deploy();
    await sCompTokenContract.deployed();

    let balanceOf = await sCompTokenContract.balanceOf(deployer.address);
    let tx = await sCompTokenContract.transfer(governance.address, balanceOf.div(2) );
    await tx.wait();

}

async function deployVeScomp(): Promise<void> {
    let factory = await ethers.getContractFactory("veScomp");
    veScompContract = await factory.deploy(sCompTokenContract.address, name, symbol, version);
    await veScompContract.deployed();


    veScompContract = await ethers.getContractAt("IVotingEscrow", veScompContract.address, deployer);

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


    feeDistributionContract = await ethers.getContractAt("IFeeDistributorFront", feeDistributionContract.address, deployer);

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

}

async function setSurplusConverterV2(): Promise<void> {
    let tx = await surplusConverterV2Contract.addToken(crvAddress, [crvAddress, wethAddress], 1);
    await tx.wait();
    tx = await surplusConverterV2Contract.addToken(cvxAddress, [cvxAddress, wethAddress], 1);
    await tx.wait();
    tx = await surplusConverterV2Contract.unpause();
    await tx.wait();
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

    let txApprove = await tokenDepositContract.connect(account).approve(curveSwap.address, ethers.constants.MaxUint256);
    await txApprove.wait();

    let tx = await curveSwap.connect(account).add_liquidity([initialBalanceDepositPool[index], 0],0);
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


    crvContract = await new ethers.Contract(crvAddress, wethABI, ethers.provider);
    cvxContract = await new ethers.Contract(cvxAddress, wethABI, ethers.provider);

    feeContract = await new ethers.Contract(wethAddress, wethABI, ethers.provider);

}

async function removeLiquidity(account: SignerWithAddress, index: any): Promise<void> {

  let balanceWant = await wantContract.balanceOf(account.address);

  await wantContract.connect(account).approve(curveSwap.address, ethers.constants.MaxUint256);

  let tx = await curveSwap.connect(account).remove_liquidity_one_coin(balanceWant, 0,0);
  await tx.wait();

  let balanceTokenDeposit = await tokenDepositContract.balanceOf(account.address);

  let diff = balanceTokenDeposit.sub(initialBalanceDepositPool[index]);
}

let lastBalanceOfGovernance : any = 0;
let lastBalanceOfConverter : any = 0;
let lastBalanceWantOfStrategy : any = 0;

async function checkBalance(): Promise<void> {
    // check governance want balance
    let balanceGovernance = await tokenCompoundContract.balanceOf(governance.address);
    if (lastBalanceOfGovernance != 0) {
        let diffBalance = ethers.utils.formatUnits(balanceGovernance.sub(lastBalanceOfGovernance), decimalsTokenDeposit)
    }

    // check converter want balance
    let balanceConverter = await tokenCompoundContract.balanceOf(surplusConverterV2Contract.address);
    if (lastBalanceOfConverter != 0) {
        let diffBalance = ethers.utils.formatUnits(balanceConverter.sub(lastBalanceOfConverter), decimalsTokenDeposit)
    }

    // check balanceOf want in strategy
    let balanceWantStrategy = await sCompStrategy.balanceOf();
    if (lastBalanceWantOfStrategy != 0) {
        let diffBalance = ethers.utils.formatEther(balanceWantStrategy.sub(lastBalanceWantOfStrategy))
    }
    lastBalanceOfGovernance = balanceGovernance;
    lastBalanceOfConverter = balanceConverter;
    lastBalanceWantOfStrategy = balanceWantStrategy;
}

async function deposit(account: SignerWithAddress, index: any): Promise<void> {

    let balanceWantGovernance1 = await wantContract.balanceOf(governance.address);

    let balanceLp = await wantContract.balanceOf(account.address);
    depositv1Value[index] = balanceLp;

    await wantContract.connect(account).approve(sCompVault.address, maxUint)
    let tx = await sCompVault.connect(account).deposit(amountToDepositVault);
    let txCompleted = await tx.wait();
    let balanceShare = await sCompVault.balanceOf(account.address);

    // check fee
    let balanceWantGovernance2 = await wantContract.balanceOf(governance.address);
    let diff = balanceWantGovernance2.sub(balanceWantGovernance1);

}

async function depositFor(account: SignerWithAddress, index: any): Promise<void> {

    let balanceWantGovernance1 = await wantContract.balanceOf(governance.address);

    let balanceLp = await wantContract.balanceOf(account.address);
    depositv1Value[index] = balanceLp;


    await wantContract.connect(account).transfer(depositor.address, amountToDepositVault);

    await wantContract.connect(depositor).approve(sCompVault.address, maxUint)
    let tx = await sCompVault.connect(depositor).depositFor(amountToDepositVault, account.address);
    let txCompleted = await tx.wait();
    let feeDeposit = await price.getFeeTx(tx, txCompleted);
    let balanceShare = await sCompVault.balanceOf(account.address);

    // check fee
    let balanceWantGovernance2 = await wantContract.balanceOf(governance.address);
    let diff = balanceWantGovernance2.sub(balanceWantGovernance1);

}

async function earn(): Promise<void> {
    let tx = await sCompVault.earn();
    let txCompleted = await tx.wait();
    let feeEarn = await price.getFeeTx(tx, txCompleted);
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

    /*
    let pricePerFullShare = await sCompVaultv1.getPricePerFullShare()

    let balanceShare = await sCompVaultv1.balanceOf(account.address);

    let wantExpectedWithdraw = balanceShare.mul(pricePerFullShare);

     */
    let tx = await sCompVault.connect(account).withdrawAll();
    await tx.wait();

    let balanceWantAfterWithdraw = await wantContract.balanceOf(account.address);
    let diffWantAfterWithdraw = balanceWantAfterWithdraw.sub(depositv1Value[index])
}

async function earnMarkReward(): Promise<void> {
    await boosterContract.connect(governance).earmarkRewards(pidPool);
}

async function getTimePassed(): Promise<void> {
    let blockNumber = await ethers.provider.getBlockNumber();
    let block = await ethers.provider.getBlock(blockNumber);

    let finalTimestamp = block.timestamp
}

async function fundAccount(account: SignerWithAddress): Promise<void> {
    let balanceDeployer = await deployer.getBalance()
    await deployer.sendTransaction({
        from: deployer.address,
        to: account.address,
        value: 1, // Sends exactly 1.0 ether
    });


}

async function proposeChangeFeeStrategy(newfeeGovernance:any): Promise<void> {
    let factoryStrategy = await ethers.getContractFactory("SCompStrategyV1")
    let data = factoryStrategy.interface.encodeFunctionData("setPerformanceFeeGovernance", [newfeeGovernance]);


    let tx = await sCompTimelockController.schedule(
        sCompStrategy.address,
        0,
        data,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        ethers.utils.formatBytes32String("100"),
        minDelay
    );
    await tx.wait();


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


    let newFeeGovernance = await sCompStrategy.performanceFeeGovernance();

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
            "function add_liquidity(uint[2] calldata amounts, uint min_mint_amount)",
            "function remove_liquidity(uint amounts, uint[2] calldata min_mint_amounts)",
            "function remove_liquidity_one_coin(uint amounts, int128 index, uint min_mint_amounts)",
            "function balanceOf(address arg0) view returns(uint)"
        ];

        await setupUtilityContract(abi);

        await impersonateAccount();

        let tx = await account1.sendTransaction({
            to: depositAccount1.address,
            value: ethers.utils.parseEther("15.0"), // Sends exactly 1.0 ether
        });
        await tx.wait();

        tx = await account1.sendTransaction({
            to: depositAccount2.address,
            value: ethers.utils.parseEther("15.0"), // Sends exactly 1.0 ether
        });
        await tx.wait();
        tx = await account1.sendTransaction({
            to: depositAccount3.address,
            value: ethers.utils.parseEther("15.0"), // Sends exactly 1.0 ether
        });
        await tx.wait();

        await addLiquidity(depositAccount1, 0);
        await addLiquidity(depositAccount2, 1);
        await addLiquidity(depositAccount3, 2);

        let initialLPAccount1 = await wantContract.balanceOf(depositAccount1.address);
        console.log("Account 1 have a balance of want of : ", ethers.utils.formatEther(initialLPAccount1));

        await deposit(depositAccount1, 0);
        let shareAccount1 = ethers.utils.formatEther(await sCompVault.balanceOf(depositAccount1.address))
        console.log("Account 1 deposit: ", ethers.utils.formatEther(amountToDepositVault),
            " and receive ", shareAccount1);

        await mineBlock(100)
        await earn();
        await earnMarkReward();
        await harvest();

        await deposit(depositAccount2, 1);
        let shareAccount2 = ethers.utils.formatEther(await sCompVault.balanceOf(depositAccount2.address))
        console.log("Account 2 deposit: ", ethers.utils.formatEther(amountToDepositVault),
            " and receive ", shareAccount2);

        await deposit(depositAccount3, 2);
        let shareAccount3 = ethers.utils.formatEther(await sCompVault.balanceOf(depositAccount3.address))
        console.log("Account 3 deposit: ", ethers.utils.formatEther(amountToDepositVault),
            " and receive ", shareAccount3);

        await withdraw(depositAccount1, 0)
        let lpAccount1 = await wantContract.balanceOf(depositAccount1.address);

        console.log("Account 1 withdraw: ", shareAccount1,
            " and now have a balance want of ", ethers.utils.formatEther(lpAccount1));

        let balanceLPAccount1 = await wantContract.balanceOf(depositAccount1.address);
        let diff = balanceLPAccount1.sub(initialLPAccount1);
        console.log("Diff lp account 1: ", ethers.utils.formatEther(diff))

        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

