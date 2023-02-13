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
let masterchefScomp : Contract;
let tokenLock : Contract;
let lpToken1 : Contract;
let lpToken2 : Contract;
let lpToken3 : Contract;

let timeLock : any;

let tokenAddress = "0xD533a949740bb3306d119CC777fa900bA034cd52";
let name = "Voting Escrow Scomp"
let symbol = "veScomp"
let version = "veScomp1.0.0";
let tokenPerBlock = 9;

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

    let factoryMasterchef = await ethers.getContractFactory("MasterChefScomp");
    masterchefScomp = await factoryMasterchef.deploy(
        tokenLock.address,
        veCrv.address,
        tokenPerBlock,
        initialBlock
    );
    await masterchefScomp.deployed();
    console.log("MasterchefScomp address: ", masterchefScomp.address)

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

async function deposit(accounts: SignerWithAddress[], pid: any, amountToDeposit: any): Promise<void> {
    if (amountToDeposit > 0 ) {
        for (let i = 0; i < accounts.length; i++) {
            let txApprove = await lpToken1.connect(accounts[i]).approve(masterchefScomp.address, amountToDeposit);
            await txApprove.wait();
        }

        for (let i = 0; i < accounts.length; i++) {
            let tx = await masterchefScomp.connect(accounts[i]).deposit(pid, amountToDeposit);
            await tx.wait();
        }
    }
}

async function withdraw(account: SignerWithAddress, pid: any, amountToWithdraw: any): Promise<void> {

    let balanceOfAccountBefore = await tokenLock.balanceOf(account.address);

    let tx = await masterchefScomp.connect(account).withdraw(pid, amountToWithdraw);
    await tx.wait();

    let balanceOfAccount = await tokenLock.balanceOf(account.address);
    console.log("Token withdraw: ", ethers.utils.formatEther(balanceOfAccount.sub(balanceOfAccountBefore)))

    // get info pool
    let userInfo = await masterchefScomp.userInfo(pid, account.address);
    console.log("Amount: ", userInfo.amount)
    console.log("Reward debt: ", userInfo.rewardDebt)
    console.log("Boost multiplier: ", userInfo.boostMultiplier)
}

async function createLock(account: SignerWithAddress, amountToLock: any, lockTime: any): Promise<void> {

    if (amountToLock > 0 ) {
        let txApprove = await tokenLock.connect(account).approve(veCrv.address, ethers.constants.MaxUint256);
        let txApprovedCompleted = await txApprove.wait();
        let feeTxApprove = await price.getFeeTx(txApprove, txApprovedCompleted);

        const current_date: Date = new Date();
        timeLock = (((current_date.getTime() / 1000)) + lockTime).toFixed(0)

        let tx = await veCrv.connect(account).create_lock(amountToLock, timeLock);
        let txCompleted = await tx.wait()
        let feeTxCreateLock = await price.getFeeTx(tx, txCompleted);

    }
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

    console.log("------ reach initial block ------")
    for (let i = 0; i < initialBlock - blockNumber; i++) {
        await ethers.provider.send('evm_mine', [newTimestamp]);
        newTimestamp = newTimestamp + blockTime
    }
}

async function checkpoint(): Promise<void> {

    let tx = await veCrv.connect(deployer).checkpoint();
    await tx.wait();

}

async function read(account: SignerWithAddress[]): Promise<void> {
    for (let i = 0; i < account.length; i++) {
        let currentVotingPower = await veCrv.balanceOf(account[i].address);
        console.log("Voting power account ", i+1, " is: ", ethers.utils.formatEther(currentVotingPower));

    }

    let totalSupply = await veCrv.totalSupply();
    console.log("Total voting power: ", ethers.utils.formatEther(totalSupply));

}

