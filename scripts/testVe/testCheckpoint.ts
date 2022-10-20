import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers, upgrades } = hardhat;

let deployer : SignerWithAddress;
let account1 : SignerWithAddress;
let account2 : SignerWithAddress;
let account3 : SignerWithAddress;

async function main(): Promise<void> {
  await run('compile');
  [deployer, account1, account2, account3] = await ethers.getSigners();
}

let oneWeek = 7 * 86400;
let checkpointContract : Contract;
let timeLock : any;
async function setupContract(): Promise<void> {

    let factory = await ethers.getContractFactory("TestCheckpoint");
    checkpointContract = await factory.deploy();
    await checkpointContract.deployed();

}

async function deposit(account: SignerWithAddress): Promise<void> {

    console.log("deposit")
    let blockNumber = await ethers.provider.getBlockNumber();
    let block = await ethers.provider.getBlock(blockNumber);
    let blockTimestamp = block.timestamp

    timeLock = oneWeek*4 + blockTimestamp;
    let amountToLock = ethers.utils.parseEther("100");

    let tx = await checkpointContract.connect(account).deposit(amountToLock, timeLock);
    await tx.wait()
}

async function mineBlock(): Promise<void> {
    let blockNumber = await ethers.provider.getBlockNumber();
    let block = await ethers.provider.getBlock(blockNumber);
    let newTimestamp = block.timestamp + oneWeek

    await ethers.provider.send('evm_mine', [newTimestamp]);
}

async function read(): Promise<void> {
    let week = await checkpointContract.WEEK();
    console.log("Week timestamp: ", week)
    let totLockTime = await checkpointContract.totLockTime();
    console.log("Tot lock time: ", totLockTime)
    let lastLockTime = await checkpointContract.lastLock();
    console.log("Last lock time: ", lastLockTime)

    let weekToLockExpired = await checkpointContract.weekToLockExpired(1668038400)
    let weekToLockExpired2 = await checkpointContract.weekToLockExpired(1668643200)
    console.log("Week to lock expired 1: ", weekToLockExpired)
    console.log("Week to lock expired 2: ", weekToLockExpired2)

    let userDeposited = await checkpointContract.userDeposited();
    console.log("User Deposited: ", userDeposited);
    let userExpired = await checkpointContract.userExpired();
    console.log("User expired: ", userExpired);
}


  main()
    .then(async () => {
      await setupContract();
      await deposit(account1);
      await mineBlock();
        await deposit(account2);
        await mineBlock();
        await mineBlock();
        await mineBlock();
        await mineBlock();
        await mineBlock();
        await deposit(account3);
        await read();
        await deposit(account3);
      process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

