import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {deploy} from "@openzeppelin/hardhat-upgrades/dist/utils";
import {start} from "repl";
import {BigNumber} from "ethers";
import {sign} from "crypto";

const { run, ethers, upgrades } = hardhat;

const busd3crvInfo = require('../../address/address_scaling_node/strategies/Busd3crv/Busd3crv.json');
const dola3crvInfo = require('../../address/address_scaling_node/strategies/Dola3crv/Dola3crv.json');
const frax3crvInfo = require('../../address/address_scaling_node/strategies/Frax3crv/Frax3crv.json');
const fraxusdcInfo = require('../../address/address_scaling_node/strategies/FraxUsdc/FraxUsdc.json');
const ibEurInfo = require('../../address/address_scaling_node/strategies/ibEURsEUR/ibEURsEUR.json');
const mim3crvInfo = require('../../address/address_scaling_node/strategies/Mim3crv/Mim3crv.json');
const tusd3crvInfo = require('../../address/address_scaling_node/strategies/Tusd3crv/Tusd3crv.json');
const tokenAddress = require('../../strategyInfo/address_mainnet/tokenAddress.json');
const tokenDecimals = require('../../strategyInfo/address_mainnet/tokenDecimals.json');

let deployer : SignerWithAddress;
let account1 : SignerWithAddress;


const provider = new ethers.providers.JsonRpcProvider("http://104.248.142.30:8545")

let accountToFund = "0xD1b261c4C515f85bDaC55c6e6F6da9fce277BfFa"
let amountToFund = ethers.utils.parseUnits("500", tokenDecimals.wbtc)

let sCompAddress = "0x05F6847ab9273366Ca4f18294efba0503513aFB7"
let wbtcContract : Contract;

let accountWbtc: any;

let accountWbtcAddress = "0x6daB3bCbFb336b29d06B9C793AEF7eaA57888922";

async function main(): Promise<void> {

    await run('compile');
    [deployer, account1] = await ethers.getSigners();
    console.log("Deployer address: ", deployer.address, " with balance: ", ethers.utils.formatEther(await deployer.getBalance()))
    console.log("Account 1 address: ", account1.address, " with balance: ", ethers.utils.formatEther(await account1.getBalance()))
}

async function setupContract(): Promise<void> {

    let erc20Factory = await ethers.getContractFactory("ERC20");
    wbtcContract = await erc20Factory.attach(tokenAddress.wbtc);
}

async function sendToken(): Promise<void> {

    // check balance
    let balance = await wbtcContract.balanceOf(accountWbtcAddress);
    console.log("Balance token 2 of ", accountWbtcAddress , " is ", ethers.utils.formatEther(balance))

    let tx = await wbtcContract.connect(accountWbtc).transfer(accountToFund, amountToFund);
    await tx.wait();
    console.log("Balance WBTC of account to fund is: ", ethers.utils.formatUnits(await wbtcContract.balanceOf(accountToFund), tokenDecimals.wbtc));

}

async function impersonateAccount(): Promise<void> {
    const provider = new ethers.providers.JsonRpcProvider(
        "http://104.248.142.30:8545"
    );
    await provider.send("hardhat_impersonateAccount", [accountWbtcAddress]);
    accountWbtc = provider.getSigner(accountWbtcAddress);
}

async function fundAccount(accountTokenAddress: any): Promise<void> {

    let tx = await account1.sendTransaction({
        to: accountTokenAddress,
        value: ethers.utils.parseEther("0.5"),
    });
    await tx.wait()

}


main()
    .then(async () => {
        await setupContract();

        await impersonateAccount();

        await fundAccount(accountWbtcAddress);

        await sendToken();
        console.log("send token ok")


    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

