import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {utilsTask} from "../01_task/standard/utilsTask";

const { run, ethers } = hardhat;

const tokenInfo = require('../../info/address_mainnet/tokenInfo.json');

let deployer : SignerWithAddress;
let account1 : SignerWithAddress;


let amountToFund = ethers.utils.parseUnits("2", tokenInfo.weth.decimals)

let wethContract : Contract;

let accountWethWhale: any;
let accountsToFund = [
    "0x228382B9Ca031071C12fC9264C28Af29D9d5836E","0xb928F09222e5dA8edbDf98570372FAEF56822F9D",
    "0x3054f2e2Aa021B7Ce60f5775d398207Cb0d1ff04","0x7f899aF73f9bC15E0c9Ab93636701AB4a7ceE07e",
    "0x8c28c750E8a4902fc82b076016158cE2F8674ceF","0xFf8671E3cD2573659B030427B1F9a66C2Ba38129",
    "0xb3ACC5456797e3c4788C2c01CFca0D96C6c8A708","0xc3B614e4792e45B840e2A7c63fB004612CCB49d1",
    "0xd306916c038C2894255F9402B560c3b2Aa886BFC","0x5115525d1066d29C5066f3971A0E1F017a133b39",
    "0x0Ba2734B4c3f70865c82424eE001a2cD20d6A48c","0xc48F21FB0281DE13B5d5CB33EEE581f4dB8c1e34"]

let accountWhaleWethAddress = "0x2fEb1512183545f48f6b9C5b4EbfCaF49CfCa6F3";

async function main(): Promise<void> {

    await run('compile');
    [deployer, account1] = await ethers.getSigners();
    console.log("Deployer address: ", deployer.address, " with balance: ", ethers.utils.formatEther(await deployer.getBalance()))
    console.log("Account 1 address: ", account1.address, " with balance: ", ethers.utils.formatEther(await account1.getBalance()))
}

async function setupContract(): Promise<void> {

    let erc20Factory = await ethers.getContractFactory("ERC20");
    wethContract = await erc20Factory.attach(tokenInfo.weth.address);
}

main()
    .then(async () => {
        await setupContract();

        console.log("impersonate account")
        accountWethWhale = await utilsTask.impersonateAccountExternalNode(accountWhaleWethAddress, "http://104.248.142.30:8545");

        console.log("fund account weth")
        for (let i = 0; i< accountsToFund.length ; i++) {
            await utilsTask.fundAccountToken(tokenInfo.weth.address, accountWethWhale, accountsToFund[i], amountToFund);
            console.log("Balance weth is: ",
                ethers.utils.formatUnits(
                    await utilsTask.getBalanceERC20(accountsToFund[i], tokenInfo.weth.address),
                    tokenInfo.weth.decimals
                )
            )

        }

    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

