import hardhat from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers } = hardhat;

let deployer : SignerWithAddress;
let account1 : SignerWithAddress;

let accountsToFund = [
    "0x228382B9Ca031071C12fC9264C28Af29D9d5836E","0xb928F09222e5dA8edbDf98570372FAEF56822F9D",
    "0x3054f2e2Aa021B7Ce60f5775d398207Cb0d1ff04","0x7f899aF73f9bC15E0c9Ab93636701AB4a7ceE07e",
    "0x8c28c750E8a4902fc82b076016158cE2F8674ceF","0xFf8671E3cD2573659B030427B1F9a66C2Ba38129",
    "0xb3ACC5456797e3c4788C2c01CFca0D96C6c8A708","0xc3B614e4792e45B840e2A7c63fB004612CCB49d1",
    "0xd306916c038C2894255F9402B560c3b2Aa886BFC","0x5115525d1066d29C5066f3971A0E1F017a133b39",
    "0x0Ba2734B4c3f70865c82424eE001a2cD20d6A48c","0xc48F21FB0281DE13B5d5CB33EEE581f4dB8c1e34"]
//let accountsToFund = ["0x2060266bA136DC0b2f4D5Cebd147209F0954C756"]
let amountToFund = ethers.utils.parseEther("10000")

const tokenJson = require('../../info/deploy_address/scaling_node/token/sCompTokenContract.json');

let sCompAddress = tokenJson.sCompTokenContract.address;
let sCompContract : Contract;

async function main(): Promise<void> {

    await run('compile');
    [deployer, account1] = await ethers.getSigners();
    console.log("account1.address")
    console.log(account1.address)
    console.log("Deployer addresss: ", deployer.address, " with balance: ", ethers.utils.formatEther(await deployer.getBalance()))
}

async function setupContract(): Promise<void> {
    console.log("Scomp token address is: ", sCompAddress)
    let factorySComp = await ethers.getContractFactory("StableCompToken");
    sCompContract = await factorySComp.attach(sCompAddress);

}

async function sendSComp(): Promise<void> {

    for(let i = 0; i < accountsToFund.length; i++) {

        let tx = await sCompContract.connect(deployer).transfer(accountsToFund[i], amountToFund);
        await tx.wait();
        console.log("Balance sComp of account to fund is: ", ethers.utils.formatEther(await sCompContract.balanceOf(accountsToFund[i])));

    }
}

  main()
    .then(async () => {
        await setupContract();
        await sendSComp();
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

