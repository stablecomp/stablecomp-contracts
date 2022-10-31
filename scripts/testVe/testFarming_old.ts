import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {create} from "domain";
import price from '../utils/price';

const { run, ethers, upgrades } = hardhat;

let deployer : SignerWithAddress;
let account1 : SignerWithAddress;
let account2 : SignerWithAddress;
let account3 : SignerWithAddress;
let depositAccount1 : SignerWithAddress;
let depositAccount2 : SignerWithAddress;
let depositAccount3 : SignerWithAddress;

let accountDepositAddress1 = "0x5a52e96bacdabb82fd05763e25335261b270efcb"; // account have amount of token deposit
let accountDepositAddress2 = "0x32d03db62e464c9168e41028ffa6e9a05d8c6451"; // account have amount of token deposit
let accountDepositAddress3 = "0x7a16ff8270133f063aab6c9977183d9e72835428"; // account have amount of token deposit

let oneWeek = 7 * 86400;
let blockOneDay: any = 6646;
let blockTime: any = 13;

let veCrv : Contract;
let farm : Contract;
let tokenLock : Contract;
let lpToken1 : Contract;
let lpToken2 : Contract;
let lpToken3 : Contract;

let timeLock : any;

let tokenAddress = "0xD533a949740bb3306d119CC777fa900bA034cd52";
let name = "Voting Escrow Scomp"
let symbol = "veScomp"
let version = "veScomp1.0.0";
let tokenPerBlock = ethers.utils.parseEther("100");

let amountToLock1 = ethers.utils.parseEther("10000");
let amountToLock2 = ethers.utils.parseEther("0");
let amountToLock3 = ethers.utils.parseEther("1000");
let lockTime1 = (2 * 365 * 86400);
let lockTime2 = (2 * 365 * 86400);
let lockTime3 = (2 * 365 * 86400);

let amountToDeposit1 = ethers.utils.parseEther("1000");
let amountToDeposit2 = ethers.utils.parseEther("1000");
let amountToDeposit3 = ethers.utils.parseEther("1000");

let initialBlock : any;
// todo review update multiplier if needed

async function main(): Promise<void> {
    await run('compile');
    [deployer, account1, account2, account3] = await ethers.getSigners();
}

async function deployContract(): Promise<void> {

    let factory = await ethers.getContractFactory("StableCompToken");
    tokenLock = await factory.deploy();
    await tokenLock.deployed();
    console.log("Token deposit address: ", tokenLock.address)

    let factoryVeScomp = await ethers.getContractFactory("veScomp");
    veCrv = await factoryVeScomp.deploy(tokenLock.address, name, symbol, version);
    await veCrv.deployed();
    console.log("Ve Scomp address: ", veCrv.address);

    veCrv = await ethers.getContractAt("IVotingEscrow", veCrv.address, deployer);
    let blockNumber = await ethers.provider.getBlockNumber();

    initialBlock = blockNumber + 100;

    let factoryMasterchef = await ethers.getContractFactory("Farm");
    farm = await factoryMasterchef.deploy(
        tokenLock.address,
        tokenPerBlock,
        initialBlock
    );
    await farm.deployed();
    console.log("Farm address: ", farm.address)

}

async function setupUtilityContract(): Promise<void> {

    let factory = await ethers.getContractFactory("StableCompToken");
    lpToken1 = await factory.deploy();
    await lpToken1.deployed();
    lpToken2 = await factory.deploy();
    await lpToken2.deployed();
    lpToken3 = await factory.deploy();
    await lpToken3.deployed();

}

async function fundContract(): Promise<void> {
    let balanceDeployer = tokenLock.balanceOf(deployer.address);

    let txApprove = await tokenLock.connect(deployer).approve(farm.address, balanceDeployer);
    await txApprove.wait();

    let tx = await farm.connect(deployer).fund(balanceDeployer);
    await tx.wait();
}

async function fundAccount(account: SignerWithAddress, amountToDeposit: any, amountToLock: any): Promise<void> {
    // send token to account
    if (amountToLock > 0) {
        let tx = await tokenLock.connect(deployer).transfer(account.address, amountToLock);
        await tx.wait();
    }
    if (amountToDeposit > 0) {
        let tx = await lpToken1.connect(deployer).transfer(account.address, amountToDeposit);
        await tx.wait();
        tx = await lpToken2.connect(deployer).transfer(account.address, amountToDeposit);
        await tx.wait();
        tx = await lpToken3.connect(deployer).transfer(account.address, amountToDeposit);
        await tx.wait();
    }
}

