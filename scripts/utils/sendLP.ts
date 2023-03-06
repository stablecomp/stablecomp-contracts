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
const tokenInfo = require('../../strategyInfo/address_mainnet/tokenInfo.json');

let deployer : SignerWithAddress;
let account1 : SignerWithAddress;


const provider = new ethers.providers.JsonRpcProvider("http://104.248.142.30:8545")

let accountToFund = "0xD1b261c4C515f85bDaC55c6e6F6da9fce277BfFa"
let amountToFund = ethers.utils.parseEther("500")

let sCompAddress = "0x05F6847ab9273366Ca4f18294efba0503513aFB7"
let busd3CrvContract : Contract;
let dola3CrvContract : Contract;
let frax3CrvContract : Contract;
let ibEurSEurContract : Contract;
let mim3CrvContract : Contract;
let tusd3CrvContract : Contract;
let fraxContract : Contract;
let usdcContract : Contract;

let accountToken1: any;
let accountToken2: any;
let accountToken3: any;
let accountToken4: any;
let accountToken5: any;
let accountToken6: any;
let accountWhaleFrax: any;
let accountWhaleUsdc: any;

let accountTokenAddress1 = "0x2988983d105436843757ce8e45be5b3af3736445";
let accountTokenAddress2 = "0xe95bff25da7b95f7dc60693f1def6fe9200aeb39";
let accountTokenAddress3 = "0x005fb56fe0401a4017e6f046272da922bbf8df06";
let accountTokenAddress4 = "0xf49b3852419160376e19053785a3f09cf47e0e15";
let accountTokenAddress5 = "0xe896e539e557bc751860a7763c8dd589af1698ce";
let accountTokenAddress6 = "0xd34f3e85bb7c8020c7959b80a4b87a369d639dc0";
let accountWhaleFraxAddress = "0xaF297deC752c909092A117A932A8cA4AaaFF9795";
let accountWhaleUsdcAddress = "0xCFFAd3200574698b78f32232aa9D63eABD290703";

async function main(): Promise<void> {

    await run('compile');
    [deployer, account1] = await ethers.getSigners();
    console.log("Deployer address: ", deployer.address, " with balance: ", ethers.utils.formatEther(await deployer.getBalance()))
    console.log("Account 1 address: ", account1.address, " with balance: ", ethers.utils.formatEther(await account1.getBalance()))
}

async function setupContract(): Promise<void> {

    let erc20Factory = await ethers.getContractFactory("ERC20");
    busd3CrvContract = await erc20Factory.attach(busd3crvInfo.sCompVault.args.wantAddress);
    dola3CrvContract = await erc20Factory.attach(dola3crvInfo.sCompVault.args.wantAddress);
    frax3CrvContract = await erc20Factory.attach(frax3crvInfo.sCompVault.args.wantAddress);
    ibEurSEurContract = await erc20Factory.attach(ibEurInfo.sCompVault.args.wantAddress);
    mim3CrvContract = await erc20Factory.attach(mim3crvInfo.sCompVault.args.wantAddress);
    tusd3CrvContract = await erc20Factory.attach(tusd3crvInfo.sCompVault.args.wantAddress);
    fraxContract = await erc20Factory.attach(tokenInfo.frax.address);
    usdcContract = await erc20Factory.attach(tokenInfo.usdc.address);

}

