import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {poolCurveTask} from "../../01_task/curve/curveTask";
import {utilsTask} from "../../01_task/standard/utilsTask";
import {boosterTask, deployScompTask, strategyTask, vaultTask} from "../../01_task/sCompTask";
import {feeDistributionTask, surplusConverterTask} from "../../01_task/feeTask";
import {erc20Task} from "../../01_task/standard/erc20Task";
import {testStrategyTask} from "../01_task/testStrategyTask";

const { run, ethers } = hardhat;

let nameConfig = "euroc3crv"
let config: any;

// json constant
const tokenInfo = require('../../../info/address_mainnet/tokenInfo.json');

// account
let deployer : SignerWithAddress;
let account1 : SignerWithAddress;
let account2 : SignerWithAddress;
let account3 : SignerWithAddress;

// contract deploy
let strategyContract : Contract;
let feeDistributionContract: Contract;
let surplusConverterV2Contract: Contract;

// test config general
let dayToMine: any = 7;

// global var
let firstTokenTime : any = 0;
let lastBalanceWantOfStrategy : any = 0;
let storelLpAccount: any = [];

async function main(): Promise<void> {
    await run('compile');
    [deployer] = await ethers.getSigners();
    config = await deployScompTask.getConfig(nameConfig)
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
    let WEEK = 7 * 86400;
    let week_cursor = firstTokenTime.sub(1).div(WEEK).mul(WEEK)
    for(let i = 0; i < 20; i++) {
        let feeToDistribute = await feeDistributionContract.tokens_per_week(week_cursor);
        console.log(" -------- Fee to distribute is: ", ethers.utils.formatEther(feeToDistribute))
        week_cursor = week_cursor.add(WEEK);
    }
    // todo change feecontract with stablecomp token
    let balanceFeeOfFeeDistributor = await utilsTask.getBalanceERC20(feeDistributionContract.address, tokenInfo.weth.address)
    console.log(" -------- Balance weth of fee distributor: ", ethers.utils.formatEther(balanceFeeOfFeeDistributor));

    firstTokenTime = week_cursor.add(1);
}

async function checkLP(): Promise<void> {
    if (storelLpAccount.length != 0 ) {
        let balance1 = await utilsTask.getBalanceERC20(account1.address, config.wantAddress);
        console.log("Diff 1: ", ethers.utils.formatEther(balance1.sub(storelLpAccount[0])))
        let balance2 = await utilsTask.getBalanceERC20(account2.address, config.wantAddress);
        console.log("Diff 2: ", ethers.utils.formatEther(balance2.sub(storelLpAccount[1])))
        let balance3 = await utilsTask.getBalanceERC20(account3.address, config.wantAddress);
        console.log("Diff 3: ", ethers.utils.formatEther(balance3.sub(storelLpAccount[2])))
    }
    storelLpAccount[0] = await utilsTask.getBalanceERC20(account1.address, config.wantAddress);
    storelLpAccount[1] = await utilsTask.getBalanceERC20(account2.address, config.wantAddress);
    storelLpAccount[2] = await utilsTask.getBalanceERC20(account3.address, config.wantAddress);
}

async function checkBalance(): Promise<void> {
    // get the first of the last token time stored in contract
    if (firstTokenTime == 0) {
        firstTokenTime = await feeDistributionContract.last_token_time();
    }

    // check balanceOf want in strategy
    let balanceWantStrategy = await strategyContract.balanceOf();
    if (lastBalanceWantOfStrategy != 0) {
        let diffBalance = ethers.utils.formatEther(balanceWantStrategy.sub(lastBalanceWantOfStrategy))
        console.log(" -------- Want gained by strategy: ", diffBalance)
    }
    lastBalanceWantOfStrategy = balanceWantStrategy;
}

async function executeActionOneWeek(index: any): Promise<void> {
    console.log(" -------- MINE BLOCK")
    await utilsTask.mineBlock(dayToMine);

    console.log(" -------- EARNMARK REWARD")
    await boosterTask.earnmarkReward(config.pidPool);

    if (index > 2 ) {

        console.log(" -------- HARVEST")
        await strategyTask.harvest(strategyContract.address);

        console.log(" -------- BUYBACK CONVERTER")
        await buyBackConverter();

        console.log(" -------- CHECK BALANCE")
        await checkBalance();

        console.log(" -------- CHECKPOINT FEE DISTRIBUTION")
        await feeDistributionTask.checkpointToken(feeDistributionContract.address);

        console.log(" -------- CLAIM FEE FOR DISTRIBUTOR")
        await feeDistributionTask.claimFee(feeDistributionContract.address, deployer, deployer.address);

    }
}

main()
    .then(async () => {
        // INITIAL ACTION
        console.log(" ----- SETUP CONTRACT")
        const {sCompToken, ve, feeDistribution, surplusConverterV2, controller, timelockController, vault, strategy} =
            await testStrategyTask.setupContractBase(config);

        feeDistributionContract = feeDistribution;
        surplusConverterV2Contract = surplusConverterV2;
        strategyContract = strategy;

        console.log(" ----- SET TOKEN SWAP PATH")
        await testStrategyTask.setTokenSwapPath(strategy.address, config);


        console.log(" ----- SETUP ACCOUNT")
        const {acc1, acc2, acc3} = await testStrategyTask.impersonateAccount(config);
        account1 = acc1;
        account2 = acc2;
        account3 = acc3;

        console.log(" ----- ADD LIQUIDITY CURVE")
        await utilsTask.fundAccountETH(account1.address, ethers.utils.parseEther("0.1"))
        await utilsTask.fundAccountETH(account2.address, ethers.utils.parseEther("0.1"))
        await utilsTask.fundAccountETH(account3.address, ethers.utils.parseEther("0.1"))
        await testStrategyTask.addLiquidity([account1, account2, account3], config);

        console.log(" ----- STORE BALANCE LP")
        await checkLP();

        console.log(" ----- DEPOSIT")
        await testStrategyTask.depositVault([account1, account2, account3], vault.address, config);

        console.log(" ----- EARN")
        await vaultTask.earn(vault.address, deployer);

        console.log(" ----- STORE BALANCE WANT")
        await checkBalance();

        // ACTION MIDDLE
        let weekToTest = 5;
        for (let i = 0; i < weekToTest; i++) {
            console.log(" ----- WEEK " , i+1)
            await executeActionOneWeek(i);
        }

        // FINAL ACTION
        console.log(" ----- PRINT FEE TO DISTRIBUTE")
        await getFeeToDistribute();

        console.log(" ----- WITHDRAW")
        await testStrategyTask.withdrawVault([account1, account2, account3], vault.address);

        console.log(" ----- CHECK LP")
        await checkLP();

        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

