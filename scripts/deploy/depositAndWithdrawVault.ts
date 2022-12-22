import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {deploy} from "@openzeppelin/hardhat-upgrades/dist/utils";

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

const provider = new ethers.providers.JsonRpcProvider("http://104.248.142.30:8545")


async function main(): Promise<void> {

    await run('compile');
    [deployer] = await ethers.getSigners();
    console.log("Deployer addresss: ", deployer.address)
}

let initialBlock: any;
async function setupContractMasterchef(): Promise<void> {
    let blockNumber = await ethers.provider.getBlockNumber();
    initialBlock = blockNumber + 50;

    let factoryMasterchef = await ethers.getContractFactory("MasterChefScomp");
    masterchefScomp = await factoryMasterchef.attach("0xC0BF43A4Ca27e0976195E6661b099742f10507e5");

    console.log("Masterchef contract deployed to address: ", masterchefScomp.address);

}
async function setupContractVault(): Promise<void> {
    let factoryScompVault = await ethers.getContractFactory("SCompVault");
    sCompVault = await factoryScompVault.attach("0x6212cb549De37c25071cF506aB7E115D140D9e42");

}
async function setupContractWant(): Promise<void> {
    let factoryWant = await ethers.getContractFactory("GenericERC20");
    wantContract = await factoryWant.attach("0x3175Df0976dFA876431C2E9eE6Bc45b65d3473CC");

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

    let balanceLp = await wantContract.balanceOf(deployer.address);
    console.log("Deposit vault of ", deployer.address, " is: ", ethers.utils.formatEther(balanceLp))

    await wantContract.connect(deployer).approve(sCompVault.address, balanceLp)
    let tx = await sCompVault.connect(deployer).depositAll();
    await tx.wait();

    let balanceShare = await sCompVault.balanceOf(deployer.address);
    console.log("Share balance after deposit: ", ethers.utils.formatEther(balanceShare));

}

async function withdrawVault(): Promise<void> {

    let tx = await sCompVault.connect(deployer).withdrawAll();
    await tx.wait();

    let balanceShare = await sCompVault.balanceOf(deployer.address);
    console.log("Share balance after deposit: ", ethers.utils.formatEther(balanceShare));

}


async function depositFarming(pid: any): Promise<void> {

    let balanceShare = await sCompVault.balanceOf(deployer.address);

    console.log("Deposit farming of ", deployer.address, " is: ", ethers.utils.formatEther(balanceShare))

    await sCompVault.connect(deployer).approve(masterchefScomp.address, balanceShare)
    let tx = await masterchefScomp.connect(deployer).deposit(pid, balanceShare);
    await tx.wait();
    console.log("Deposit farming ok...")
}

async function withdrawFarming(pid: any): Promise<void> {

    let tx = await masterchefScomp.connect(deployer).withdraw(pid, ethers.utils.parseEther("260"));
    await tx.wait();
    console.log("Withdraw farming ok...")
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

        await setupContractMasterchef();
        await setupContractVault();
        await setupContractWant();
        //await withdrawFarming(0);
        //await withdrawVault();
        await depositVault();
        await depositFarming(0);
        //await verify();
        let finalBalance:any = await deployer.getBalance();
        let totalFee = initialBalance.sub(finalBalance);

        console.log("Deploy cost: ", ethers.utils.formatEther(totalFee));
        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

