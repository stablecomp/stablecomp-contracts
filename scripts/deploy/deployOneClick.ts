require("dotenv").config();
import { network, ethers } from "hardhat";

const rpcProvider = new ethers.providers.JsonRpcProvider(
  process.env.RPC_URL_SCALING
);

/* ------------------------------- Uni address ------------------------------ */
const UniswapV2Router = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const UniswapV2Factory = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const SwapRouter = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const Quoter = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";

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

  const OneClickV3Factory = await ethers.getContractFactory("OneClickV3");
  const OneClickV3 = await OneClickV3Factory.deploy(
    UniswapV2Router,
    SwapRouter,
    Quoter,
    WETH,
    20,
    account.address
  );
  await OneClickV3.deployed();
  console.log("ONECLICKV3 Contract deployed to:", OneClickV3.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
