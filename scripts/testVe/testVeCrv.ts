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

let accountDepositAddress1 = "0x9b44473e223f8a3c047ad86f387b80402536b029"; // account have amount of token deposit
let accountDepositAddress2 = "0x32d03db62e464c9168e41028ffa6e9a05d8c6451"; // account have amount of token deposit
let accountDepositAddress3 = "0xf89501b77b2fa6329f94f5a05fe84cebb5c8b1a0"; // account have amount of token deposit

const veCrvABI = [
    "function create_lock(uint256 _value, uint256 _unlock_time)",
    "function balanceOf(address) external view returns(uint256)",
    "function balanceOfAt(address, uint256) external view returns(uint256)",
    "function totalSupply() external view returns(uint256)",
    "function checkpoint() external",
    "function locked(address) external view returns(int128, uint256)",
];

async function main(): Promise<void> {
  await run('compile');
  [deployer, account1, account2, account3] = await ethers.getSigners();
}

let oneWeek = 7 * 86400;
let veCrv_1 : Contract;
let veCrv : Contract;
let tokenDeposit : Contract;
let timeLock : any;

let tokenAddress = "0xD533a949740bb3306d119CC777fa900bA034cd52";
let name = "Vote-escrowed Scomp"
let symbol = "veScomp"
let version = "veScomp1.0.0";

async function deployContract(): Promise<void> {

    let factory = await ethers.getContractFactory("veCrv");
    veCrv = await factory.deploy(tokenAddress, name, symbol, version);
    await veCrv.deployed();

    console.log("Address: ", veCrv.address);

    veCrv = await new ethers.Contract(veCrv.address, veCrvABI, deployer);

}

async function setupUtilityContract(): Promise<void> {

    let factory = await ethers.getContractFactory("GenericERC20");
    tokenDeposit = await factory.attach(tokenAddress);
}

async function impersonateAccount(): Promise<void> {
    console.log("Impersonate account...")
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [accountDepositAddress1],
    });
    depositAccount1 = await ethers.getSigner(accountDepositAddress1);

    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [accountDepositAddress2],
    });
    depositAccount2 = await ethers.getSigner(accountDepositAddress2);

    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [accountDepositAddress3],
    });
    depositAccount3 = await ethers.getSigner(accountDepositAddress3);

}

let blockNumberGlobal : any
async function createLock(account: SignerWithAddress): Promise<void> {

    console.log("Approve")
    let txApprove = await tokenDeposit.connect(account).approve(veCrv.address, ethers.constants.MaxUint256);
    let txApprovedCompleted = await txApprove.wait();

    console.log("lock")
    blockNumberGlobal = await ethers.provider.getBlockNumber();

    const current_date: Date = new Date();
    timeLock = (((current_date.getTime() / 1000)) + (1 * 365 * 86400)).toFixed(0)

    let amountToLock = ethers.utils.parseEther("1000");

    let tx = await veCrv.connect(account).create_lock(amountToLock, timeLock);
    let txCompleted = await tx.wait()
    let feeTx = await price.getFeeTx(tx, txCompleted);
    console.log("Fee tx lock: ", ethers.utils.formatEther(feeTx));

}

async function mineBlockCorrect(): Promise<void> {
    let blockNumber = await ethers.provider.getBlockNumber();
    let block = await ethers.provider.getBlock(blockNumber);
    let newTimestamp = block.timestamp + 13;

    await ethers.provider.send('evm_mine', [newTimestamp]);
}

async function mineBlock(): Promise<void> {
    let blockNumber = await ethers.provider.getBlockNumber();
    let block = await ethers.provider.getBlock(blockNumber);
    let newTimestamp = block.timestamp + (oneWeek * 53)

    await ethers.provider.send('evm_mine', [newTimestamp]);
}

async function checkpoint(): Promise<void> {

    let tx = await veCrv.connect(deployer).checkpoint();
    await tx.wait();

}

async function read(account: SignerWithAddress): Promise<void> {
    let blockNumber = await ethers.provider.getBlockNumber();
    let block = await ethers.provider.getBlock(blockNumber);
    let blockTimestamp = block.timestamp

    let initialVotingPower = await veCrv.balanceOfAt(account.address, blockNumberGlobal+1);
    console.log("Initial voting power: ", ethers.utils.formatEther(initialVotingPower));

    let currentVotingPower = await veCrv.balanceOf(account.address);
    console.log("Current voting power: ", ethers.utils.formatEther(currentVotingPower));

    let totalSupply = await veCrv.totalSupply();
    console.log("Total voting power: ", ethers.utils.formatEther(totalSupply));

    let locked: any = await veCrv.locked(account.address);
    console.log("Locked: ", ethers.utils.formatEther(locked[0]));
    console.log("end: ", locked[1]);

    /*
        const example = await Example.deployed();
        example.methods['setValue(uint256)'](123);
        example.methods['setValue(uint256,uint256)'](11, 55);
     */
}

async function withdraw(account: SignerWithAddress): Promise<void> {

    console.log("lock")
    blockNumberGlobal = await ethers.provider.getBlockNumber();

    const current_date: Date = new Date();
    timeLock = (((current_date.getTime() / 1000)) + (1 * 365 * 86400)).toFixed(0)

    let amountToLock = ethers.utils.parseEther("1000");

    let tx = await veCrv.connect(account).create_lock(amountToLock, timeLock);
    let txCompleted = await tx.wait()
    let feeTx = await price.getFeeTx(tx, txCompleted);
    console.log("Fee tx lock: ", ethers.utils.formatEther(feeTx));

}


  main()
    .then(async () => {
      await deployContract();
      await setupUtilityContract();
      await impersonateAccount();
      await createLock(depositAccount2);
      await read(depositAccount2);
      await mineBlockCorrect();
        await checkpoint();
        await read(depositAccount2);
        await mineBlock();

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

