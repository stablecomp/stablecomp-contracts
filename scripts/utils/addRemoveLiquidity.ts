import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {min} from "hardhat/internal/util/bigint";
import price from "../utils/price";

const { run, ethers, upgrades } = hardhat;

// constant json
const wethABI = require('../../abi/weth.json');
const baseRewardPoolABI = require('../../abi/baseRewardPoolAbi.json');
const boosterABI = require('../../abi/booster.json');
const poolCurveABI = require('../../abi/poolCurve.json');

// variable json
const info = require('../../strategyInfo/infoPool/3eur.json');

let deployer : SignerWithAddress;
let governance : SignerWithAddress;
let strategist : SignerWithAddress;
let rewards : SignerWithAddress;
let depositor : SignerWithAddress;
let operatorBaseReward : SignerWithAddress;
let depositAccount1 : SignerWithAddress;
let depositAccount2 : SignerWithAddress;
let depositAccount3 : SignerWithAddress;

// contract deploy
let sCompVault : Contract;
let sCompTokenContract : Contract;
let sCompController : Contract;
let sCompStrategy : Contract;
let sCompTimelockController : Contract;

// variable contract
let curveSwapWrapped : Contract;
let curveSwap : Contract;
let wantContract: Contract;
let tokenDepositContract: Contract;
let token2: Contract;
let tokenCompoundContract: Contract;
let feeContract: Contract;
let baseRewardPoolContract: Contract;

// constant contract
let cvxContract: Contract;
let crvContract: Contract;
let boosterContract: Contract;
let feeDistributionContract: Contract;
let surplusConverterV2Contract: Contract;
let surplusConverterV3Contract: Contract;
let veScompContract: Contract;

let poolCurveContract: Contract;

// variable address
let wantAddress = info.wantAddress; // **name** // 18 decimals
let tokenCompoundAddress = info.tokenCompoundAddress; // **name** // 18 decimals
let curveSwapAddress = info.curveSwapAddress; // pool **name pool** curve
let tokenDepositAddress = info.tokenDepositAddress; // token deposit in pool curve // usdc 6 decimals
let accountDepositAddress1 = info.accountDepositAddress1; // account have amount of token deposit
let accountDepositAddress2 = info.accountDepositAddress2; // account have amount of token deposit
let accountDepositAddress3 = info.accountDepositAddress3; // account have amount of token deposit
let baseRewardPoolAddress = info.baseRewardPoolAddress; // address of baseRewardPool in convex

// constant address
let crvAddress = "0xD533a949740bb3306d119CC777fa900bA034cd52"
let cvxAddress = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B"
let boosterAddress = "0xF403C135812408BFbE8713b5A23a04b3D48AAE31";
let wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
let uniswapV2Address = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
let uniswapV3Address = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";
let sushiswapAddress = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F";

// convex pool info
let nameStrategy = info.nameStrategy
let pidPool = info.pidPool;
let nElementPool = info.nElementPool;
let tokenCompoundPosition = info.tokenCompoundPosition;

// fee config
let feeGovernance = info.feeGovernance;
let feeStrategist = info.feeStrategist;
let feeWithdraw = info.feeWithdraw;
let feeDeposit = info.feeDeposit;
let minDelay = 86400

// test config
let maxUint = ethers.constants.MaxUint256;
let blockOneDay: any = 7200;
let blockTime: any = 13;
let dayToMine: any = 7;
let WEEK = 7 * 86400;

let depositv1Value: any = [];
let initialBalanceDepositPool: any = [];
let blockFinishBaseReward: any;
let amountToDepositLiquidity: any = ethers.utils.parseEther(info.amountToDepositLiquidity);
let initialTimestamp: any;

let name = "Voting Escrow Scomp"
let symbol = "veScomp"
let version = "veScomp1.0.0";

let firstTokenTime : any;

async function main(): Promise<void> {
  let blockNumber = await ethers.provider.getBlockNumber();
  let block = await ethers.provider.getBlock(blockNumber);
  initialTimestamp = block.timestamp

  await run('compile');
  [deployer, governance, strategist, rewards, depositor] = await ethers.getSigners();
}

