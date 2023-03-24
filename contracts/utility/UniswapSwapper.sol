// SPDX-License-Identifier: ISC

pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "../interface/IUniswapRouterV2.sol";
import "../interface/IUniswapV2Factory.sol";
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol';
import "./BaseSwapper.sol";

/*
    Expands swapping functionality over base strategy
    - ETH in and ETH out Variants
    - Sushiswap support in addition to Uniswap
*/
contract UniswapSwapper is BaseSwapper {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    address public uniswapV2; // Uniswap router
    address public sushiswap; // Sushiswap router
    address public uniswapV3; // Uniswapv3 router
    address public oracleRouter; // Aggregator chainlink oracle

    function _setUniswapV2Router(address _router) internal {
        uniswapV2 = _router;
    }

    function _setSushiswapRouter(address _router) internal {
        sushiswap = _router;
    }

    function _setUniswapV3Router(address _router) internal {
        uniswapV3 = _router;
    }

    function _setOracleRouter(address _router) internal {
        oracleRouter = _router;
    }

    // V2
    function _swapExactTokensForTokens(
        address _router,
        address _startToken,
        uint256 _amountIn,
        uint256 _amountOutMin,
        address[] memory _path
    ) internal {

        _safeApproveHelper(_startToken, _router, _amountIn);
        IUniswapRouterV2(_router).swapExactTokensForTokens(
            _amountIn,
            _amountOutMin,
            _path,
            address(this),
            block.timestamp
        );
    }

    // V3
    function _swapExactInputMultihop(
        address router,
        address startToken,
        uint256 amountIn,
        uint256 _amountsOutMin,
        bytes memory _pathData
    ) internal {
        ISwapRouter swapRouter = ISwapRouter(router);

        TransferHelper.safeApprove(startToken, address(swapRouter), 0);
        TransferHelper.safeApprove(startToken, address(swapRouter), amountIn);

        ISwapRouter.ExactInputParams memory params =
        ISwapRouter.ExactInputParams({
            path: _pathData,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: _amountsOutMin
        });

        // Executes the swap.
        swapRouter.exactInput(params);
    }



}
