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

let deployer : SignerWithAddress;
let account1 : SignerWithAddress;


const provider = new ethers.providers.JsonRpcProvider("http://104.248.142.30:8545")

let accountToFund = "0xD1b261c4C515f85bDaC55c6e6F6da9fce277BfFa"
let amountToFund = ethers.utils.parseEther("500")

let sCompAddress = "0x05F6847ab9273366Ca4f18294efba0503513aFB7"
let token1 : Contract;
let token2 : Contract;
let token3 : Contract;
let token4 : Contract;
let token5 : Contract;
let token6 : Contract;

let accountToken1: any;
let accountToken2: any;
let accountToken3: any;
let accountToken4: any;
let accountToken5: any;
let accountToken6: any;

let accountTokenAddress1 = "0x2988983d105436843757ce8e45be5b3af3736445";
let accountTokenAddress2 = "0xe95bff25da7b95f7dc60693f1def6fe9200aeb39";
let accountTokenAddress3 = "0x005fb56fe0401a4017e6f046272da922bbf8df06";
let accountTokenAddress4 = "0xf49b3852419160376e19053785a3f09cf47e0e15";
let accountTokenAddress5 = "0xe896e539e557bc751860a7763c8dd589af1698ce";
let accountTokenAddress6 = "0xd34f3e85bb7c8020c7959b80a4b87a369d639dc0";

async function main(): Promise<void> {

    await run('compile');
    [deployer, account1] = await ethers.getSigners();
    console.log("Deployer address: ", deployer.address, " with balance: ", ethers.utils.formatEther(await deployer.getBalance()))
    console.log("Account 1 address: ", account1.address, " with balance: ", ethers.utils.formatEther(await account1.getBalance()))
}

async function setupContract(): Promise<void> {

    let erc20Factory = await ethers.getContractFactory("ERC20");
    token1 = await erc20Factory.attach(busd3crvInfo.sCompVault.args.wantAddress);
    token2 = await erc20Factory.attach(dola3crvInfo.sCompVault.args.wantAddress);
    token3 = await erc20Factory.attach(frax3crvInfo.sCompVault.args.wantAddress);
    token4 = await erc20Factory.attach(ibEurInfo.sCompVault.args.wantAddress);
    token5 = await erc20Factory.attach(mim3crvInfo.sCompVault.args.wantAddress);
    token6 = await erc20Factory.attach(tusd3crvInfo.sCompVault.args.wantAddress);

}

async function sendToken(): Promise<void> {

    /*
    // check balance
    let balance = await token1.balanceOf(accountTokenAddress1);
    console.log("Balance token 1 of ", accountTokenAddress1 , " is ", ethers.utils.formatEther(balance))

    let tx = await token1.connect(accountToken1).transfer(accountToFund, amountToFund);
    await tx.wait();
    console.log("Balance token1 of account to fund is: ", ethers.utils.formatEther(await token1.balanceOf(accountToFund)));
*/
    // check balance
    let balance = await token2.balanceOf(accountTokenAddress2);
    console.log("Balance token 2 of ", accountTokenAddress2 , " is ", ethers.utils.formatEther(balance))

    let tx = await token2.connect(accountToken2).transfer(accountToFund, amountToFund);
    await tx.wait();
    console.log("Balance token 2 of account to fund is: ", ethers.utils.formatEther(await token2.balanceOf(accountToFund)));

    // check balance
    balance = await token3.balanceOf(accountTokenAddress3);
    console.log("Balance token 3 of ", accountTokenAddress3 , " is ", ethers.utils.formatEther(balance))

    tx = await token3.connect(accountToken3).transfer(accountToFund, amountToFund);
    await tx.wait();
    console.log("Balance token 3 of account to fund is: ", ethers.utils.formatEther(await token3.balanceOf(accountToFund)));

    // check balance
    balance = await token4.balanceOf(accountTokenAddress4);
    console.log("Balance token 4 of ", accountTokenAddress4 , " is ", ethers.utils.formatEther(balance))

    tx = await token4.connect(accountToken4).transfer(accountToFund, amountToFund);
    await tx.wait();
    console.log("Balance token 4 of account to fund is: ", ethers.utils.formatEther(await token4.balanceOf(accountToFund)));

    // check balance
    balance = await token5.balanceOf(accountTokenAddress5);
    console.log("Balance token 5 of ", accountTokenAddress5 , " is ", ethers.utils.formatEther(balance))

    tx = await token5.connect(accountToken5).transfer(accountToFund, amountToFund);
    await tx.wait();
    console.log("Balance token 5 of account to fund is: ", ethers.utils.formatEther(await token5.balanceOf(accountToFund)));

    // check balance
    balance = await token6.balanceOf(accountTokenAddress6);
    console.log("Balance token 6 of ", accountTokenAddress6 , " is ", ethers.utils.formatEther(balance))

    tx = await token6.connect(accountToken6).transfer(accountToFund, amountToFund);
    await tx.wait();
    console.log("Balance token 6 of account to fund is: ", ethers.utils.formatEther(await token6.balanceOf(accountToFund)));

}

async function impersonateAccount(): Promise<void> {
    const provider = new ethers.providers.JsonRpcProvider(
        "http://104.248.142.30:8545"
    );
    await provider.send("hardhat_impersonateAccount", [accountTokenAddress1]);
    accountToken1 = provider.getSigner(accountTokenAddress1);

    await provider.send("hardhat_impersonateAccount", [accountTokenAddress2]);
    accountToken2 = provider.getSigner(accountTokenAddress2);

    await provider.send("hardhat_impersonateAccount", [accountTokenAddress3]);
    accountToken3 = provider.getSigner(accountTokenAddress3);

    await provider.send("hardhat_impersonateAccount", [accountTokenAddress4]);
    accountToken4 = provider.getSigner(accountTokenAddress4);

    await provider.send("hardhat_impersonateAccount", [accountTokenAddress5]);
    accountToken5 = provider.getSigner(accountTokenAddress5);

    await provider.send("hardhat_impersonateAccount", [accountTokenAddress6]);
    accountToken6 = provider.getSigner(accountTokenAddress6);

}

async function fundAccount(accountTokenAddress: any): Promise<void> {

    let tx = await account1.sendTransaction({
        to: "0x2988983d105436843757ce8e45be5b3af3736445",
        value: ethers.utils.parseEther("0.5"),
    });
    await tx.wait()

}


main()
    .then(async () => {
        await setupContract();

        await impersonateAccount();

        await fundAccount(accountTokenAddress1);

        await fundAccount(accountTokenAddress2);
        await fundAccount(accountTokenAddress3);
        await fundAccount(accountTokenAddress4);
        await fundAccount(accountTokenAddress5);
        await fundAccount(accountTokenAddress6);


        await sendToken();
        console.log("send token ok")


    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

