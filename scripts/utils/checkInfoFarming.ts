import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers, upgrades } = hardhat;

const controllerInfo = require('../../info/deploy_address/scaling_node/controller/sCompControllerContract.json');
const masterchefInfo = require('../../info/deploy_address/scaling_node/farming/masterchefScompContract.json');
const tokenInfo = require('../../info/deploy_address/scaling_node/token/sCompTokenContract.json');

let deployer : SignerWithAddress;

// contract deploy
let sCompVault : Contract;
let sCompController : Contract;
let sCompStrategy : Contract;
let sCompFarm : Contract;
let sCompToken : Contract;

async function main(): Promise<void> {
  await run('compile');
  [deployer] = await ethers.getSigners();

  const balance = await deployer.getBalance();
  let sCompControllerFactory = await ethers.getContractFactory("SCompController");
  sCompController = sCompControllerFactory.attach(controllerInfo.sCompController.address)

  let sCompFarmFactory = await ethers.getContractFactory("MasterChefScomp");
  sCompFarm = sCompFarmFactory.attach(masterchefInfo.masterchefScomp.address);

  let sCompTokenFactory = await ethers.getContractFactory("GenericERC20");
  sCompToken = sCompTokenFactory.attach(tokenInfo.sCompTokenContract.address);

  console.log("Get contract ok...")
}


async function checkInfoFarming(): Promise<void> {

  let actualBlock = await ethers.provider.getBlockNumber();
  console.log("Actual block blockchain is: ", actualBlock);

  let endBlock = await sCompFarm.endBlock();
  console.log("End block farm is: " + endBlock);

  let startBlock = await sCompFarm.startBlock();
  console.log("Start block farm is: " +  startBlock);

  let tokenPerBlock = await sCompFarm.tokenPerBlock();
  console.log("Token per block is: ", ethers.utils.formatEther(tokenPerBlock))

  let actualBalanceOfScomp = await sCompToken.balanceOf(sCompFarm.address);
  console.log("Actual balance of farm is: ", ethers.utils.formatEther(actualBalanceOfScomp))

  let actualBalanceScompTokenDeployer = await sCompToken.balanceOf(deployer.address);
  console.log("Actual balance of deployer is: ", ethers.utils.formatEther(actualBalanceScompTokenDeployer))
}

  main()
    .then(async () => {
      console.log("Deployer address: ",  deployer.address)
      let initialBalance:any = await deployer.getBalance();

      console.log("Initial balance: ", initialBalance)

      await checkInfoFarming();
      process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

