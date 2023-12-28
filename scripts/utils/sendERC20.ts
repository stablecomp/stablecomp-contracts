import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {utilsTask} from "../01_task/standard/utilsTask";
const { run, ethers } = hardhat;

const tokenInfo = require('../../info/address_mainnet/tokenInfo.json');

let deployer : SignerWithAddress;
let account1 : SignerWithAddress;


let accountsToFund = [
    "0x5c7bb45ef92ce53ba50a08bd13006cc5573e4c15"]

let addressERC20 = tokenInfo.dai.address
let decimalsERC20 = tokenInfo.dai.decimals

let amountToFund = ethers.utils.parseUnits("1000", decimalsERC20)

let erc20Contract : Contract;

let accountERC20: any;

let addressWhaleERC20 = "0x60FaAe176336dAb62e284Fe19B885B095d29fB7F";

async function main(): Promise<void> {

    await run('compile');
    [deployer] = await ethers.getSigners();
    console.log("Deployer address: ", deployer.address, " with balance: ", ethers.utils.formatEther(await deployer.getBalance()))
}

async function setupContract(address: string): Promise<void> {

    let erc20Factory = await ethers.getContractFactory("ERC20");
    erc20Contract = await erc20Factory.attach(address);
}

main()
    .then(async () => {
        await setupContract(addressERC20);
        accountERC20 = await utilsTask.impersonateAccountExternalNode(addressWhaleERC20, "http://104.248.142.30:8545");

        for (let i = 0; i< accountsToFund.length ; i++) {
            await utilsTask.fundAccountToken(addressERC20, accountERC20, accountsToFund[i], amountToFund);
            console.log("Balance ERC20 is: ",
                ethers.utils.formatUnits(await utilsTask.getBalanceERC20(accountsToFund[i], addressERC20), decimalsERC20)
            )

        }

    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