async function sendToken(): Promise<void> {

    /*
    // check balance
    let balance = await token1.balanceOf(accountTokenAddress1);
    console.log("Balance token 1 of ", accountTokenAddress1 , " is ", ethers.utils.formatEther(balance))

    let tx = await busd3CrvContract.connect(accountToken1).transfer(accountToFund, amountToFund);
    await tx.wait();
    console.log("Balance token1 of account to fund is: ", ethers.utils.formatEther(await busd3CrvContract.balanceOf(accountToFund)));

    // check balance
    let balance = await dola3CrvContract.balanceOf(accountTokenAddress2);
    console.log("Balance token 2 of ", accountTokenAddress2 , " is ", ethers.utils.formatEther(balance))

    let tx = await dola3CrvContract.connect(accountToken2).transfer(accountToFund, amountToFund);
    await tx.wait();
    console.log("Balance token 2 of account to fund is: ", ethers.utils.formatEther(await dola3CrvContract.balanceOf(accountToFund)));

    // check balance
    balance = await frax3CrvContract.balanceOf(accountTokenAddress3);
    console.log("Balance token 3 of ", accountTokenAddress3 , " is ", ethers.utils.formatEther(balance))

    tx = await frax3CrvContract.connect(accountToken3).transfer(accountToFund, amountToFund);
    await tx.wait();
    console.log("Balance token 3 of account to fund is: ", ethers.utils.formatEther(await frax3CrvContract.balanceOf(accountToFund)));

    // check balance
    balance = await ibEurSEurContract.balanceOf(accountTokenAddress4);
    console.log("Balance token 4 of ", accountTokenAddress4 , " is ", ethers.utils.formatEther(balance))

    tx = await ibEurSEurContract.connect(accountToken4).transfer(accountToFund, amountToFund);
    await tx.wait();
    console.log("Balance token 4 of account to fund is: ", ethers.utils.formatEther(await ibEurSEurContract.balanceOf(accountToFund)));

    // check balance
    balance = await mim3CrvContract.balanceOf(accountTokenAddress5);
    console.log("Balance token 5 of ", accountTokenAddress5 , " is ", ethers.utils.formatEther(balance))

    tx = await mim3CrvContract.connect(accountToken5).transfer(accountToFund, amountToFund);
    await tx.wait();
    console.log("Balance token 5 of account to fund is: ", ethers.utils.formatEther(await mim3CrvContract.balanceOf(accountToFund)));

    // check balance
    balance = await tusd3CrvContract.balanceOf(accountTokenAddress6);
    console.log("Balance token 6 of ", accountTokenAddress6 , " is ", ethers.utils.formatEther(balance))

    tx = await tusd3CrvContract.connect(accountToken6).transfer(accountToFund, amountToFund);
    await tx.wait();
    console.log("Balance token 6 of account to fund is: ", ethers.utils.formatEther(await tusd3CrvContract.balanceOf(accountToFund)));

    // check balance
    let balance = await fraxContract.balanceOf(accountWhaleFraxAddress);
    console.log("Balance frax of ", accountWhaleFraxAddress , " is ", ethers.utils.formatEther(balance))

    let tx = await fraxContract.connect(accountWhaleFrax).transfer(accountToFund, amountToFund);
    await tx.wait();
    console.log("Balance frax of account to fund is: ", ethers.utils.formatEther(await fraxContract.balanceOf(accountToFund)));
*/

    // check balance
    let balance = await usdcContract.balanceOf(accountWhaleUsdcAddress);
    console.log("Balance usdc of ", accountWhaleUsdcAddress , " is ", ethers.utils.formatUnits(balance, tokenInfo.usdc.decimals))

    amountToFund = ethers.utils.parseUnits("500", tokenInfo.usdc.decimals);
    let tx = await usdcContract.connect(accountWhaleUsdc).transfer(accountToFund, amountToFund);
    await tx.wait();
    console.log("Balance usdc of account to fund is: ", ethers.utils.formatUnits(await usdcContract.balanceOf(accountToFund), tokenInfo.usdc.decimals));

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

    await provider.send("hardhat_impersonateAccount", [accountWhaleFraxAddress]);
    accountWhaleFrax = provider.getSigner(accountWhaleFraxAddress);

    await provider.send("hardhat_impersonateAccount", [accountWhaleUsdcAddress]);
    accountWhaleUsdc = provider.getSigner(accountWhaleUsdcAddress);

}

async function fundAccount(accountTokenAddress: any): Promise<void> {

    console.log("Fund account ...")
    let tx = await account1.sendTransaction({
        to: accountTokenAddress,
        value: ethers.utils.parseEther("0.5"),
    });
    await tx.wait()

    console.log("account founded")

}


main()
    .then(async () => {
        await setupContract();

        await impersonateAccount();

        /*
        await fundAccount(accountTokenAddress1);

        await fundAccount(accountTokenAddress2);
        await fundAccount(accountTokenAddress3);
        await fundAccount(accountTokenAddress4);
        await fundAccount(accountTokenAddress5);
        await fundAccount(accountTokenAddress6);
        */
        //await fundAccount(accountWhaleFraxAddress);
        await fundAccount(accountWhaleUsdcAddress);


        await sendToken();
        console.log("send token ok")


    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

