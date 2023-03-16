import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {create} from "domain";
import price from '../../utils/price';
import {deployScompTask} from "../../01_task/sCompTask";

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
let blockOneDay: any = 6646;
let blockTime: any = 13;

let veCrv_1 : Contract;
let veScomp : Contract;
let tokenDeposit : Contract;
let timeLock : any;

let tokenAddress = "0xD533a949740bb3306d119CC777fa900bA034cd52";
let name = "Voting Escrow Scomp"
let symbol = "veScomp"
let version = "veScomp1.0.0";

async function deployContract(): Promise<void> {

    veScomp = await deployScompTask.deployVe(tokenAddress)
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
    let txApprove = await tokenDeposit.connect(account).approve(veScomp.address, ethers.constants.MaxUint256);
    let txApprovedCompleted = await txApprove.wait();

    console.log("lock")
    blockNumberGlobal = await ethers.provider.getBlockNumber();

    const current_date: Date = new Date();
    timeLock = (((current_date.getTime() / 1000)) + (1 * 365 * 86400)).toFixed(0)

    let diff = (timeLock - current_date.getTime() / 1000).toFixed(0)
    console.log("Diff: ", diff)


    let amountToLock = ethers.utils.parseEther("1000");

    let balanceOfToken = await tokenDeposit.balanceOf(account.address);
    console.log("Initial balance of token is: ", ethers.utils.formatEther(balanceOfToken));

    let tx = await veScomp.connect(account).create_lock(amountToLock, timeLock);
    let txCompleted = await tx.wait()
    let feeTx = await price.getFeeTx(tx, txCompleted);
    console.log("Fee tx lock: ", ethers.utils.formatEther(feeTx));

}

async function mineBlockCorrect(dayToMine: any): Promise<void> {
    let blockNumber = await ethers.provider.getBlockNumber();
    let block = await ethers.provider.getBlock(blockNumber);
    let newTimestamp = block.timestamp + blockTime;

    console.log("------ Mine block ------")
    for (let i = 0; i < blockOneDay*dayToMine ; i++) {
        newTimestamp = newTimestamp + blockTime
        await ethers.provider.send('evm_mine', [newTimestamp]);
    }
}

async function mineBlock(): Promise<void> {
    let blockNumber = await ethers.provider.getBlockNumber();
    let block = await ethers.provider.getBlock(blockNumber);
    let newTimestamp = block.timestamp + (oneWeek * 106)

    console.log("------ Mine block ------")
    await ethers.provider.send('evm_mine', [newTimestamp]);
}

async function checkpoint(): Promise<void> {

    let tx = await veScomp.connect(deployer).checkpoint();
    await tx.wait();

}

async function read(account: SignerWithAddress): Promise<void> {
    let initialVotingPower = await veScomp.balanceOfAt(account.address, blockNumberGlobal+1);
    //console.log("Initial voting power: ", ethers.utils.formatEther(initialVotingPower));

    let currentVotingPower = await veScomp.balanceOf(account.address);
    console.log("Current voting power: ", ethers.utils.formatEther(currentVotingPower));

    let totalSupply = await veScomp.totalSupply();
    console.log("Total voting power: ", ethers.utils.formatEther(totalSupply));

    let locked: any = await veScomp.locked(account.address);
    //console.log("Locked: ", ethers.utils.formatEther(locked[0]));
    //console.log("end: ", ethers.utils.formatUnits(locked[1], 0));

}

async function withdraw(account: SignerWithAddress): Promise<void> {

    console.log("Withdraw")

    let tx = await veScomp.connect(account).withdraw();
    let txCompleted = await tx.wait()
    let feeTx = await price.getFeeTx(tx, txCompleted);
    console.log("Fee tx withdraw: ", ethers.utils.formatEther(feeTx));

    let balanceOfToken = await tokenDeposit.balanceOf(account.address);
    console.log("Final balance of token is: ", ethers.utils.formatEther(balanceOfToken));

}

async function increaseUnlockTime(account: SignerWithAddress): Promise<void> {

    console.log("------ Increase Unlock Time ------")
    const current_date: Date = new Date();
    timeLock = (((current_date.getTime() / 1000)) + (2 * 365 * 86400)).toFixed(0)

    let tx = await veScomp.connect(account).increase_unlock_time(timeLock);
    let txCompleted = await tx.wait()
    let feeTx = await price.getFeeTx(tx, txCompleted);
    console.log("Fee tx increase lock end: ", ethers.utils.formatEther(feeTx));

}

async function increaseLockAmount(account: SignerWithAddress): Promise<void> {

    console.log("------ Increase Lock Amount ------")
    let txApprove1 = await tokenDeposit.connect(account).approve(veScomp.address, 0);
    let txApprovedCompleted1 = await txApprove1.wait();
    let txApprove = await tokenDeposit.connect(account).approve(veScomp.address, ethers.constants.MaxUint256);
    let txApprovedCompleted = await txApprove.wait();

    let amountToLock = ethers.utils.parseEther("1000");

    let tx = await veScomp.connect(account).increase_amount(amountToLock);
    let txCompleted = await tx.wait()
    let feeTx = await price.getFeeTx(tx, txCompleted);
    console.log("Fee tx increase lock amount: ", ethers.utils.formatEther(feeTx));

}

async function transferOwnership(): Promise<void> {

    console.log("------ Transfer ownership ------")

    let tx = await veScomp.connect(deployer).transfer_ownership(account1.address);
    let txCompleted = await tx.wait()
}


  main()
    .then(async () => {
      await deployContract();
      await transferOwnership();
      await setupUtilityContract();
      await impersonateAccount();
      await createLock(depositAccount2);
      await read(depositAccount2);
      await mineBlockCorrect(1);
      await increaseUnlockTime(depositAccount2);
      await read(depositAccount2);
      await increaseLockAmount(depositAccount2);
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

