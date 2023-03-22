import hardhat from 'hardhat';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers } = hardhat;

let deployer : SignerWithAddress;
let account1 : SignerWithAddress;

let accountToFound = "0x5ed48b2D93487C55b7eC6C5e033Cc1B81D737E1e"
async function main(): Promise<void> {

    await run('compile');
    [deployer, account1] = await ethers.getSigners();
    console.log("Account 1 addresss: ", account1.address, " with balance: ", ethers.utils.formatEther(await account1.getBalance()))
}

  main()
    .then(async () => {


        let tx = await account1.sendTransaction({
            to: accountToFound,
            value: ethers.utils.parseEther("1.0"), // Sends exactly 1.0 ether
        });
        await tx.wait();
        console.log("Send eth completed")

        let balance = await ethers.provider.getBalance(accountToFound)
        console.log("balance of: ", ethers.utils.formatEther(balance))
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

