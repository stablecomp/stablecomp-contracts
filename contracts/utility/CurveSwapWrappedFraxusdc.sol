// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

import "../interface/ICurveFi.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CurveSwapper.sol";

pragma experimental ABIEncoderV2;

contract CurveSwapWrappedFraxusdc is CurveSwapper {

    address public frax = 0x853d955aCEf822Db058eb8505911ED77F175b99e;
    IERC20 fraxContract = IERC20(frax);

    address public usdc = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    IERC20 usdcContract = IERC20(usdc);

    address public pool = 0xDcEF968d416a41Cdac0ED8702fAC8128A64241A2;
    ICurveFi curveFi = ICurveFi(pool);

    address public crvFrax = 0x3175Df0976dFA876431C2E9eE6Bc45b65d3473CC;
    IERC20 crvFraxContract = IERC20(crvFrax);

    uint maxUint = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
    constructor() {}

    function addLiquidity(
        uint256[2] memory amounts,
        uint256 min_mint_amount)
    external {
        usdcContract.approve(pool, maxUint);
        _add_liquidity(pool, amounts, min_mint_amount);
        uint balanceCrvFrax = crvFraxContract.balanceOf(address(this));

        crvFraxContract.transfer(msg.sender, balanceCrvFrax);
    }

    function removeLiquidity()
    external {
        crvFraxContract.approve(pool, maxUint);
        uint balanceCrvFrax = crvFraxContract.balanceOf(address(this));

        _remove_liquidity_one_coin(pool, balanceCrvFrax, 1, 0);
        uint balanceUsdc = usdcContract.balanceOf(address(this));

        usdcContract.transfer(msg.sender, balanceUsdc);
    }
}
