import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {deploy} from "@openzeppelin/hardhat-upgrades/dist/utils";
import {start} from "repl";

const { run, ethers, upgrades } = hardhat;

const info = require('../../strategyInfo/infoPool/fraxUsdc.json');

let deployer : SignerWithAddress;
let governance : SignerWithAddress;
let strategist : SignerWithAddress;
let rewards : SignerWithAddress;

let whaleWantAccount : SignerWithAddress;
let whaleWantAddress : any = "0x664d8f8f2417f52cbbf5bd82ba82eefc58a87f07";

// contract deploy
let sCompVault : Contract;
let sCompVaultFake : Contract;
let sCompController : Contract;
let sCompStrategy : Contract;
let wantContract: Contract;
let usdcContract: Contract;

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

let tokenLock : Contract;
let veCrv : Contract;
let masterchefScomp : Contract;

let nameVe = "Voting Escrow Scomp"
let symbolVe = "veScomp"
let versionVe = "veScomp1.0.0";

let tokenPerBlock = 9;

const provider = new ethers.providers.JsonRpcProvider("http://104.248.142.30:8545")

let controllerAddress = "0xc6B407503dE64956Ad3cF5Ab112cA4f56AA13517";
let vaultAddress = "0x3a622DB2db50f463dF562Dc5F341545A64C580fc";
let strategyAddress = "0x6A47346e722937B60Df7a1149168c0E76DD6520f"
let veScompAddress = "0x2d13826359803522cCe7a4Cfa2c1b582303DD0B4";
let farmingAddress = "0xCa57C1d3c2c35E667745448Fef8407dd25487ff8";
let tokenLockAddress = "0xd0EC100F1252a53322051a95CF05c32f0C174354";

// todo deploy converter and feeDistributor

async function main(): Promise<void> {

    await run('compile');
    [deployer] = await ethers.getSigners();
    console.log("Deployer addresss: ", deployer.address)
}

async function setupContractTest(): Promise<void> {

    let factoryERC20 = await ethers.getContractFactory("GenericERC20");

    usdcContract = await factoryERC20.attach("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
    wantContract = await factoryERC20.attach(wantAddress);
    console.log("Want contract for test deployed to address: ", wantContract.address);

    wantAddress = wantContract.address;
}

async function setupContractStrategy(): Promise<void> {

    governance = deployer;
    strategist = deployer;
    rewards = deployer;

    // deploy controller
    let factoryController = await ethers.getContractFactory("SCompController")
    sCompController = await factoryController.attach(controllerAddress);
    await sCompController.deployed();

    console.log("Controller deployed to: ", sCompController.address)
    console.log("Want address: ", wantAddress)

    // deploy sCompVault
    let factoryVault = await ethers.getContractFactory("SCompVault")
    sCompVault = await factoryVault.attach(vaultAddress);
    await sCompVault.deployed();

    console.log("Vault deployed to: ", sCompVault.address)

    // deploy strategies
    let factoryStrategy = await ethers.getContractFactory("SCompStrategyV1")
    sCompStrategy = await factoryStrategy.attach(strategyAddress);
    await sCompStrategy.deployed();

    console.log("Strategy deployed to: ", sCompStrategy.address)
}

async function setupContractVe(): Promise<void> {
    let factoryLockToken = await ethers.getContractFactory("StableCompToken");
    tokenLock = await factoryLockToken.attach(tokenLockAddress);
    await tokenLock.deployed();
    console.log("Token lock address: ", tokenLock.address)

    let factory = await ethers.getContractFactory("veScomp");
    veCrv = await factory.attach(veScompAddress);
    await veCrv.deployed();

    console.log("VeScomp deployed to address: ", veCrv.address);
}

let initialBlock: any;
async function setupContractMasterchef(): Promise<void> {

    let factoryMasterchef = await ethers.getContractFactory("MasterChefScomp");
    masterchefScomp = await factoryMasterchef.attach(farmingAddress);

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

async function depositVault(): Promise<void> {

    let balanceWantGovernance1 = await wantContract.balanceOf(governance.address);

    let balanceLp = await wantContract.balanceOf(deployer.address);
    console.log("Deposit of ", deployer.address, " is: ", ethers.utils.formatEther(balanceLp))

    await wantContract.connect(deployer).approve(sCompVault.address, balanceLp)
    let tx = await sCompVault.connect(deployer).depositAll();
    await tx.wait();

    let balanceShare = await sCompVault.balanceOf(deployer.address);
    console.log("Share balance after deposit: ", ethers.utils.formatEther(balanceShare));

}

async function depositFarming(pid: any): Promise<void> {

    let balanceShare = await sCompVault.balanceOf(deployer.address);

    console.log("Deposit of ", deployer.address, " is: ", ethers.utils.formatEther(balanceShare))

    //await sCompVault.connect(deployer).approve(masterchefScomp.address, balanceShare)
    //let tx = await masterchefScomp.connect(deployer).deposit(pid, balanceShare);
    //await tx.wait();
    console.log("Deposit farming ok...")
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
        console.log("Initial balance: ", ethers.utils.formatEther(initialBalance))

        await setupContractTest()
        await setupContractStrategy();

        await setupContractVe();
        await setupContractMasterchef();

        let balanceUSDC = await usdcContract.balanceOf(deployer.address);
        console.log("balance usdc of deployer: ", ethers.utils.formatUnits(balanceUSDC, 6))

        //await depositFarming(0);
        //await provider.send("evm_setAutomine", [true]);
        //await provider.send("evm_setIntervalMining", [12000]);

        let blockNumber = await ethers.provider.getBlockNumber();
        console.log("block number: ", blockNumber)
        let pendingToken = await masterchefScomp.pendingToken(0, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")
        let startBlock = await masterchefScomp.startBlock()
        console.log("pending token: ", ethers.utils.formatEther(pendingToken))
        console.log("start block: ", startBlock)
        //let lpInFarming = await sCompVault.balanceOf(masterchefScomp.address);
        //console.log("Lp in farming: ", ethers.utils.formatEther(lpInFarming))

    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

