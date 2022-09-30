// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

import "../interface/ICurveFi.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CurveSwapper.sol";

pragma experimental ABIEncoderV2;

contract CurveSwapWrappedTricrypto is CurveSwapper {

    address public weth = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    IERC20 wethContract = IERC20(weth);

    address public pool = 0xD51a44d3FaE010294C616388b506AcdA1bfAAE46;
    ICurveFi curveFi = ICurveFi(pool);

    address public crv3crypto = 0xc4AD29ba4B3c580e6D59105FFf484999997675Ff;
    IERC20 crv3CryptoContract = IERC20(crv3crypto);

    uint maxUint = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
    constructor() {}

    function addLiquidity(
        uint256[3] memory amounts,
        uint256 min_mint_amount)
    external {
        wethContract.approve(pool, maxUint);
        _add_liquidity(pool, amounts, min_mint_amount);
        uint balanceCrv3Crypto = crv3CryptoContract.balanceOf(address(this));

        crv3CryptoContract.transfer(msg.sender, balanceCrv3Crypto);
    }
}
