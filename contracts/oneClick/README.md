# OneClickV3

## Deploy the contract on Ethereum

```typescript
const UniswapV2Router = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const SwapRouter = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const Quoter = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";

const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

const oneClickFee = 20;
const oneClickFeeAddress = account.address;

const OneClickFactory = await ethers.getContractFactory("OneClickV3");
const OneClick = await OneClickFactory.deploy(
  UniswapV2Router,
  SwapRouter,
  Quoter,
  WETH,
  oneClickFee,
  oneClickFeeAddress
);
await OneClick.deployed();
console.log("Contract deployed to:", OneClick.address);
```
