// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

import "./SCompStrategyBase.sol";

/*
Version 1.3:
    - Amount out min calculate version without variant
    - Array undefined size in calc_token_amount
*/
contract SCompStrategyV1_3 is
SCompStrategyBase
{

    using SafeMath for uint256;
    /**
     * @param _nameStrategy name string of strategy
     * @param _governance is authorized actors, authorized pauser, can call earn, can set params strategy, receive fee harvest
     * @param _strategist receive fee compound
     * @param _want address lp to deposit
     * @param _tokenCompound address token to compound
     * @param _pid id of pool in convex booster
     * @param _feeConfig performanceFee governance e strategist + fee withdraw
     * @param _curvePool curve pool config
     */
    constructor(
        string memory _nameStrategy,
        address _governance,
        address _strategist,
        address _controller,
        address _want,
        address _tokenCompound,
        uint256 _pid,
        uint256[3] memory _feeConfig,
        CurvePoolConfig memory _curvePool
    ) SCompStrategyBase(_nameStrategy, _governance, _strategist, _controller, _want, _tokenCompound, _pid, _feeConfig, _curvePool) {
    }

    function version() virtual override external pure returns (string memory) {
        return "1.3";
    }

    function _getAmountOutMinAddLiquidity(uint _amount) virtual override public view returns(uint){
        uint amountCurveOut;
        if ( curvePool.numElements == 2 ) {
            uint[] memory amounts = new uint[](2);
            amounts[curvePool.tokenCompoundPosition] = _amount;
            amountCurveOut = ICurveFi(curvePool.swap).calc_token_amount(amounts, true);
        } else if ( curvePool.numElements == 3 ) {
            uint[] memory amounts = new uint[](3);
            amounts[curvePool.tokenCompoundPosition] = _amount;
            amountCurveOut = ICurveFi(curvePool.swap).calc_token_amount(amounts, true);
        } else {
            uint[] memory amounts = new uint[](4);
            amounts[curvePool.tokenCompoundPosition] = _amount;
            amountCurveOut = ICurveFi(curvePool.swap).calc_token_amount(amounts, true);
        }
        amountCurveOut -= amountCurveOut.mul(slippageLiquidity).div(PRECISION);
        return amountCurveOut;
    }

    function _add_liquidity_single_coin(
        address swap,
        address inputToken,
        uint256 inputAmount,
        uint256 inputPosition,
        uint256 numPoolElements,
        uint256 min_mint_amount
    ) internal override {
        _safeApproveHelper(inputToken, swap, inputAmount);
        if (numPoolElements == 2) {
            uint256[] memory convertedAmounts = new uint256[](2);
            convertedAmounts[inputPosition] = inputAmount;
            ICurveFi(swap).add_liquidity(convertedAmounts, min_mint_amount);
        } else if (numPoolElements == 3) {
            uint256[] memory convertedAmounts = new uint256[](3);
            convertedAmounts[inputPosition] = inputAmount;
            ICurveFi(swap).add_liquidity(convertedAmounts, min_mint_amount);
        } else if (numPoolElements == 4) {
            uint256[] memory convertedAmounts = new uint256[](4);
            convertedAmounts[inputPosition] = inputAmount;
            ICurveFi(swap).add_liquidity(convertedAmounts, min_mint_amount);
        } else {
            revert("Bad numPoolElements");
        }
    }



}
