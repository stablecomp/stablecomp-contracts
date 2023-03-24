import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers } = hardhat;

let deployer : SignerWithAddress;
let account1 : SignerWithAddress;

let accountsToFund = ["0xb928F09222e5dA8edbDf98570372FAEF56822F9D", "0x3054f2e2Aa021B7Ce60f5775d398207Cb0d1ff04", "0x7f899aF73f9bC15E0c9Ab93636701AB4a7ceE07e", "0x8c28c750E8a4902fc82b076016158cE2F8674ceF"]

async function main(): Promise<void> {
    await run('compile');
    [deployer, account1] = await ethers.getSigners();
    console.log("Account 1 addresss: ", account1.address, " with balance: ", ethers.utils.formatEther(await account1.getBalance()))
}

  main()
    .then(async () => {
        for (let i = 0; i < accountsToFund.length ; i++) {
            let tx = await account1.sendTransaction({
                to: accountsToFund[i],
                value: ethers.utils.parseEther("2.0"), // Sends exactly 1.0 ether
            });
            await tx.wait();
            console.log("Send eth completed")

            let balance = await ethers.provider.getBalance(accountsToFund[i])
            console.log("balance of: ", ethers.utils.formatEther(balance))
        }
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