async function impersonateAccount(): Promise<void> {
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

async function fundAccountETH(account: SignerWithAddress): Promise<void> {
    await deployer.sendTransaction({
        from: deployer.address,
        to: account.address,
        value: ethers.utils.parseEther("1"), // Sends exactly 1.0 ether
    });
}

async function addLiquidity(account: SignerWithAddress, index: any): Promise<void> {
    initialBalanceDepositPool[index] = await tokenDepositContract.balanceOf(account.address);
    console.log("add liquidity amount: ", ethers.utils.formatUnits(initialBalanceDepositPool[index], 6))

    let txApprove = await tokenDepositContract.connect(account).approve(curveSwap.address, ethers.constants.MaxUint256);
    await txApprove.wait();

    let tx = await curveSwap.connect(account).add_liquidity([0, initialBalanceDepositPool[index]],0);
    await tx.wait();
}

async function setupUtilityContract(abiCurveSwap: any): Promise<void> {

    // Get curve swap contract
    curveSwap = await new ethers.Contract(curveSwapAddress, abiCurveSwap, ethers.provider);

    // get want contract
    wantContract = await new ethers.Contract(wantAddress, wethABI, ethers.provider);

    // get feeContract
    tokenDepositContract = await new ethers.Contract(tokenDepositAddress, wethABI, ethers.provider);
    token2 = await new ethers.Contract("0x853d955acef822db058eb8505911ed77f175b99e", wethABI, ethers.provider);

    boosterContract = await new ethers.Contract(boosterAddress, boosterABI, ethers.provider);

    tokenCompoundContract = await new ethers.Contract(tokenCompoundAddress, wethABI, ethers.provider);

    baseRewardPoolContract = await new ethers.Contract(baseRewardPoolAddress, baseRewardPoolABI, ethers.provider);


    crvContract = await new ethers.Contract(crvAddress, wethABI, ethers.provider);
    cvxContract = await new ethers.Contract(cvxAddress, wethABI, ethers.provider);

    feeContract = await new ethers.Contract(wethAddress, wethABI, ethers.provider);

}

async function removeLiquidity(account: SignerWithAddress, index: any): Promise<void> {

    let balanceDepositBefore = await tokenDepositContract.balanceOf(account.address);
    let balance2Before = await token2.balanceOf(account.address);

    let tx = await curveSwap.connect(account).remove_liquidity(ethers.utils.parseEther("100"), [0,0]);
    await tx.wait();

    let balanceDepositAfter = await tokenDepositContract.balanceOf(account.address);
    let balance2After = await token2.balanceOf(account.address);

    console.log("Balance token deposit: ", ethers.utils.formatUnits(balanceDepositAfter.sub(balanceDepositBefore), 6))
    console.log("Balance 2: ", ethers.utils.formatEther(balance2After.sub(balance2Before)))
}


async function mineBlock(dayToMine: any): Promise<void> {
    let blockNumber = await ethers.provider.getBlockNumber();
    let block = await ethers.provider.getBlock(blockNumber);
    let newTimestamp = block.timestamp + ( blockOneDay * dayToMine * blockTime)

    await ethers.provider.send('evm_mine', [newTimestamp]);

}

main()
    .then(async () => {
        let abi = [
            "function add_liquidity(uint[2] calldata amounts, uint min_mint_amount)",
            "function remove_liquidity(uint amounts, uint[2] calldata min_mint_amounts)",
            "function remove_liquidity_one_coin(uint amounts, int128 index, uint min_mint_amounts)",
        ];

        await setupUtilityContract(abi);

        await impersonateAccount();

        await fundAccountETH(depositAccount1)
        await fundAccountETH(depositAccount2)
        await fundAccountETH(depositAccount3)

        await addLiquidity(depositAccount1, 0);
        await addLiquidity(depositAccount2, 1);
        await addLiquidity(depositAccount3, 2);

        await removeLiquidity(depositAccount1, 0);
        await removeLiquidity(depositAccount2, 1);
        await removeLiquidity(depositAccount3, 2);

        /*

        await withdraw(depositAccount1, 0);
        await withdraw(depositAccount2, 1);
        await withdraw(depositAccount3, 2);
        await removeLiquidity(depositAccount1, 0);
        await removeLiquidity(depositAccount2, 1);
        await removeLiquidity(depositAccount3, 2);
*/
        process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

