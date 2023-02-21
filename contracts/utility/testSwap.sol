// SPDX-License-Identifier: ISC

pragma solidity ^0.8.13;
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../interface/IUniswapRouterV2.sol";
import "../interface/IUniswapV2Factory.sol";

import "hardhat/console.sol";

/*
    Expands swapping functionality over base strategy
    - ETH in and ETH out Variants
    - Sushiswap support in addition to Uniswap
*/
contract TestSwap {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    address internal constant uniswapv3 =
    0xE592427A0AEce92De3Edee1F18E0157C05861564; // Uniswapv3 router

    address public constant CRV = 0xD533a949740bb3306d119CC777fa900bA034cd52;
    address public constant WETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant MIM = 0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3;

    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

    // For this example, we will set the pool fee to 0.3%.
    uint24 public constant poolFee = 10000;

    ISwapRouter public immutable swapRouter = ISwapRouter(uniswapv3);

    constructor(){}

    function swapExactInputMultihop(
        address startToken,
        uint256 balance
    ) public {
        // Transfer the specified amount of DAI to this contract.
        TransferHelper.safeTransferFrom(startToken, msg.sender, address(this), balance);

        // Approve the router to spend DAI.
        TransferHelper.safeApprove(startToken, address(swapRouter), balance);

        console.log("balance");
        console.log(balance);

        ISwapRouter.ExactInputParams memory params =
            ISwapRouter.ExactInputParams({
                path: abi.encodePacked(CRV, poolFee, WETH9, poolFee, MIM),
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: balance,
                amountOutMinimum: 0
            });

        // Executes the swap.
        uint amountOut = swapRouter.exactInput(params);

        console.log(amountOut);
    }

    function swapExactInputSingle(
        address startToken,
        uint256 balance
    ) public {
        // Transfer the specified amount of DAI to this contract.
        TransferHelper.safeTransferFrom(DAI, msg.sender, address(this), balance);

        // Approve the router to spend DAI.
        TransferHelper.safeApprove(DAI, address(swapRouter), balance);

        // Approve the router to spend DAI.
        IERC20(startToken).safeApprove(uniswapv3, 0);
        IERC20(startToken).safeApprove(uniswapv3, 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff);

        ISwapRouter.ExactInputSingleParams memory params =
        ISwapRouter.ExactInputSingleParams({
            tokenIn: DAI,
            tokenOut: WETH9,
            fee: poolFee,
            recipient: msg.sender,
            deadline: block.timestamp,
            amountIn: balance,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });

        // The call to `exactInputSingle` executes the swap.
        uint amountOut = swapRouter.exactInputSingle(params);
        console.log("amountOut");
        console.log(amountOut);
    }
}
