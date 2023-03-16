import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {deploy} from "@openzeppelin/hardhat-upgrades/dist/utils";
import {start} from "repl";
import {BigNumber} from "ethers";
import {sign} from "crypto";
import {utilsTask} from "../01_task/standard/utilsTask";
import {erc20Task} from "../01_task/standard/erc20Task";
import {EthereumProvider} from "hardhat/types";
import {JsonRpcProvider, JsonRpcSigner} from "@ethersproject/providers/src.ts/json-rpc-provider";

const { run, ethers, upgrades } = hardhat;

const busd3crvInfo = require('../../info/deploy_address/address_scaling_node/strategies/Busd3crv/Busd3crv.json');
const dola3crvInfo = require('../../info/deploy_address/address_scaling_node/strategies/Dola3crv/Dola3crv.json');
const frax3crvInfo = require('../../info/deploy_address/address_scaling_node/strategies/Frax3crv/Frax3crv.json');
const fraxusdcInfo = require('../../info/deploy_address/address_scaling_node/strategies/FraxUsdc/FraxUsdc.json');
const ibEurInfo = require('../../info/deploy_address/address_scaling_node/strategies/ibEURsEUR/ibEURsEUR.json');
const mim3crvInfo = require('../../info/deploy_address/address_scaling_node/strategies/Mim3crv/Mim3crv.json');
const tusd3crvInfo = require('../../info/deploy_address/address_scaling_node/strategies/Tusd3crv/Tusd3crv.json');
const tokenInfo = require('../../info/address_mainnet/tokenInfo.json');

let deployer : SignerWithAddress;
let account1 : SignerWithAddress;


const provider = new ethers.providers.JsonRpcProvider("http://104.248.142.30:8545")

let accountToFund = "0xB0865d5A2073952f8887281675d852B4Fc1434C0"
let amountToFund = ethers.utils.parseEther("100")

let sCompAddress = "0x05F6847ab9273366Ca4f18294efba0503513aFB7"
let threeCrv : Contract;
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
let accountWhaleThreeCrv: JsonRpcSigner;

let accountTokenAddress1 = "0xD1b261c4C515f85bDaC55c6e6F6da9fce277BfFa";
let accountTokenAddress2 = "0xD1b261c4C515f85bDaC55c6e6F6da9fce277BfFa";
let accountTokenAddress3 = "0xD1b261c4C515f85bDaC55c6e6F6da9fce277BfFa";
let accountTokenAddress4 = "0xD1b261c4C515f85bDaC55c6e6F6da9fce277BfFa";
let accountTokenAddress5 = "0xD1b261c4C515f85bDaC55c6e6F6da9fce277BfFa";
let accountTokenAddress6 = "0xD1b261c4C515f85bDaC55c6e6F6da9fce277BfFa";
let accountWhaleFraxAddress = "0xD1b261c4C515f85bDaC55c6e6F6da9fce277BfFa";
let accountWhaleUsdcAddress = "0xD1b261c4C515f85bDaC55c6e6F6da9fce277BfFa";
let accountWhaleThreeCrvAddress = "0xD1b261c4C515f85bDaC55c6e6F6da9fce277BfFa";

async function main(): Promise<void> {

    await run('compile');
    [deployer, account1] = await ethers.getSigners();
    console.log("Deployer address: ", deployer.address, " with balance: ", ethers.utils.formatEther(await deployer.getBalance()))
    console.log("Account 1 address: ", account1.address, " with balance: ", ethers.utils.formatEther(await account1.getBalance()))
}

async function setupContract(): Promise<void> {

    let erc20Factory = await ethers.getContractFactory("ERC20");
    threeCrv = await erc20Factory.attach(tokenInfo.threeCrv.address);
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
    let balance = await busd3CrvContract.balanceOf(accountTokenAddress1);
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
    let balance = await mim3CrvContract.balanceOf(accountTokenAddress5);
    console.log("Balance token 5 of ", accountTokenAddress5 , " is ", ethers.utils.formatEther(balance))

    let tx = await mim3CrvContract.connect(accountToken5).transfer(accountToFund, amountToFund);
    await tx.wait();
    console.log("Balance token 5 of account to fund is: ", ethers.utils.formatEther(await mim3CrvContract.balanceOf(accountToFund)));

    // check balance
    balance = await tusd3CrvContract.balanceOf(accountTokenAddress6);
    console.log("Balance token 6 of ", accountTokenAddress6 , " is ", ethers.utils.formatEther(balance))

    tx = await tusd3CrvContract.connect(accountToken6).transfer(accountToFund, amountToFund);
    await tx.wait();
    console.log("Balance token 6 of account to fund is: ", ethers.utils.formatEther(await tusd3CrvContract.balanceOf(accountToFund)));

    // check balance
    balance = await fraxContract.balanceOf(accountWhaleFraxAddress);
    console.log("Balance frax of ", accountWhaleFraxAddress , " is ", ethers.utils.formatEther(balance))
    tx = await fraxContract.connect(accountWhaleFrax).transfer(accountToFund, amountToFund);
    await tx.wait();
    console.log("Balance frax of account to fund is: ", ethers.utils.formatEther(await fraxContract.balanceOf(accountToFund)));


*/
    // check balance
    let balance = await usdcContract.balanceOf(accountWhaleUsdcAddress);
    console.log("Balance usdc of ", accountWhaleUsdcAddress , " is ", ethers.utils.formatUnits(balance, tokenInfo.usdc.decimals))
    amountToFund = ethers.utils.parseUnits("100", tokenInfo.usdc.decimals);
    let tx = await usdcContract.connect(accountWhaleUsdc).transfer(accountToFund, amountToFund);
    await tx.wait();
    console.log("Balance usdc of account to fund is: ", ethers.utils.formatUnits(await usdcContract.balanceOf(accountToFund), tokenInfo.usdc.decimals));

}

async function sendToken3crv(): Promise<void> {

    // check balance
    let balance = await threeCrv.balanceOf(accountWhaleThreeCrvAddress);
    console.log("Balance threeCrv of ", accountWhaleThreeCrvAddress , " is ", ethers.utils.formatUnits(balance, tokenInfo.threeCrv.decimals))

    amountToFund = ethers.utils.parseUnits("5", tokenInfo.threeCrv.decimals);
    console.log("amount to fund: ", ethers.utils.formatUnits(amountToFund, 0))
    await erc20Task.approve(threeCrv.address, accountWhaleThreeCrv, deployer.address, ethers.constants.MaxUint256);
    console.log("Approve done")
    let tx = await threeCrv.connect(accountWhaleThreeCrv).transfer(accountToFund, 1);
    await tx.wait();
    console.log("Balance three crv of account to fund is: ", ethers.utils.formatUnits(await threeCrv.balanceOf(accountToFund), tokenInfo.threeCrv.decimals));

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

    await provider.send("hardhat_impersonateAccount", [accountWhaleThreeCrvAddress]);
    accountWhaleThreeCrv = provider.getSigner(accountWhaleThreeCrvAddress);

}

async function fundAccount(accountTokenAddress: string): Promise<void> {

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

/*        await fundAccount(accountTokenAddress1);

        await fundAccount(accountTokenAddress2);
        await fundAccount(accountTokenAddress3);
        await fundAccount(accountTokenAddress4);
        await fundAccount(accountTokenAddress5);
        await fundAccount(accountTokenAddress6);
        await fundAccount(accountWhaleFraxAddress);
        await fundAccount(accountWhaleThreeCrvAddress);

 */


        await sendToken();
        console.log("send token ok")


    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

