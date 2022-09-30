// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

import "../interface/ICurveFi.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CurveSwapper.sol";

pragma experimental ABIEncoderV2;

contract CurveSwapWrappedFrax3crv_f is CurveSwapper {

    address public frax = 0x853d955aCEf822Db058eb8505911ED77F175b99e;
    IERC20 fraxContract = IERC20(frax);

    address public threecrv = 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490;
    IERC20 threeCrvContract = IERC20(threecrv);

    address public pool = 0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B;
    ICurveFi curveFi = ICurveFi(pool);

    address public frax3crv_f = 0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B;
    IERC20 frax3crv_fContract = IERC20(frax3crv_f);

    uint maxUint = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
    constructor() {}

    function addLiquidity(
        uint256[2] memory amounts,
        uint256 min_mint_amount)
    external {
        fraxContract.approve(pool, maxUint);
        _add_liquidity(pool, amounts, min_mint_amount);
        uint balanceFrax3Crv_f = frax3crv_fContract.balanceOf(address(this));

        frax3crv_fContract.transfer(msg.sender, balanceFrax3Crv_f);
    }

    function removeLiquidity()
    external {
        frax3crv_fContract.approve(pool, maxUint);
        uint balanceCrvFrax = frax3crv_fContract.balanceOf(address(this));

        _remove_liquidity_one_coin(pool, balanceCrvFrax, 0, 0);
        uint balanceUsdc = fraxContract.balanceOf(address(this));

        fraxContract.transfer(msg.sender, balanceUsdc);
    }
}
