require("dotenv").config();
import { ethers } from "hardhat";

const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const TCRV = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const DOLA = "0x865377367054516e17014CcdED1e7d814EDC9ce4";

/* ------------------------------ Uniswap Pool ------------------------------ */
const UNIV3_USDC_TCRV = "0xb0d092380D89A6857cC3C57Af9519F4Ac5ABC0be";
const UNIV2_WETH_DOLA = "0xecFbE9B182F6477a93065C1c11271232147838E5";
const UNIV2_WETH_TCRV = "0x3C62d796e6474B0dcaC1D786cA87fe1a40b6995A";

async function main() {
  /* ------------------------ Connect to USDC contract ------------------------ */
  const usdc_contract = await ethers.getContractAt("ERC20", USDC);
  const usdc_decimal = await usdc_contract.decimals();
  /* ------------------------ Connect to TCRV contract ------------------------ */
  const tcrv_contract = await ethers.getContractAt("ERC20", TCRV);
  const tcrv_decimal = await tcrv_contract.decimals();
  /* ------------------------ Connect to WETH contract ------------------------ */
  const weth_contract = await ethers.getContractAt("ERC20", WETH);
  const weth_decimal = await weth_contract.decimals();
  /* ------------------------ Connect to DOLA contract ------------------------ */
  const dola_contract = await ethers.getContractAt("ERC20", DOLA);
  const dola_decimal = await dola_contract.decimals();

  /* ------------------------------------ - ----------------------------------- */

  /* --------------------- Check balance of USDC-3CRV pool -------------------- */
  console.log("CHECK BALANCE OF UNISWAP V3 POOL OF USDC-3CRV");

  /* ----------------------------- Balance of USDC ---------------------------- */
  const usdc_balance = await usdc_contract.balanceOf(UNIV3_USDC_TCRV);
  /* ----------------------------- Balance of TRCV ---------------------------- */
  const tcrv_balance = await tcrv_contract.balanceOf(UNIV3_USDC_TCRV);
  /* --------------------- Format Balance of USDC and TCRV -------------------- */
  const usdc_balance_format = ethers.utils.formatUnits(
    usdc_balance,
    usdc_decimal
  );
  const tcrv_balance_format = ethers.utils.formatUnits(
    tcrv_balance,
    tcrv_decimal
  );
  /* ------------------------------- Console log ------------------------------ */
  console.log("USDC balance:", usdc_balance_format);
  console.log("3CRV balance:", tcrv_balance_format);

  /* ------------------------------------ - ----------------------------------- */

  /* --------------------- Check Balance of DOLA-WETH pool -------------------- */
  console.log("CHECK BALANCE OF UNISWAP V2 POOL OF DOLA-WETH");

  /* ----------------------------- Balance of WETH ---------------------------- */
  const weth_balance = await weth_contract.balanceOf(UNIV2_WETH_DOLA);
  /* ----------------------------- Balance of DOLA ---------------------------- */
  const dola_balance = await dola_contract.balanceOf(UNIV2_WETH_DOLA);
  /* --------------------- Format Balance of WETH and DOLA -------------------- */
  const weth_balance_format = ethers.utils.formatUnits(
    weth_balance,
    weth_decimal
  );
  const dola_balance_format = ethers.utils.formatUnits(
    dola_balance,
    dola_decimal
  );
  /* ------------------------------- Console log ------------------------------ */
  console.log("WETH balance:", weth_balance_format);
  console.log("DOLA balance:", dola_balance_format);

  /* ------------------------------------ - ----------------------------------- */

  /* --------------------- Check Balance of TCRV-WETH pool -------------------- */
  console.log("CHECK BALANCE OF UNISWAP V2 POOL OF TCRV-WETH");

  /* ----------------------------- Balance of WETH ---------------------------- */
  const weth_balance2 = await weth_contract.balanceOf(UNIV2_WETH_TCRV);
  /* ----------------------------- Balance of TCRV ---------------------------- */
  const tcrv_balance2 = await tcrv_contract.balanceOf(UNIV2_WETH_TCRV);
  /* --------------------- Format Balance of WETH and TCRV -------------------- */
  const weth_balance_format2 = ethers.utils.formatUnits(
    weth_balance2,
    weth_decimal
  );
  const tcrv_balance_format2 = ethers.utils.formatUnits(
    tcrv_balance2,
    tcrv_decimal
  );
  /* ------------------------------- Console log ------------------------------ */
  console.log("WETH balance:", weth_balance_format2);
  console.log("3CRV balance:", tcrv_balance_format2);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
