import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {poolCurveTask} from "../../01_task/curve/curveTask";
import {utilsTask} from "../../01_task/standard/utilsTask";
import {boosterTask, deployScompTask, strategyTask, vaultTask} from "../../01_task/sCompTask";
import {feeDistributionTask, surplusConverterTask} from "../../01_task/feeTask";
import {erc20Task} from "../../01_task/standard/erc20Task";

const { run, ethers } = hardhat;

// json variable
const info = require('../../../info/infoPool/tusd3Crv.json');

// json constant
const tokenInfo = require('../../../info/address_mainnet/tokenInfo.json');

let deployer : SignerWithAddress;
let governance : SignerWithAddress;
let strategist : SignerWithAddress;
let rewards : SignerWithAddress;
let depositor : SignerWithAddress;
let depositAccount1 : SignerWithAddress;
let depositAccount2 : SignerWithAddress;
let depositAccount3 : SignerWithAddress;

// contract deploy
let sCompVault : Contract;
let sCompTokenContract : Contract;
let sCompController : Contract;
let sCompStrategy : Contract;
let sCompTimelockController : Contract;
let feeDistributionContract: Contract;
let surplusConverterV2Contract: Contract;
let veScompContract: Contract;

// test config
let dayToMine: any = 7;
let WEEK = 7 * 86400;
let amountToDepositLiquidity: any = ethers.utils.parseUnits(info.amountToDepositLiquidity, tokenInfo.usdc.decimals);
let amountToDepositVault: any = ethers.utils.parseEther("1000");

// global var
let firstTokenTime : any;
let lastBalanceWantOfStrategy : any = 0;
let storelLpAccount: any = [];

async function main(): Promise<void> {
    await run('compile');
    [deployer, governance, strategist, rewards, depositor] = await ethers.getSigners();
}

async function setupContract(): Promise<void> {

    sCompTokenContract = await deployScompTask.deploySCompToken();

    let balanceOf = await sCompTokenContract.balanceOf(deployer.address);
    let tx = await sCompTokenContract.transfer(governance.address, balanceOf.div(2) );
    await tx.wait();

    veScompContract = await deployScompTask.deployVe(sCompTokenContract.address);

    feeDistributionContract = await deployScompTask.deployFeeDistribution(sCompTokenContract.address, veScompContract.address, deployer.address, deployer.address);

    surplusConverterV2Contract = await deployScompTask.deploySurplusConverterV2(feeDistributionContract.address, deployer.address, deployer.address, [deployer.address, deployer.address])

    sCompController = await deployScompTask.deployController(deployer.address, deployer.address, deployer.address);

    sCompTimelockController = await deployScompTask.deployTimeLockController([deployer.address], [deployer.address]);

    sCompVault = await deployScompTask.deployVault(sCompController.address, info.wantAddress, deployer.address, info.feeDeposit);

    sCompStrategy = await deployScompTask.deployStrategy(
        info.nameStrategy, deployer.address, surplusConverterV2Contract.address, sCompController.address,
        info.wantAddress, info.tokenCompoundAddress, info.tokenCompoundPosition, info.pidPool, info.feeGovernance, info.feeStrategist, info.feeWithdraw,
        info.curveSwapAddress, info.nElementPool, sCompTimelockController.address,
    );
}

// set token swap path for cvx and crv
async function setTokenSwapPath(): Promise<void> {
    await strategyTask.setTokenSwapPathConfig(sCompStrategy.address, "crv_tusd");
    await strategyTask.setTokenSwapPathConfig(sCompStrategy.address, "cvx_tusd");
}

async function impersonateAccount(): Promise<void> {
    depositAccount1 = await utilsTask.impersonateAccountLocalNode(info.accountDepositAddress1);
    depositAccount2 = await utilsTask.impersonateAccountLocalNode(info.accountDepositAddress2);
    depositAccount3 = await utilsTask.impersonateAccountLocalNode(info.accountDepositAddress3);
}

async function buyBackConverter(): Promise<void> {

    let balanceCrvOfSurplus = await utilsTask.getBalanceERC20(surplusConverterV2Contract.address, tokenInfo.crv.address);
    if(balanceCrvOfSurplus > 0 ) {
        await surplusConverterTask.buyback(surplusConverterV2Contract.address, tokenInfo.crv.address, balanceCrvOfSurplus, 0, true);
    }

    let balanceCvxOfSurplus = await utilsTask.getBalanceERC20(surplusConverterV2Contract.address, tokenInfo.cvx.address);
    if(balanceCvxOfSurplus > 0 ) {
        await surplusConverterTask.buyback(surplusConverterV2Contract.address, tokenInfo.cvx.address, balanceCvxOfSurplus, 0, true);
    }
}

