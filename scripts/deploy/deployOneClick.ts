require("dotenv").config();
import { ethers } from "hardhat";

/* ------------------------------- Uni address ------------------------------ */
const UniswapFactory = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const UniswapRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
/* ------------------------------ Token address ----------------------------- */
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
/* ------------------------------- Fee address ------------------------------ */
const feeAddress = "0x2b276218D962dEEbF96C749ffB228601b2C7a587";

async function main() {
    /* ----------------------------- Deploy address ----------------------------- */
    const accounts = await ethers.getSigners();
    const account = accounts[0];
    console.log("Deploying contracts by account:", account.address);

    /* --------------------------- Deploy the contract -------------------------- */
    const OneClickFactory = await ethers.getContractFactory("OneClick");
    const OneClick = await OneClickFactory.deploy(
        UniswapRouter,
        UniswapFactory,
        WETH,
        20,
        feeAddress
    );
    await OneClick.deployed();
    console.log("Contract deployed to:", OneClick.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