async function addPool(lpToken: any): Promise<void> {
    let tx = await farm.add(1000, lpToken, true);
    await tx.wait();
}

async function deposit(account: SignerWithAddress, pid: any, amountToDeposit: any): Promise<void> {

    if (amountToDeposit > 0 ) {
        let txApprove = await lpToken1.connect(account).approve(farm.address, amountToDeposit);
        await txApprove.wait();

        let tx = await farm.connect(account).deposit(pid, amountToDeposit);
        await tx.wait();
    }
}

async function withdraw(account: SignerWithAddress, pid: any, amountToWithdraw: any): Promise<void> {

    let balanceOfAccountBefore = await tokenLock.balanceOf(account.address);

    let tx = await farm.connect(account).withdraw(pid, amountToWithdraw);
    await tx.wait();

    let balanceOfAccount = await tokenLock.balanceOf(account.address);
    console.log("Token withdraw: ", ethers.utils.formatEther(balanceOfAccount.sub(balanceOfAccountBefore)))
}

async function mineBlock(nOfBlock: any): Promise<void> {
    let blockNumber = await ethers.provider.getBlockNumber();
    let block = await ethers.provider.getBlock(blockNumber);
    let newTimestamp = block.timestamp + (blockTime)

    console.log("------ Mine block ------")
    for (let i = 0; i < nOfBlock; i++) {
        await ethers.provider.send('evm_mine', [newTimestamp]);
        newTimestamp = newTimestamp + blockTime
    }
}

async function reachInitialBlock(): Promise<void> {
    let blockNumber = await ethers.provider.getBlockNumber();
    let block = await ethers.provider.getBlock(blockNumber);
    let newTimestamp = block.timestamp + (blockTime)

    console.log("------ Mine block ------")
    for (let i = 0; i < blockNumber - initialBlock; i++) {
        await ethers.provider.send('evm_mine', [newTimestamp]);
        newTimestamp = newTimestamp + blockTime
    }
}

async function readPendingToken(account: SignerWithAddress, pid: any): Promise<void> {
    let pendingToken = await farm.pending(pid, account.address)
    console.log("pendingToken")
    console.log(ethers.utils.formatEther(pendingToken))
}

  main()
    .then(async () => {

        await deployContract();

        await setupUtilityContract();

        await fundAccount(account1, amountToDeposit1, amountToLock1);
        await fundAccount(account2, amountToDeposit2, amountToLock2);
        await fundAccount(account3, amountToDeposit3, amountToLock3);

        await fundContract();

        await addPool(lpToken1.address);
        await addPool(lpToken2.address);
        //await addPool(lpToken3.address);

        await deposit(account1,0,amountToDeposit1)
        await deposit(account2,0,amountToDeposit2)
        //await deposit(account3,0,amountToDeposit3)

        await mineBlock(178);

        await readPendingToken(account1, 0);
        await readPendingToken(account2, 0);
        await readPendingToken(account3, 0);
        //await createLock(account1, amountToLock1, lockTime1);
        //await createLock(account2, amountToLock2, lockTime2);
        //await createLock(account3, amountToLock3, lockTime3);

        await withdraw(account1,0,amountToDeposit1)
        await withdraw(account2,0,amountToDeposit2)
        //await withdraw(account3,0,amountToDeposit3)



      /*
      await readPool();
      await read([account1, account2, account3]);
      //await simulateCalcFarming();

      /*await mineBlockCorrect(1);
      await checkpoint();
      await read(depositAccount2);
      await mineBlock();
      await read(depositAccount2);
      await withdraw(depositAccount2);

      /*await checkpoint();
      await read(depositAccount2);
      await mineBlock();
      await checkpoint();
      await read(depositAccount2);
      await mineBlock();
      await checkpoint();
      await read(depositAccount2);

      /*
      await deposit(account1);
        await deposit(account2);
        await mineBlock();
        await mineBlock();
        await mineBlock();
        await mineBlock();
        await mineBlock();
        await deposit(account3);
        await read();
        await deposit(account3);

       */
      process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

