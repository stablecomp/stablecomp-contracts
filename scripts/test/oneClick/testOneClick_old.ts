require("dotenv").config();
import { network, ethers } from "hardhat";
import {
  OneClickInV3,
  EstimateOneClickInV3,
  OneClickOutV3,
  EstimateOneClickOutV3,
} from "@scalingparrots/uniswap-smart-routing";
import type {
  OneClickInSmartRouting,
  OneClickInContract,
  EstimateOneClickInContract,
  OneClickOutSmartRouting,
  OneClickOutContract,
  EstimateOneClickOutContract,
} from "@scalingparrots/uniswap-smart-routing";

const rpcProvider = new ethers.providers.JsonRpcProvider(
  process.env.RPC_URL_SCALING
);

/* ------------------------------- Uni address ------------------------------ */
const UniswapV2Router = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const SwapRouter = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

/* ------------------------------ Token address ----------------------------- */
const ETH = "0x0000000000000000000000000000000000000000";
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const FRAX = "0x853d955aCEf822Db058eb8505911ED77F175b99e";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const WBTC = "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599";

/* ------------------------------ Whale address ----------------------------- */
const USDC_whale = "0x55FE002aefF02F77364de339a1292923A15844B8";
const WBTC_whale = "0x0aaeFad51c8Cd1303aA3054b87BdD6f9A356DfC8";

/* ------------------------------ Vault Address ----------------------------- */
const sComp = "0x785621aeC18af65B8C6998CCfFA7e035e75DbFF7";

/* -------------------------------------------------------------------------- */
/*             impersonate account and transfer to owner (hardhat)            */
/* -------------------------------------------------------------------------- */
async function impersonateAdress(address: string) {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
  return await rpcProvider.getSigner(address);
}

async function impersonateHardhat(address: string) {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
  return await ethers.getSigner(address);
}

