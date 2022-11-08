import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers, upgrades } = hardhat;

const info = require('../../strategyInfo/infoPool/fraxUsdc.json');

let deployer : SignerWithAddress;
let governance : SignerWithAddress;
let strategist : SignerWithAddress;
let rewards : SignerWithAddress;

// contract deploy
let sCompVault : Contract;
let sCompVaultFake : Contract;
let sCompController : Contract;
let sCompStrategy : Contract;

// variable address
let wantAddress = info.wantAddress; // **name** // 18 decimals
let tokenLockAddress: any;
let tokenCompoundAddress = info.tokenCompoundAddress; // **name** // 18 decimals
let curveSwapAddress = info.curveSwapAddress; // pool **name pool** curve

// convex pool info
let nameStrategy = info.nameStrategy
let pidPool = info.pidPool;
let nElementPool = info.nElementPool;
let tokenCompoundPosition = info.tokenCompoundPosition;

// fee config
let feeGovernance = info.feeGovernance;
let feeStrategist = info.feeStrategist;
let feeWithdraw = info.feeWithdraw;

let tokenLock : Contract;
let veCrv : Contract;
let masterchefScomp : Contract;

let nameVe = "Voting Escrow Scomp"
let symbolVe = "veScomp"
let versionVe = "veScomp1.0.0";

let tokenPerBlock = 9;

async function main(): Promise<void> {

    await run('compile');
    [deployer] = await ethers.getSigners();
}

async function setupContractTest(): Promise<void> {

    let factoryERC20 = await ethers.getContractFactory("GenericERC20");

    let wantContract = await factoryERC20.deploy("WantToken", "Want");
    console.log("Want contract for test deployed to address: ", wantContract.address);

    wantAddress = wantContract.address;

    sCompVaultFake = await factoryERC20.deploy("VaultFake", "VFake");
    console.log("Vault fake deployed to address: ", wantContract.address);

}

async function setupContractStrategy(): Promise<void> {

    governance = deployer;
    strategist = deployer;
    rewards = deployer;

    // deploy controller
  let factoryController = await ethers.getContractFactory("SCompController")
  sCompController = await factoryController.deploy(
    governance.address,
    strategist.address,
    rewards.address,
  );
  await sCompController.deployed();

  console.log("Controller deployed to: ", sCompController.address)

  // deploy sCompVault
  let factoryVault = await ethers.getContractFactory("SCompVault")
  sCompVault = await factoryVault.deploy(
      wantAddress,
      sCompController.address
  );
  await sCompVault.deployed();

  console.log("Vault deployed to: ", sCompVault.address)


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

  // set strategy in controller
  let tx = await sCompController.connect(deployer).approveStrategy(wantAddress, sCompStrategy.address);
  await tx.wait();
  //console.log("Strategy approved in controller");

  tx = await sCompController.connect(deployer).setStrategy(wantAddress, sCompStrategy.address);
  tx.wait();
  //console.log("Strategy set in controller");

  tx = await sCompController.connect(deployer).setVault(wantAddress, sCompVault.address);
  tx.wait();
  //console.log("Vault set in controller")

}

async function setupContractVe(): Promise<void> {
    let factoryLockToken = await ethers.getContractFactory("StableCompToken");
    tokenLock = await factoryLockToken.deploy();
    await tokenLock.deployed();
    console.log("Token lock address: ", tokenLock.address)

    let factory = await ethers.getContractFactory("veScomp");
    veCrv = await factory.deploy(tokenLock.address, nameVe, symbolVe, versionVe);
    await veCrv.deployed();

    console.log("VeScomp deployed to address: ", veCrv.address);

}

let initialBlock: any;
async function setupContractMasterchef(): Promise<void> {
    let blockNumber = await ethers.provider.getBlockNumber();
    initialBlock = blockNumber + 50;

    let factoryMasterchef = await ethers.getContractFactory("MasterChefScomp");
    masterchefScomp = await factoryMasterchef.deploy(
        tokenLock.address,
        veCrv.address,
        tokenPerBlock,
        initialBlock
    );

    console.log("Masterchef contract deployed to address: ", masterchefScomp.address);

}

async function fundContract(): Promise<void> {
    let balanceDeployer = await tokenLock.balanceOf(deployer.address);

    let amountToFund = balanceDeployer.div(2);
    let txApprove = await tokenLock.connect(deployer).approve(masterchefScomp.address, amountToFund);
    await txApprove.wait();

    let tx = await masterchefScomp.connect(deployer).fund(amountToFund);
    await tx.wait();
}

async function addPool(lpToken: any): Promise<void> {
    let tx = await masterchefScomp.add(1000, lpToken, true);
    await tx.wait();
}

async function verify(): Promise<void> {

    // Verifying contracts
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost"
    ) {

        // Wait 30 seconds
        await new Promise(resolve => setTimeout(resolve, 30000));
/*
        await run("verify:verify", {
            address: wantAddress,
            constructorArguments: ["GenericERC20", "GEC20"],
        });

        await run("verify:verify", {
            address: sCompController.address,
            constructorArguments: [deployer.address, deployer.address, deployer.address],
        });

        await run("verify:verify", {
            address: sCompVault.address,
            constructorArguments: [wantAddress, sCompController.address],
        });

        await run("verify:verify", {
            address: sCompStrategy.address,
            constructorArguments: [
                nameStrategy,
                governance.address,
                strategist.address,
                sCompController.address,
                wantAddress,
                tokenCompoundAddress,
                pidPool,
                [feeGovernance, feeStrategist, feeWithdraw],
                {swap: curveSwapAddress, tokenCompoundPosition: tokenCompoundPosition, numElements: nElementPool}
            ],
        });
*/

        await run("verify:verify", {
            address: veCrv.address,
            constructorArguments: [
                tokenLock.address,
                nameVe,
                symbolVe,
                versionVe
            ],
        });

        await run("verify:verify", {
            address: masterchefScomp.address,
            constructorArguments: [
                tokenLock.address,
                veCrv.address,
                tokenPerBlock,
                initialBlock
            ],
        });
    }
}


  main()
    .then(async () => {
        let initialBalance:any = await deployer.getBalance();

        await setupContractTest();
        //await setupContractStrategy();
        await setupContractVe();
        await setupContractMasterchef();
        await fundContract();
        await addPool(sCompVaultFake.address);
        await verify();
        let finalBalance:any = await deployer.getBalance();
        let totalFee = initialBalance.sub(finalBalance);

        console.log("Deploy cost: ", ethers.utils.formatEther(totalFee));

        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

