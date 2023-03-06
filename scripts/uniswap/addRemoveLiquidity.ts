import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {min} from "hardhat/internal/util/bigint";
import price from "../utils/price";
import {INonfungiblePositionManager} from "../../typechain";

const { run, ethers } = hardhat;

// constant json
const wethABI = require('../../abi/weth.json');
const uniswapV3ABI = require('../../abi/uniswapV3ABI.json');
const poolUniswapV3ABI = require('../../abi/poolUniswapV3.json');
const nonFungiblePositionManagerABI = require('../../abi/nonFungiblePositionManager.json');

// variable json
const uniswapAddress = require('../../strategyInfo/address_mainnet/uniswapAddress.json');
const tokenAddress = require('../../strategyInfo/address_mainnet/tokenAddress.json');
const tokenDecimals = require('../../strategyInfo/address_mainnet/tokenDecimals.json');

let deployer : SignerWithAddress;
let account2 : SignerWithAddress;
let accountWhale3Crv : any;
let accountWhaleUsdc : any;

// variable contract
let testSwap : Contract;
let curveSwap : Contract;
let usdcContract: Contract;
let threeCrvContract: Contract;
let token2: Contract;
let uniswapV3Contract: Contract;
let poolUniswapV3Contract: Contract;
let nonFungiblePositionManagerContract: Contract;
let baseRewardPoolContract: Contract;

// constant contract
let accountWhale3CrvAddress = "0x4486083589A063ddEF47EE2E4467B5236C508fDe";
let accountWhaleUsdcAddress = "0xDa9CE944a37d218c3302F6B82a094844C6ECEb17";

let poolAddress = "0xb0d092380d89a6857cc3c57af9519f4ac5abc0be";
let nonFungiblePositionManagerAddress = "0xc36442b4a4522e871399cd717abdd847ab11fe88";

// constant address
let uniswapV3Address = uniswapAddress.uniswapV3
let blockOneDay: any = 7200;
let blockTime: any = 13;

let initialBalanceDepositPool: any = [];
let initialTimestamp: any;

const provider = new ethers.providers.JsonRpcProvider("http://104.248.142.30:8545")

async function main(): Promise<void> {
  let blockNumber = await ethers.provider.getBlockNumber();
  let block = await ethers.provider.getBlock(blockNumber);
  initialTimestamp = block.timestamp

  await run('compile');
  [deployer, account2] = await ethers.getSigners();
}

async function setupUtilityContract(): Promise<void> {

    let testSwapFactory = await ethers.getContractFactory("TestSwap");
    testSwap = await testSwapFactory.deploy()
    await testSwap.deployed();

    console.log("Test swap deployed to: ", testSwap.address);

    uniswapV3Contract = await new ethers.Contract(uniswapV3Address, uniswapV3ABI, ethers.provider);
    poolUniswapV3Contract = await new ethers.Contract(poolAddress, poolUniswapV3ABI, ethers.provider);
    nonFungiblePositionManagerContract = await new ethers.Contract(nonFungiblePositionManagerAddress, nonFungiblePositionManagerABI, ethers.provider);

    threeCrvContract = await new ethers.Contract(tokenAddress.threeCrv, wethABI, ethers.provider);
    usdcContract = await new ethers.Contract(tokenAddress.usdc, wethABI, ethers.provider);
}

async function impersonateAccount(): Promise<void> {
    const provider = new ethers.providers.JsonRpcProvider(
        "http://104.248.142.30:8545"
    );

    await provider.send("hardhat_impersonateAccount", [accountWhale3CrvAddress]);
    accountWhale3Crv = await provider.getSigner(accountWhale3CrvAddress);

    await provider.send("hardhat_impersonateAccount", [accountWhaleUsdcAddress]);
    accountWhaleUsdc = await provider.getSigner(accountWhaleUsdcAddress);

}

