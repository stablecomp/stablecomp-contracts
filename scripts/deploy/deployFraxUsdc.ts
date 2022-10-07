import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers, upgrades } = hardhat;

const info = require('../../strategyInfo/fraxUsdc.json');

let deployer : SignerWithAddress;
let governance : SignerWithAddress;
let strategist : SignerWithAddress;
let rewards : SignerWithAddress;

// contract deploy
let sCompVault : Contract;
let sCompController : Contract;
let sCompStrategy : Contract;

// variable address
let wantAddress = info.wantAddress; // **name** // 18 decimals
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

async function main(): Promise<void> {
  await run('compile');
  [deployer] = await ethers.getSigners();
}

async function setupContract(): Promise<void> {
  /*
    // deploy controller
  let factoryController = await ethers.getContractFactory("SCompController")
  sCompController = await upgrades.deployProxy(factoryController, [
    deployer.address,
    deployer.address,
    deployer.address,
  ]);
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

   */

  // deploy strategies
  let factoryStrategy = await ethers.getContractFactory("SCompStrategyV1")
  sCompStrategy = await upgrades.deployProxy(factoryStrategy, [
      nameStrategy,
      deployer.address,
      deployer.address,
      "0x8cAEF41C1B564BB20be967E539C8a043F133C6E5",
      wantAddress,
      tokenCompoundAddress,
      pidPool,
      [feeGovernance, feeStrategist, feeWithdraw],
      {swap: curveSwapAddress, tokenCompoundPosition: tokenCompoundPosition, numElements: nElementPool}
  ]);
  await sCompStrategy.deployed();

  /*
  console.log("Strategy deployed to: ", sCompStrategy.address)
  // set strategy in controller
  let tx = await sCompController.connect(deployer).approveStrategy(wantAddress, sCompStrategy.address);
  await tx.wait();
  console.log("Strategy approved in controller");

  tx = await sCompController.connect(deployer).setStrategy(wantAddress, sCompStrategy.address);
  tx.wait();
  console.log("Strategy set in controller");

  tx = await sCompController.connect(deployer).setVault(wantAddress, sCompVault.address);
  tx.wait();
  console.log("Vault set in controller")

   */
}

async function verify(): Promise<void> {

    // Verifying contracts
    if (
        hardhat.network.name !== "hardhat" &&
        hardhat.network.name !== "localhost"
    ) {

        // Wait 30 seconds
        await new Promise(resolve => setTimeout(resolve, 30000));

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
            constructorArguments: [nameStrategy,
                deployer.address,
                deployer.address,
                sCompController.address,
                wantAddress,
                tokenCompoundAddress,
                pidPool,
                [feeGovernance, feeStrategist, feeWithdraw],
                {swap: curveSwapAddress, tokenCompoundPosition: tokenCompoundPosition, numElements: nElementPool}
            ],
        });
    }
}


  main()
    .then(async () => {
      await setupContract();
      process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

