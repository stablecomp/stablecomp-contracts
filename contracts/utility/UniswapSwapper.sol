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
contract UniswapSwapper is BaseSwapper{
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    address public uniswapV2; // Uniswap router
    address public sushiswap; // Sushiswap router
    address public uniswapV3; // Uniswapv3 router
    address public quoterV3; // Quoter Uniswapv3

    function _setUniswapV2Router(address _router) internal {
        uniswapV2 = _router;
    }

    function _setSushiswapRouter(address _router) internal {
        sushiswap = _router;
    }

    function _setUniswapV3Router(address _router) internal {
        uniswapV3 = _router;
    }

    function _setQuoterUniswap(address _quoter) internal {
        quoterV3 = _quoter;
    }

    // V2
    function _swapExactTokensForTokens(
        address router,
        address startToken,
        uint256 amountIn,
        address[] memory path
    ) internal {
        uint[] memory amountsOutMin = IUniswapRouterV2(router).getAmountsOut(amountIn, path);

        _safeApproveHelper(startToken, router, amountIn);
        IUniswapRouterV2(router).swapExactTokensForTokens(
            amountIn,
            amountsOutMin[amountsOutMin.length -1],
            path,
            address(this),
            block.timestamp
        );
    }

    function _swapExactETHForTokens(
        address router,
        uint256 amountIn,
        address[] memory path
    ) internal {
        uint[] memory amountsOutMin = IUniswapRouterV2(router).getAmountsOut(amountIn, path);

        IUniswapRouterV2(router).swapExactETHForTokens{value: amountIn}(
            amountsOutMin[amountsOutMin.length -1],
            path,
            address(this),
            block.timestamp
        );
    }

    function _swapExactTokensForETH(
        address router,
        address startToken,
        uint256 amountIn,
        address[] memory path
    ) internal {
        uint[] memory amountsOutMin = IUniswapRouterV2(router).getAmountsOut(amountIn, path);

        _safeApproveHelper(startToken, router, amountIn);
        IUniswapRouterV2(router).swapExactTokensForETH(
            amountIn,
            amountsOutMin[amountsOutMin.length -1],
            path,
            address(this),
            block.timestamp
        );
    }

    function _getPair(
        address router,
        address token0,
        address token1
    ) internal view returns (address) {
        address factory = IUniswapRouterV2(router).factory();
        return IUniswapV2Factory(factory).getPair(token0, token1);
    }

    /// @notice Add liquidity to uniswap for specified token pair, utilizing the maximum balance possible
    function _addMaxLiquidity(
        address router,
        address token0,
        address token1
    ) internal {
        uint256 _token0Balance =
        IERC20(token0).balanceOf(address(this));
        uint256 _token1Balance =
        IERC20(token1).balanceOf(address(this));

        _safeApproveHelper(token0, router, _token0Balance);
        _safeApproveHelper(token1, router, _token1Balance);

        IUniswapRouterV2(router).addLiquidity(
            token0,
            token1,
            _token0Balance,
            _token1Balance,
            0,
            0,
            address(this),
            block.timestamp
        );
    }

    function _addMaxLiquidityEth(address router, address token0) internal {
        uint256 _token0Balance =
        IERC20(token0).balanceOf(address(this));
        uint256 _ethBalance = address(this).balance;

        _safeApproveHelper(token0, router, _token0Balance);
        IUniswapRouterV2(router).addLiquidityETH{value: _ethBalance}(
            token0,
            _token0Balance,
            0,
            0,
            address(this),
            block.timestamp
        );
    }

    // V3
    function _swapExactInputMultihop3(
        address router,
        address startToken,
        uint256 amountIn,
        address[] memory path,
        uint24[] memory feePath
    ) internal {

        bytes memory pathData = abi.encodePacked(path[0], feePath[0], path[1], feePath[1], path[2], feePath[2], path[3]);
        uint quote = _getQuoteExactInput(pathData, amountIn);

        ISwapRouter swapRouter = ISwapRouter(router);

        TransferHelper.safeApprove(startToken, address(swapRouter), 0);
        TransferHelper.safeApprove(startToken, address(swapRouter), amountIn);

        ISwapRouter.ExactInputParams memory params =
        ISwapRouter.ExactInputParams({
            path: pathData,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: quote
        });

        // Executes the swap.
        swapRouter.exactInput(params);
    }

    function _swapExactInputMultihop2(
        address router,
        address startToken,
        uint256 amountIn,
        address[] memory path,
        uint24[] memory feePath
    ) internal {
        bytes memory pathData = abi.encodePacked(path[0], feePath[0], path[1], feePath[1], path[2]);

        uint quote = _getQuoteExactInput(pathData, amountIn);

        ISwapRouter swapRouter = ISwapRouter(router);

        TransferHelper.safeApprove(startToken, address(swapRouter), 0);
        TransferHelper.safeApprove(startToken, address(swapRouter), amountIn);

        ISwapRouter.ExactInputParams memory params =
        ISwapRouter.ExactInputParams({
            path: pathData,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: quote
        });

        // Executes the swap.
        swapRouter.exactInput(params);
    }

    function _swapExactInputMultihop1(
        address router,
        address startToken,
        uint256 amountIn,
        address[] memory path,
        uint24[] memory feePath
    ) internal {
        bytes memory pathData = abi.encodePacked(path[0], feePath[0], path[1]);
        uint quote = _getQuoteExactInput(pathData, amountIn);

        ISwapRouter swapRouter = ISwapRouter(router);

        TransferHelper.safeApprove(startToken, address(swapRouter), 0);
        TransferHelper.safeApprove(startToken, address(swapRouter), amountIn);

        ISwapRouter.ExactInputParams memory params =
        ISwapRouter.ExactInputParams({
            path: pathData,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: quote
        });

        // Executes the swap.
        swapRouter.exactInput(params);
    }

    function _getQuoteExactInput(bytes memory _path, uint _amountIn) internal returns(uint) {
        uint quote = IQuoter(quoterV3).quoteExactInput(_path, _amountIn);
        return quote;
    }

}
