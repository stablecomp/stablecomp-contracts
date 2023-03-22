require("dotenv").config();
import { ethers } from "hardhat";

/* ------------------------------- Uni address ------------------------------ */
const UniswapV2Router = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const UniswapV2Factory = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

/* ------------------------------ Token address ----------------------------- */
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

async function main() {
  /* ----------------------------- Deploy address ----------------------------- */
  const accounts = await ethers.getSigners();
  const account = accounts[0];
  console.log("Deploying contracts by account:", account.address);
  console.log("Account balance:", (await account.getBalance()).toString());

  /* --------------------------- Deploy the contract -------------------------- */

  const OneClickFactory = await ethers.getContractFactory("OneClick");
  const OneClick = await OneClickFactory.deploy(
    UniswapV2Router,
    UniswapV2Factory,
    WETH,
    20,
    account.address
  );
  await OneClick.deployed();
  console.log("ONECLICK contract deployed to:", OneClick.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