async function main() {
  /* ----------------------------- Deploy address ----------------------------- */
  const accounts = await ethers.getSigners();
  const account = accounts[0];
  console.log("Deploying contracts by account:", account.address);
  console.log("Account balance:", (await account.getBalance()).toString());

  /* --------------------------- Deploy the contract -------------------------- */

  const OneClickFactory = await ethers.getContractFactory("OneClickV3");
  const OneClick = await OneClickFactory.deploy(
    UniswapV2Router,
    SwapRouter,
    WETH,
    20,
    account.address
  );
  await OneClick.deployed();
  console.log("Contract deployed to:", OneClick.address);

  /*
  const OneClick = await ethers.getContractAt(
    "OneClickV3",
    "0x15BB2cc3Ea43ab2658F7AaecEb78A9d3769BE3cb"
  );
      */

  await OneClickIn(
    WBTC,
    "0.1",
    sComp,
    0.1,
    false,
    0,
    WBTC_whale,
    OneClick,
    account
  );

  await OneClickOut(WBTC, "2000", sComp, false, 0, OneClick, account);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

/* -------------------------------------------------------------------------- */
/*                                 OneClick In                                */
/* -------------------------------------------------------------------------- */
async function OneClickIn(
  tokenIn: string,
  amountIn: string,
  vault: string,
  crvSlippage: number,
  oneToken: boolean,
  indexIn: number,
  whaleAddress: string,
  OneClick: any,
  account: any
) {
  const tokenIn_contract = await ethers.getContractAt("ERC20", tokenIn);
  const tokenIn_symbol = await tokenIn_contract.symbol();
  const tokenIn_decimal = await tokenIn_contract.decimals();

  const vault_contract = await ethers.getContractAt("ERC20", vault);
  const vault_symbol = await vault_contract.symbol();
  const vault_decimal = await vault_contract.decimals();

  /* ------------------------ Print Details on Console ------------------------ */
  console.log(`OneClickInV3:`);
  console.table([
    {
      TokenIn: tokenIn_symbol,
      Vault: vault_symbol,
      AmountIn: amountIn,
      oneToken: oneToken,
    },
  ]);

  const amount = ethers.utils.parseUnits(amountIn, tokenIn_decimal);

  /* --------------------- Transfer from whale to account --------------------- */
  const whale = await impersonateHardhat(whaleAddress);
  await tokenIn_contract.connect(whale).transfer(account.address, amount);
  try {
    await tokenIn_contract.approve(OneClick.address, amount);
  } catch {
    console.log(`Approve ${tokenIn_symbol} failed`);
  }

  /* ----------------------- Account balance before swap ---------------------- */
  const startTokenIn = parseFloat(
    ethers.utils.formatUnits(
      await tokenIn_contract.balanceOf(account.address),
      tokenIn_decimal
    )
  );
  const startVault = parseFloat(
    ethers.utils.formatUnits(
      await vault_contract.balanceOf(account.address),
      vault_decimal
    )
  );

  console.log(`Message sender (${account.address}) balance before OneClick:`);
  console.table([
    {
      "TokenIn balance": startTokenIn,
      "Vault balance": startVault,
    },
  ]);

  /* -------------------------------- OneClick -------------------------------- */
  let oneClickInV3: OneClickInContract = {
    routev2: [],
    routev3: [],
    tokenIn: "",
    poolAddress: "",
    tokenAddress: "",
    poolTokens: [],
    vault: "",
    amountIn: "",
    crvSlippage: 0,
    oneToken: false,
    indexIn,
  };
  let eOneClickInV3: EstimateOneClickInContract = {
    tokenIn: "",
    poolAddress: "",
    poolTokens: [],
    priceTokenIn: [],
    vault: "",
    amountIn: "",
    crvSlippage: 0,
    oneToken: false,
    indexIn,
  };

  try {
    console.log("One Click In Smart Routing:");
    const o: OneClickInSmartRouting = {
      chainId: 1,
      provider: rpcProvider,
      tokenIn: tokenIn,
      amountIn: amountIn,
      vault: vault,
      crvSlippage: crvSlippage,
      oneToken: oneToken,
      indexIn: indexIn,
    };
    oneClickInV3 = await OneClickInV3(o);
    eOneClickInV3 = await EstimateOneClickInV3(o);
  } catch (error) {
    console.log("OneClickInSmartRouting failed");
    console.log(error);
  }

  try {
    console.log("Blockchian:");
    const tx = await OneClick.connect(account).estimateOneClickIn(
      eOneClickInV3.tokenIn,
      eOneClickInV3.poolAddress,
      eOneClickInV3.poolTokens,
      eOneClickInV3.priceTokenIn,
      eOneClickInV3.vault,
      eOneClickInV3.amountIn,
      eOneClickInV3.crvSlippage,
      eOneClickInV3.oneToken,
      eOneClickInV3.indexIn
    );
    const amountTokenOut = ethers.utils.formatUnits(tx, vault_decimal);
    console.log(
      `Deposit ${amountIn} of ${tokenIn_symbol} return minium of ${amountTokenOut} ${vault_symbol}`
    );
  } catch (error) {
    console.log("EstimateOneClickIn failed");
    console.log(error);
  }

  try {
    await OneClick.connect(account).OneClickIn(
      oneClickInV3.routev2,
      oneClickInV3.routev3,
      oneClickInV3.tokenIn,
      oneClickInV3.poolAddress,
      oneClickInV3.tokenAddress,
      oneClickInV3.poolTokens,
      oneClickInV3.vault,
      oneClickInV3.amountIn,
      oneClickInV3.crvSlippage,
      oneClickInV3.oneToken,
      oneClickInV3.indexIn
    );
  } catch (error) {
    console.log("OneClickIn failed");
    console.log(error);
  }

  /* ----------------------- Account balance after swap ----------------------- */
  const endTokenIn = parseFloat(
    ethers.utils.formatUnits(
      await tokenIn_contract.balanceOf(account.address),
      tokenIn_decimal
    )
  );
  const endVault = parseFloat(
    ethers.utils.formatUnits(
      await vault_contract.balanceOf(account.address),
      vault_decimal
    )
  );

  console.log(`Message sender (${account.address}) balance after OneClick:`);
  console.table([
    {
      "TokenIn balance": endTokenIn,
      "Vault balance": endVault,
    },
  ]);

  console.log(`Message sender (${account.address}) balance difference:`);
  console.table([
    {
      "TokenIn balance": endTokenIn - startTokenIn,
      "Vault balance": endVault - startVault,
    },
  ]);
}

/* -------------------------------------------------------------------------- */
/*                                 OneClickOut                                */
/* -------------------------------------------------------------------------- */
async function OneClickOut(
  tokenOut: string,
  amountOut: string,
  vault: string,
  oneToken: boolean,
  indexIn: number,
  OneClick: any,
  account: any
) {
  const tokenOut_contract = await ethers.getContractAt("ERC20", tokenOut);
  const tokenOut_symbol = await tokenOut_contract.symbol();
  const tokenOut_decimal = await tokenOut_contract.decimals();

  const vault_contract = await ethers.getContractAt("ERC20", vault);
  const vault_symbol = await vault_contract.symbol();
  const vault_decimal = await vault_contract.decimals();

  /* ------------------------------ Print Details ----------------------------- */
  console.log("OneClickOut:");
  console.log(`
  TokenOut: ${tokenOut_symbol}
  AmountOut: ${amountOut}
  Vault: ${vault_symbol}
  OneToken: ${oneToken}
  IndexIn: ${indexIn}
  `);

  /* ----------------------- Account Balance before swap ---------------------- */
  const startTokenOut = parseFloat(
    ethers.utils.formatUnits(
      await tokenOut_contract.balanceOf(account.address),
      tokenOut_decimal
    )
  );
  const startVault = parseFloat(
    ethers.utils.formatUnits(
      await vault_contract.balanceOf(account.address),
      vault_decimal
    )
  );

  console.log(`Message sender (${account.address}) balance before OneClick:`);
  console.table([
    {
      "TokenOut balance": startTokenOut,
      "Vault balance": startVault,
    },
  ]);

  /* -------------------------------- OneClick -------------------------------- */
  try {
    const amount = ethers.utils.parseUnits(amountOut, vault_decimal);
    await vault_contract.approve(OneClick.address, amount);
    console.log(`Approve ${amountOut} ${vault_symbol}: success`);
  } catch {
    console.log(`Approve ${vault_symbol} failed`);
  }

  let eOneClickOutV3: EstimateOneClickOutContract = {
    poolAddress: "",
    tokenAddress: "",
    poolTokens: [],
    vault: "",
    tokenOut: "",
    priceToken: "",
    amountOut: "",
  };

  let oneClickOutV3: OneClickOutContract = {
    routev2: [],
    routev3: [],
    poolAddress: "",
    tokenAddress: "",
    poolTokens: [],
    vault: "",
    tokenOut: "",
    amountOut: "",
  };

  try {
    const o: OneClickOutSmartRouting = {
      chainId: 1,
      provider: rpcProvider,
      tokenOut: tokenOut,
      amountOut: amountOut,
      vault: vault,
    };
    eOneClickOutV3 = await EstimateOneClickOutV3(o);
    console.log("Estimate One Click Out Smart Routing success");
    oneClickOutV3 = await OneClickOutV3(o);
    console.log("One Click Out Smart Routing success");
  } catch (error) {
    console.log("OneClickOutSmartRouting failed");
    console.log(error);
  }

  try {
    console.log("Blockchian:");
    const tx = await OneClick.connect(account).estimateOneClickOut(
      eOneClickOutV3.poolAddress,
      eOneClickOutV3.tokenAddress,
      eOneClickOutV3.poolTokens,
      eOneClickOutV3.vault,
      eOneClickOutV3.tokenOut,
      eOneClickOutV3.priceToken,
      eOneClickOutV3.amountOut
    );
    const amountTokenOut = ethers.utils.formatUnits(tx, tokenOut_decimal);

    console.log(
      `Witdhdraw ${amountOut} of ${vault_symbol} return minimum ${amountTokenOut} of ${tokenOut_symbol}`
    );
  } catch (error) {
    console.log("estimateOneClickOut failed");
    console.log(error);
  }

  try {
    await OneClick.connect(account).OneClickOut(
      oneClickOutV3.routev2,
      oneClickOutV3.routev3,
      oneClickOutV3.poolAddress,
      oneClickOutV3.tokenAddress,
      oneClickOutV3.poolTokens,
      oneClickOutV3.vault,
      oneClickOutV3.tokenOut,
      oneClickOutV3.amountOut
    );
  } catch (error) {
    console.log("OneClickOut failed");
    console.log(error);
  }

  /* ----------------------- Account balance after swap ----------------------- */
  const endTokenOut = parseFloat(
    ethers.utils.formatUnits(
      await tokenOut_contract.balanceOf(account.address),
      tokenOut_decimal
    )
  );
  const endVault = parseFloat(
    ethers.utils.formatUnits(
      await vault_contract.balanceOf(account.address),
      vault_decimal
    )
  );

  console.log(`Message sender (${account.address}) balance after OneClick:`);
  console.table([
    {
      "TokenOut balance": endTokenOut,
      "Vault balance": endVault,
    },
  ]);

  console.log(`Message sender (${account.address}) balance difference:`);
  console.table([
    {
      "TokenOut balance": endTokenOut - startTokenOut,
      "Vault balance": endVault - startVault,
    },
  ]);
}