async function unlock(account: SignerWithAddress): Promise<void> {

    console.log("Withdraw")

    let tx = await veCrv.connect(account).withdraw();
    let txCompleted = await tx.wait()
    let feeTx = await price.getFeeTx(tx, txCompleted);
    console.log("Fee tx withdraw: ", ethers.utils.formatEther(feeTx));

    let balanceOfToken = await tokenLock.balanceOf(account.address);
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
    let txApprove1 = await tokenLock.connect(account).approve(veCrv.address, 0);
    let txApprovedCompleted1 = await txApprove1.wait();
    let txApprove = await tokenLock.connect(account).approve(veCrv.address, ethers.constants.MaxUint256);
    let txApprovedCompleted = await txApprove.wait();

    let amountToLock = ethers.utils.parseEther("1000");

    let tx = await veCrv.connect(account).increase_amount(amountToLock);
    let txCompleted = await tx.wait()
    let feeTx = await price.getFeeTx(tx, txCompleted);
    console.log("Fee tx increase lock amount: ", ethers.utils.formatEther(feeTx));

}

async function simulateCalcFarming(): Promise<void> {

    console.log("------ Simulate calc farming ------")

    let dollarProvided1 = 111500;
    let dollarProvided2 = 0;
    let dollarProvided3 = 111500;
    let dollarProvided4 = 111500;
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

async function readPool(): Promise<void> {
    console.log("reading pools...")
    let poolsLength = await masterchefScomp.poolLength();
    console.log("Pools length: ", ethers.utils.formatUnits(poolsLength, 0));

    for (let i = 0; i < poolsLength; i++) {
        let pool = await masterchefScomp.poolInfo(i);
        console.log("Pool index ", i ," is: ", pool)
    }
}

async function readMultiplier(accounts: SignerWithAddress[], pid: any): Promise<void> {
    for (let i = 0; i < accounts.length; i++) {
        let multiplier = await masterchefScomp.calcMultiplier(accounts[i].address, pid);
        console.log("Multiplier for account ", i+1 ," is: ", ethers.utils.formatEther(multiplier))
    }
}

async function readPendingToken(account: SignerWithAddress, pid: any): Promise<void> {
    let pendingToken = await masterchefScomp.pendingToken(pid, account.address)
    console.log("pendingToken")
    console.log(ethers.utils.formatEther(pendingToken))
}

  main()
    .then(async () => {

        await deployContract();

        await fundContract();
        await setupUtilityContract();

        await fundAccount(account1, amountToDeposit1, amountToLock1);
        await fundAccount(account2, amountToDeposit2, amountToLock2);
        await fundAccount(account3, amountToDeposit3, amountToLock3);

        await fundContract();

        await createLock(account1, amountToLock1, lockTime1);
        await createLock(account2, amountToLock2, lockTime2);
        await createLock(account3, amountToLock3, lockTime3);

        await checkpoint();

        await addPool(lpToken1.address);
        //await addPool(lpToken2.address);
        //await addPool(lpToken3.address);
        await readPool();

        await readMultiplier([account1, account2, account3], 0);

        await deposit([account1, account2, account3],0,amountToDeposit1.div(2))
        //await deposit([account1],0,amountToDeposit1)

        await reachInitialBlock();

        await mineBlock(10);

        // check pending token
        let pendingReward = await masterchefScomp.pendingToken(0, account1.address);
        console.log("Pending reward is: ", ethers.utils.formatEther(pendingReward))

        let balanceSComp = await tokenLock.balanceOf(account1.address);
        console.log("Balance sComp before: ", ethers.utils.formatEther(balanceSComp))

        await deposit([account1, account2, account3],0,amountToDeposit1.div(2))


        // check pending token
        let balanceSCompAfter = await tokenLock.balanceOf(account1.address);
        console.log("Balance sComp after: ", ethers.utils.formatEther(balanceSCompAfter))

        await readMultiplier([account1, account2, account3], 0);

        await mineBlock(10);

        await readPendingToken(account1, 0);
        await readPendingToken(account2, 0);
        await readPendingToken(account3, 0);

        await withdraw(account1,0,0)
        //await withdraw(account1,0,amountToDeposit1)
        await withdraw(account2,0,amountToDeposit2)
        await withdraw(account3,0,amountToDeposit3)


        /*

                await deposit([account1, account2, account3],0,amountToDeposit1)

                await mineBlock(10);

                await readMultiplier([account1, account2, account3], 0);

                await readPendingToken(account1, 0);
                await readPendingToken(account2, 0);
                await readPendingToken(account3, 0);

                await withdraw(account1,0,amountToDeposit1)
                await withdraw(account2,0,amountToDeposit2)
                await withdraw(account3,0,amountToDeposit3)

                await readMultiplier([account1, account2, account3], 0);



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

