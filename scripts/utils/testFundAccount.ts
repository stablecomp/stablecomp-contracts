import hardhat, {network} from 'hardhat';
import {Contract} from "@ethersproject/contracts";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

const { run, ethers } = hardhat;

let deployer : SignerWithAddress;
let account1 : SignerWithAddress;
let account2 : SignerWithAddress;
let account3 : SignerWithAddress;
let account4 : SignerWithAddress;
let account5 : SignerWithAddress;
let account6 : SignerWithAddress;
let account7 : SignerWithAddress;
let account8 : SignerWithAddress;
let account9 : SignerWithAddress;
let account10 : SignerWithAddress;
let account11 : SignerWithAddress;
let account12 : SignerWithAddress;
let account13 : SignerWithAddress;
let account14 : SignerWithAddress;
let account15 : SignerWithAddress;
let account16 : SignerWithAddress;
let account17 : SignerWithAddress;
let account18 : SignerWithAddress;
let account19 : SignerWithAddress;
let account20 : SignerWithAddress;

async function main(): Promise<void> {
  await run('compile');
  [
      deployer, account1, account2, account3, account4, account5, account6, account7, account8, account9, account10,
      account11, account12, account13, account14, account15, account16, account17, account18, account19, account20
  ] = await ethers.getSigners();

}

async function checkBalanceAccount(): Promise<void> {
  console.log("Deployer: ", deployer.address, " with balance: ", await deployer.getBalance());
  console.log("Account 1: ", account1.address, " with balance: ", await account1.getBalance());
  console.log("Account 2: ", account2.address, " with balance: ", await account2.getBalance());
  console.log("Account 3: ", account3.address, " with balance: ", await account3.getBalance());
  console.log("Account 4: ", account4.address, " with balance: ", await account4.getBalance());
  console.log("Account 5: ", account5.address, " with balance: ", await account5.getBalance());
  console.log("Account 6: ", account6.address, " with balance: ", await account6.getBalance());
  console.log("Account 7: ", account7.address, " with balance: ", await account7.getBalance());
  console.log("Account 8: ", account8.address, " with balance: ", await account8.getBalance());
  console.log("Account 9: ", account9.address, " with balance: ", await account9.getBalance());
  console.log("Account 10: ", account10.address, " with balance: ", await account10.getBalance());
  console.log("Account 11: ", account11.address, " with balance: ", await account11.getBalance());
  console.log("Account 12: ", account12.address, " with balance: ", await account12.getBalance());
  console.log("Account 13: ", account13.address, " with balance: ", await account13.getBalance());
  console.log("Account 14: ", account14.address, " with balance: ", await account14.getBalance());
  console.log("Account 15: ", account15.address, " with balance: ", await account15.getBalance());
  console.log("Account 16: ", account16.address, " with balance: ", await account16.getBalance());
  console.log("Account 17: ", account17.address, " with balance: ", await account17.getBalance());
  console.log("Account 18: ", account18.address, " with balance: ", await account18.getBalance());
  console.log("Account 19: ", account19.address, " with balance: ", await account19.getBalance());
}

async function fundAccount(account: SignerWithAddress): Promise<void> {
    console.log("---------------------")
    let fee = await ethers.utils.parseEther("1")
    let amountTotal = await account1.getBalance();
    let amountToSend = amountTotal.sub(fee);

    await account1.sendTransaction({
        to: account.address,
        value: amountToSend,
    });
    console.log("Transaction send")
    await account2.sendTransaction({
        to: account.address,
        value: amountToSend,
    });
    console.log("Transaction send")
    await account3.sendTransaction({
        to: account.address,
        value: amountToSend,
    });
    console.log("Transaction send")
    await account4.sendTransaction({
        to: account.address,
        value: amountToSend,
    });
    console.log("Transaction send")
    await account5.sendTransaction({
        to: account.address,
        value: amountToSend,
    });
    console.log("Transaction send")
    await account6.sendTransaction({
        to: account.address,
        value: amountToSend,
    });
    console.log("Transaction send")
    await account7.sendTransaction({
        to: account.address,
        value: amountToSend,
    });
    console.log("Transaction send")
    await account8.sendTransaction({
        to: account.address,
        value: amountToSend,
    });
    await account9.sendTransaction({
        to: account.address,
        value: amountToSend,
    });
    await account10.sendTransaction({
        to: account.address,
        value: amountToSend,
    });
    await account11.sendTransaction({
        to: account.address,
        value: amountToSend,
    });
    await account12.sendTransaction({
        to: account.address,
        value: amountToSend,
    });
    await account13.sendTransaction({
        to: account.address,
        value: amountToSend,
    });
    await account14.sendTransaction({
        to: account.address,
        value: amountToSend,
    });
    await account15.sendTransaction({
        to: account.address,
        value: amountToSend,
    });
    await account16.sendTransaction({
        to: account.address,
        value: amountToSend,
    });
    await account17.sendTransaction({
        to: account.address,
        value: amountToSend,
    });
    await account18.sendTransaction({
        to: account.address,
        value: amountToSend,
    });
    await account19.sendTransaction({
        to: account.address,
        value: amountToSend,
    });
}

main()
    .then(async () => {
      await checkBalanceAccount();
      await fundAccount(deployer);
      await checkBalanceAccount();
      process.exit(0)
    })
    .catch((error: Error) => {
      console.error(error);
      process.exit(1);
    });