async function getFeeToDistribute(): Promise<void> {
    let week_cursor = firstTokenTime.sub(1).div(WEEK).mul(WEEK)
    for(let i = 0; i < 20; i++) {
        let feeToDistribute = await feeDistributionContract.tokens_per_week(week_cursor);
        console.log("Fee to distribute is: ", ethers.utils.formatEther(feeToDistribute))
        week_cursor = week_cursor.add(WEEK);
    }
    // todo change feecontract with stablecomp token
    let balanceFeeOfFeeDistributor = await utilsTask.getBalanceERC20(feeDistributionContract.address, tokenInfo.weth.address)
    console.log("Balance weth of fee distributor: ", ethers.utils.formatEther(balanceFeeOfFeeDistributor));

    firstTokenTime = week_cursor.add(1);
}

async function claimFeeFromDistributor(): Promise<void> {
    await feeDistributionTask.claimFee(feeDistributionContract.address, deployer, deployer.address);
    await feeDistributionTask.claimFee(feeDistributionContract.address, governance, governance.address);
}

async function addLiquidity(): Promise<void> {
    await utilsTask.fundAccountETH(depositAccount1.address, ethers.utils.parseEther("0.5"))
    await poolCurveTask.addLiquidity(depositAccount1,
        info.tokenDepositAddress, info.curveSwapAddress,
        [0, amountToDepositLiquidity], 0,
        "");
    await utilsTask.fundAccountETH(depositAccount2.address, ethers.utils.parseEther("0.5"))
    await poolCurveTask.addLiquidity(depositAccount2,
        info.tokenDepositAddress, info.curveSwapAddress,
        [0, amountToDepositLiquidity], 0,
        "");
    await utilsTask.fundAccountETH(depositAccount3.address, ethers.utils.parseEther("0.5"))
    await poolCurveTask.addLiquidity(depositAccount3,
        info.tokenDepositAddress, info.curveSwapAddress,
        [0, amountToDepositLiquidity], 0,
        "");
}

async function checkLP(): Promise<void> {
    if (storelLpAccount.length != 0 ) {
        let balance1 = await utilsTask.getBalanceERC20(depositAccount1.address, info.wantAddress);
        console.log("Diff 1: ", ethers.utils.formatEther(balance1.sub(storelLpAccount[0])))
        let balance2 = await utilsTask.getBalanceERC20(depositAccount2.address, info.wantAddress);
        console.log("Diff 2: ", ethers.utils.formatEther(balance2.sub(storelLpAccount[1])))
        let balance3 = await utilsTask.getBalanceERC20(depositAccount3.address, info.wantAddress);
        console.log("Diff 3: ", ethers.utils.formatEther(balance3.sub(storelLpAccount[2])))
    }
    storelLpAccount[0] = await utilsTask.getBalanceERC20(depositAccount1.address, info.wantAddress);
    storelLpAccount[1] = await utilsTask.getBalanceERC20(depositAccount2.address, info.wantAddress);
    storelLpAccount[2] = await utilsTask.getBalanceERC20(depositAccount3.address, info.wantAddress);
}

async function checkBalance(): Promise<void> {
    // check balanceOf want in strategy
    let balanceWantStrategy = await sCompStrategy.balanceOf();
    if (lastBalanceWantOfStrategy != 0) {
        let diffBalance = ethers.utils.formatEther(balanceWantStrategy.sub(lastBalanceWantOfStrategy))
        console.log("Want gained by strategy: ", diffBalance)
    }
    lastBalanceWantOfStrategy = balanceWantStrategy;
}

async function deposit(): Promise<void> {
    await erc20Task.approve(info.wantAddress, depositAccount1, sCompVault.address, amountToDepositVault);
    await vaultTask.deposit(sCompVault.address, info.wantAddress, depositAccount1, amountToDepositVault)

    await erc20Task.approve(info.wantAddress, depositAccount2, sCompVault.address, amountToDepositVault);
    await vaultTask.deposit(sCompVault.address, info.wantAddress, depositAccount2, amountToDepositVault)

    await erc20Task.approve(info.wantAddress, depositAccount3, sCompVault.address, amountToDepositVault);
    await vaultTask.depositFor(sCompVault.address, info.wantAddress, depositAccount3, depositAccount3.address, amountToDepositVault)

}

async function withdraw(): Promise<void> {
    await vaultTask.withdrawAll(sCompVault.address, depositAccount1);
    await vaultTask.withdrawAll(sCompVault.address, depositAccount2);
    let balanceShare = await utilsTask.getBalanceERC20(depositAccount3.address, sCompVault.address)
    await vaultTask.withdraw(sCompVault.address, depositAccount3, balanceShare);
}