async function fundAccountETH(account: SignerWithAddress): Promise<void> {
    await deployer.sendTransaction({
        from: deployer.address,
        to: account.address,
        value: ethers.utils.parseEther("1"), // Sends exactly 1.0 ether
    });
}

async function fundAccountUSDC(): Promise<void> {
    let balanceUsdc = await usdcContract.balanceOf(accountWhaleUsdc._address);
    let tx = await usdcContract.connect(accountWhaleUsdc).transfer(accountWhale3Crv._address, balanceUsdc);
    await tx.wait();
}

async function addLiquidity(account: any): Promise<void> {

    // todo fix
    let balanceOfBefore = await nonFungiblePositionManagerContract.balanceOf(account._address);
    console.log("Balance of before: ", ethers.utils.formatUnits(balanceOfBefore, 0))

    let balance3Crv = await threeCrvContract.balanceOf(account._address);
    let balanceUsdc = await usdcContract.balanceOf(account._address);
    console.log("add liquidity 3crv amount: ", ethers.utils.formatUnits(balance3Crv, tokenDecimals.threeCrv))
    console.log("add liquidity usdc amount: ", ethers.utils.formatUnits(balanceUsdc, tokenDecimals.usdc))


    let txApprove3Crv = await threeCrvContract.connect(account).transfer(testSwap.address, balance3Crv);
    await txApprove3Crv.wait();
    let txApproveBusd = await usdcContract.connect(account).transfer(testSwap.address, balanceUsdc);
    await txApproveBusd.wait();

    let blockNumber = await ethers.provider.getBlockNumber();
    let block = await ethers.provider.getBlock(blockNumber);

    let deadline = block.timestamp + 30;

    console.log("Siamo qui")
    let tx = await testSwap.connect(account).addLiquidity(ethers.utils.parseUnits("10", tokenDecimals.threeCrv), ethers.utils.parseUnits("10", tokenDecimals.usdc));
    await tx.wait();
    console.log("Siamo qui2")

    let balanceOf = await nonFungiblePositionManagerContract.balanceOf(account._address);
    console.log("Balance of after: ", ethers.utils.formatUnits(balanceOf, 0))
    /*
    // Crea una nuova posizione non fungibile nella pool
        INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
            token0: _token,
            token1: _weth,
            fee: _fee,
            tickLower: -887220,
            tickUpper: -887200,
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            amount0Min: 0,
            amount1Min: 0,
            recipient: msg.sender,
            deadline: block.timestamp + 300
        });

        uint256 tokenId = INonfungiblePositionManager(_nonfungiblePositionManager).mint(params);

        // Aggiorna le quantità di token
        IERC20(_token).transferFrom(msg.sender, address(this), amount0Desired);
        IERC20(_weth).transferFrom(msg.sender, address(this), amount1Desired);

        // Deposita la posizione nella pool
        INonfungiblePositionManager(_nonfungiblePositionManager).safeTransferFrom(address(this), msg.sender, tokenId);
    }
}

     */
}

async function removeLiquidity(account: SignerWithAddress, index: any): Promise<void> {

    let balanceDepositBefore = await threeCrvContract.balanceOf(account.address);
    let balance2Before = await token2.balanceOf(account.address);

    let tx = await curveSwap.connect(account).remove_liquidity(ethers.utils.parseEther("100"), [0,0]);
    await tx.wait();

    let balanceDepositAfter = await threeCrvContract.balanceOf(account.address);
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

        await setupUtilityContract();

        await impersonateAccount();

        //await fundAccountETH(accountWhale3Crv)
        //await fundAccountETH(accountWhaleUsdc)
        await fundAccountUSDC()

        console.log("Dopo fund prima di add")
        await addLiquidity(accountWhale3Crv);
        //await addLiquidityThreeCrv(accountWhaleUsdc, 0);

        //await removeLiquidity(accountWhale3Crv, 0);
        //await removeLiquidity(accountWhaleBusd, 0);


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

