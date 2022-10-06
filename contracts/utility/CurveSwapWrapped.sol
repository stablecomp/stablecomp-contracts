// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

import "../interface/ICurveFi.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CurveSwapper.sol";

pragma experimental ABIEncoderV2;

contract CurveSwapWrapped is CurveSwapper {

    address public tokenDepositAddress;
    IERC20 tokenDepositContract;

    address public curveSwapAddress;
    ICurveFi curveSwapContract;

    address public wantAddress;
    IERC20 wantContract;

    uint maxUint = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
    constructor(
        address _tokenDepositAddress,
        address _curveSwapAddress,
        address _wantAddress
    ) {
        tokenDepositAddress = _tokenDepositAddress;
        tokenDepositContract = IERC20(_tokenDepositAddress);
        curveSwapAddress = _curveSwapAddress;
        curveSwapContract = ICurveFi(_curveSwapAddress);
        wantAddress = _wantAddress;
        wantContract = IERC20(_wantAddress);

    }

    function addLiquidity_2coins(
        uint256[2] memory amounts,
        uint256 min_mint_amount)
    external {
        tokenDepositContract.approve(curveSwapAddress, maxUint);
        _add_liquidity(curveSwapAddress, amounts, min_mint_amount);
        uint balanceWant = wantContract.balanceOf(address(this));

        wantContract.transfer(msg.sender, balanceWant);
    }

    function addLiquidity_3coins(
        uint256[3] memory amounts,
        uint256 min_mint_amount)
    external {
        tokenDepositContract.approve(curveSwapAddress, maxUint);
        _add_liquidity(curveSwapAddress, amounts, min_mint_amount);
        uint balanceWant = wantContract.balanceOf(address(this));

        wantContract.transfer(msg.sender, balanceWant);
    }

    /*
    function addLiquidity(
        uint256[4] memory amounts,
        uint256 min_mint_amount
    )
    external {
        tokenDepositContract.approve(curveSwapAddress, maxUint);
        _add_liquidity(curveSwapAddress, amounts, min_mint_amount);
        uint balanceWant = wantContract.balanceOf(address(this));

        wantContract.transfer(msg.sender, balanceWant);
    }
*/
    function removeLiquidity()
    external {
        wantContract.approve(curveSwapAddress, maxUint);
        uint balanceWant = wantContract.balanceOf(address(this));

        _remove_liquidity_one_coin(curveSwapAddress, balanceWant, 0, 0);
        uint balanceTokenDeposit = tokenDepositContract.balanceOf(address(this));

        tokenDepositContract.transfer(msg.sender, balanceTokenDeposit);
    }
}