main()
    .then(async () => {
        console.log(" ----------- ADDRESS CONTRACT ---------- ")

        await setupContract();

        console.log(" ----------- SET SWAP PATH ---------- ")
        await setTokenSwapPath();

        await impersonateAccount();

        console.log(" ----------- ADD LIQUIDITY ---------- ")
        await addLiquidity();

        console.log(" ----------- CHECK LP ---------- ")
        await checkLP();

        // change fee
        console.log(" ----------- CHANGE FEE ---------- ")
        await strategyTask.proposeChangeFeeStrategy(sCompTimelockController, sCompStrategy.address, info.feeGovernance/2);
        await utilsTask.mineBlock(2);
        await strategyTask.executeChangeFeeStrategy(sCompTimelockController, sCompStrategy.address, info.feeGovernance/2);

        await strategyTask.proposeChangeFeeStrategy(sCompTimelockController, sCompStrategy.address, info.feeGovernance);
        await utilsTask.mineBlock(2);
        await strategyTask.executeChangeFeeStrategy(sCompTimelockController, sCompStrategy.address, info.feeGovernance);


        console.log(" ----------- DEPOSIT ---------- ")
        await deposit();

        console.log(" ----------- EARN ---------- ")
        await vaultTask.earn(sCompVault.address, deployer);
        console.log(" ----------- MINE BLOCK ---------- ")
        await utilsTask.mineBlock(dayToMine);
        console.log(" ----------- EARNMARK REWARD ---------- ")
        await boosterTask.earnmarkReward(info.pidPool);

        await checkBalance();

        //await createLock();

        console.log(" ----------- HARVEST 1 ---------- ")
        await strategyTask.harvest(sCompStrategy.address);

        await buyBackConverter();
        firstTokenTime = await feeDistributionContract.last_token_time();
        await checkBalance();

        console.log(" ----------- MINE BLOCK ---------- ")
        await utilsTask.mineBlock(dayToMine);
        console.log(" ----------- EARNMARK REWARD ---------- ")
        await boosterTask.earnmarkReward(info.pidPool);
        console.log(" ----------- HARVEST 2 ---------- ")
        await strategyTask.harvest(sCompStrategy.address);
        await buyBackConverter();
        await checkBalance();

        console.log(" ----------- MINE BLOCK ---------- ")
        await utilsTask.mineBlock(dayToMine);
        console.log(" ----------- MINE BLOCK ---------- ")
        await utilsTask.mineBlock(dayToMine);
        console.log(" ----------- MINE BLOCK ---------- ")
        await utilsTask.mineBlock(dayToMine);
        console.log(" ----------- EARNMARK REWARD ---------- ")
        await boosterTask.earnmarkReward(info.pidPool);
        console.log(" ----------- HARVEST 3 ---------- ")
        await strategyTask.harvest(sCompStrategy.address);
        await buyBackConverter();
        await checkBalance();

        await feeDistributionTask.checkpointToken(feeDistributionContract.address);

        console.log(" ----------- DEPOSIT ---------- ")
        await deposit();
        console.log(" ----------- EARN ---------- ")
        await vaultTask.earn(sCompVault.address, deployer);

        await checkBalance();

        console.log(" ----------- MINE BLOCK ---------- ")
        await utilsTask.mineBlock(dayToMine);
        console.log(" ----------- EARNMARK REWARD ---------- ")
        await boosterTask.earnmarkReward(info.pidPool);
        console.log(" ----------- HARVEST 4 ---------- ")
        await strategyTask.harvest(sCompStrategy.address);
        await buyBackConverter();
        await checkBalance();


        console.log(" ----------- MINE BLOCK ---------- ")
        await utilsTask.mineBlock(dayToMine);
        console.log(" ----------- EARNMARK REWARD ---------- ")
        await boosterTask.earnmarkReward(info.pidPool);
        console.log(" ----------- HARVEST 5 ---------- ")
        await strategyTask.harvest(sCompStrategy.address);
        await buyBackConverter();
        await checkBalance();


        console.log(" ----------- MINE BLOCK ---------- ")
        await utilsTask.mineBlock(dayToMine);
        console.log(" ----------- EARNMARK REWARD ---------- ")
        await boosterTask.earnmarkReward(info.pidPool);
        console.log(" ----------- HARVEST 6 ---------- ")
        await strategyTask.harvest(sCompStrategy.address);
        await buyBackConverter();
        await checkBalance();

        console.log(" ----------- MINE BLOCK 22 ---------- ")
        await utilsTask.mineBlock(20);
        await feeDistributionTask.checkpointToken(feeDistributionContract.address);

        await claimFeeFromDistributor();

        console.log(" ----------- MINE BLOCK 22 ---------- ")
        await utilsTask.mineBlock(22);
        await feeDistributionTask.checkpointToken(feeDistributionContract.address);

        await claimFeeFromDistributor();

        console.log(" ----------- MINE BLOCK 50 ---------- ")
        await utilsTask.mineBlock(50);
        console.log(" ----------- EARNMARK REWARD ---------- ")
        await boosterTask.earnmarkReward(info.pidPool);
        console.log(" ----------- HARVEST 7 ---------- ")
        await strategyTask.harvest(sCompStrategy.address);
        await checkBalance();
        await buyBackConverter();

        await utilsTask.mineBlock(dayToMine);
        await boosterTask.earnmarkReward(info.pidPool);
        console.log(" ----------- HARVEST 8 ---------- ")
        await strategyTask.harvest(sCompStrategy.address);
        await checkBalance();
        await buyBackConverter();

        console.log(" ----------- CLAIM FEE ---------- ")
        await claimFeeFromDistributor();

        console.log(" ----------- PRINT FEE TO DISTRIBUTE ---------- ")
        await getFeeToDistribute();

        console.log(" ----------- WITHDRAW ---------- ")
        await withdraw();

        console.log(" ----------- CHECK LP ---------- ")
        await checkLP();

        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

