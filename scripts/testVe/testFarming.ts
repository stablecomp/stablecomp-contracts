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

async function main(): Promise<void> {
  await run('compile');
  [deployer, account1, account2, account3] = await ethers.getSigners();
}

let oneWeek = 7 * 86400;
let blockOneDay: any = 6646;
let blockTime: any = 13;

let veCrv : Contract;
let tokenDeposit : Contract;
let timeLock : any;

let tokenAddress = "0xD533a949740bb3306d119CC777fa900bA034cd52";
let name = "Voting Escrow Scomp"
let symbol = "veScomp"
let version = "veScomp1.0.0";
let amountToLock1 = ethers.utils.parseEther("10000");
let amountToLock2 = ethers.utils.parseEther("100");
let amountToLock3 = ethers.utils.parseEther("1000");

async function deployContract(): Promise<void> {

    let factory = await ethers.getContractFactory("veScomp");
    veCrv = await factory.deploy(tokenAddress, name, symbol, version);
    await veCrv.deployed();

    console.log("Address: ", veCrv.address);

    veCrv = await ethers.getContractAt("IVotingEscrow", veCrv.address, deployer);

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
async function createLock(account: SignerWithAddress, amount: any): Promise<void> {

    console.log("Approve")
    let txApprove = await tokenDeposit.connect(account).approve(veCrv.address, ethers.constants.MaxUint256);
    let txApprovedCompleted = await txApprove.wait();

    console.log("lock")
    blockNumberGlobal = await ethers.provider.getBlockNumber();

    const current_date: Date = new Date();
    timeLock = (((current_date.getTime() / 1000)) + (2 * 365 * 86400)).toFixed(0)

    let balanceOfToken = await tokenDeposit.balanceOf(account.address);
    console.log("Initial balance of token is: ", ethers.utils.formatEther(balanceOfToken));

    let tx = await veCrv.connect(account).create_lock(amount, timeLock);
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

    let tx = await veCrv.connect(deployer).checkpoint();
    await tx.wait();

}

async function read(account: SignerWithAddress): Promise<void> {
    let initialVotingPower = await veCrv.balanceOfAt(account.address, blockNumberGlobal+1);
    //console.log("Initial voting power: ", ethers.utils.formatEther(initialVotingPower));

    let currentVotingPower = await veCrv.balanceOf(account.address);
    console.log("Current voting power: ", ethers.utils.formatEther(currentVotingPower));

    let totalSupply = await veCrv.totalSupply();
    console.log("Total voting power: ", ethers.utils.formatEther(totalSupply));

    let locked: any = await veCrv.locked(account.address);
    //console.log("Locked: ", ethers.utils.formatEther(locked[0]));
    //console.log("end: ", ethers.utils.formatUnits(locked[1], 0));

}

async function withdraw(account: SignerWithAddress): Promise<void> {

    console.log("Withdraw")

    let tx = await veCrv.connect(account).withdraw();
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

    let tx = await veCrv.connect(account).increase_unlock_time(timeLock);
    let txCompleted = await tx.wait()
    let feeTx = await price.getFeeTx(tx, txCompleted);
    console.log("Fee tx increase lock end: ", ethers.utils.formatEther(feeTx));

}

async function increaseLockAmount(account: SignerWithAddress): Promise<void> {

    console.log("------ Increase Lock Amount ------")
    let txApprove1 = await tokenDeposit.connect(account).approve(veCrv.address, 0);
    let txApprovedCompleted1 = await txApprove1.wait();
    let txApprove = await tokenDeposit.connect(account).approve(veCrv.address, ethers.constants.MaxUint256);
    let txApprovedCompleted = await txApprove.wait();

    let amountToLock = ethers.utils.parseEther("1000");

    let tx = await veCrv.connect(account).increase_amount(amountToLock);
    let txCompleted = await tx.wait()
    let feeTx = await price.getFeeTx(tx, txCompleted);
    console.log("Fee tx increase lock amount: ", ethers.utils.formatEther(feeTx));

}

async function transferOwnership(): Promise<void> {

    console.log("------ Transfer ownership ------")

    let tx = await veCrv.connect(deployer).transfer_ownership(account1.address);
    let txCompleted = await tx.wait()
}

async function simulateCalcFarming(): Promise<void> {

    console.log("------ Simulate calc farming ------")

    let dollarProvided1 = 1000;
    let dollarProvided2 = 0;
    let dollarProvided3 = 1000;
    let dollarProvided4 = 1000;
    let totalLiquidity = dollarProvided1 + dollarProvided2 + dollarProvided3 + dollarProvided4;

    console.log("Account 1 provided liquidity amount : $", dollarProvided1);
    console.log("Account 2 provided liquidity amount : $", dollarProvided2);
    console.log("Account 3 provided liquidity amount : $", dollarProvided3);
    console.log("Account 4 provided liquidity amount : $", dollarProvided4);
    console.log("Total provided : ", totalLiquidity);

    let votingBalance1 = await veCrv.balanceOf(accountDepositAddress1);
    let votingBalance2 = await veCrv.balanceOf(accountDepositAddress2);
    let votingBalance3 = await veCrv.balanceOf(accountDepositAddress3);
    let votingBalance4 = 0;
    let votingTotal = await veCrv.totalSupply();

    console.log("Voting balance 1: ", ethers.utils.formatEther(votingBalance1));
    console.log("Voting balance 2: ", ethers.utils.formatEther(votingBalance2));
    console.log("Voting balance 3: ", ethers.utils.formatEther(votingBalance3));
    console.log("Voting balance 4: ", votingBalance4);
    console.log("Voting total: ", ethers.utils.formatEther(votingTotal));

    let firstTerms1 = dollarProvided1*(12.5/100);
    let firstTerms2 = dollarProvided2*(12.5/100);
    let firstTerms3 = dollarProvided3*(12.5/100);
    let firstTerms4 = dollarProvided4*(12.5/100);

    let secondTerms1 = ((100-12.5)/100) * totalLiquidity * votingBalance1 / votingTotal;
    let secondTerms2 = ((100-12.5)/100) * totalLiquidity * votingBalance2 / votingTotal;
    let secondTerms3 = ((100-12.5)/100) * totalLiquidity * votingBalance3 / votingTotal;
    let secondTerms4 = ((100-12.5)/100) * totalLiquidity * votingBalance4 / votingTotal;

    let sum1 = firstTerms1 + secondTerms1
    let sum2 = firstTerms2 + secondTerms2
    let sum3 = firstTerms3 + secondTerms3
    let sum4 = firstTerms4 + secondTerms4

    let calc1 = Math.min(sum1, dollarProvided1);
    let calc2 = Math.min(sum2, dollarProvided2);
    let calc3 = Math.min(sum3, dollarProvided3);
    let calc4 = Math.min(sum4, dollarProvided4);

    let boost1 = ((calc1 / dollarProvided1) * 8)
    let boost2 = ((calc2 / dollarProvided2) * 8)
    let boost3 = ((calc3 / dollarProvided3) * 8)
    let boost4 = ((calc4 / dollarProvided4) * 8)
    console.log("Boost account1 : ", boost1);
    console.log("Boost account2 : ", boost2);
    console.log("Boost account3 : ", boost3);
    console.log("Boost account4 : ", boost4);

}


  main()
    .then(async () => {
      await deployContract();
      await transferOwnership();
      await setupUtilityContract();
      await impersonateAccount();
      await createLock(depositAccount1, amountToLock1);
      //await createLock(depositAccount2, amountToLock2);
      await createLock(depositAccount3, amountToLock3);
      await read(depositAccount1);
      await simulateCalcFarming();

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

