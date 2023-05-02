// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.13;

import "hardhat/console.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IWETH.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

import "../utility/curve/interface/ICurvePool.sol";
import "../utility/curve/CurveSwapper.sol";
import "../utility/uniswap/UniswapSwapper.sol";
import "../vault/interface/ISCompVault.sol";
import "../controller/interface/IController.sol";
import "../strategies/interface/IStrategy.sol";

contract OneClickV3 is Ownable, UniswapSwapper, CurveSwapper {
    using SafeERC20 for IERC20;

    IWETH public immutable wEth;

    uint256 private constant minAmount = 1000;
    uint256 public constant maxInt = 2 ** 256 - 1;

    uint256 public constant oneClickFeeMax = 10000; // 100%
    uint256 public oneClickFee; // 1 = 0.01% ; 10 = 0.1% ; 100 = 1% ; 1000 = 10% ; 10000 = 100%
    address public oneClickFeeAddress;
    address public timeLockController;

    struct OneClickParamsSwap {
        uint[] listAverageSwap;
        bytes[] listPathData;
        uint[] listTypeSwap;
        uint[] listAmountOutMin;
        address[] listRouterAddress;
        uint minMintAmount;
    }

    /**
     * @notice Fallback for wToken
     * @dev when user send ETH with payable function,
     *      the amount will be send to the WETH contract and then receive WETH token
     */
    receive() external payable {
        assert(msg.sender == address(wEth));
    }

    // Owner recovers token
    event NewOneClickIn(address indexed sender, address indexed vault, address tokenIn, uint amountIn, uint amountOut, uint share);
    event TokenRecovery(address indexed token, uint256 amount);

    /**
     * @notice Constructor
     */
    constructor(
        address _weth,
        uint256 _oneClickFee,
        address _oneClickFeeAddress
    ) {

        //wToken
        wEth = IWETH(_weth);

        //OneClick Fee
        oneClickFee = _oneClickFee;
        oneClickFeeAddress = _oneClickFeeAddress;
    }

    /**
     * @notice OneClick a token in (e.g. token/other token)
     */
    function OneClickIn(
        address _tokenIn,
        uint _amountIn,
        address _vault,
        OneClickParamsSwap memory paramsSwap
    ) external payable {

        _checkOneClickIn(_vault, _tokenIn, _amountIn, paramsSwap);

        (address lpCurve, address curvePool) = _getCurveAddress(_vault);

        _amountIn = transferTokenIn(_tokenIn, _amountIn);

        uint[] memory amountsInCurve = _executeSwapIn(_amountIn, _tokenIn, paramsSwap);

        uint amountLpMinted = _addLiquidityCurve(curvePool, lpCurve, amountsInCurve, paramsSwap.minMintAmount);

        _approveVault(lpCurve, _vault, amountLpMinted);
        uint share = ISCompVault(_vault).depositFor(amountLpMinted, _msgSender());

        emit NewOneClickIn(msg.sender, _vault, _tokenIn, _amountIn, amountLpMinted, share);
    }

    function _checkOneClickIn(
        address _vault,
        address _tokenIn,
        uint _amountIn,
        OneClickParamsSwap memory paramsSwap
    ) internal {
        require(_vault != address(0), "vault cannot be 0");
        require(_tokenIn != address(0) || msg.value == _amountIn, "token in cannot be 0 or msg value must be same of amountIn");
        require(_amountIn > 0, "amount in must be > 0");
        require(paramsSwap.listAverageSwap.length == paramsSwap.listPathData.length, "list length invalid");
        require(paramsSwap.listPathData.length == paramsSwap.listTypeSwap.length, "list length invalid");
        require(paramsSwap.listTypeSwap.length == paramsSwap.listAmountOutMin.length, "list length invalid");
        require(paramsSwap.listAmountOutMin.length == paramsSwap.listAverageSwap.length, "list length invalid");
        require(paramsSwap.listAverageSwap.length == paramsSwap.listRouterAddress.length, "list length invalid");
    }

    function _getCurveAddress(
        address _vault
    ) internal view returns(address, address){

        address lpCurve = ISCompVault(_vault).token();
        address controller = ISCompVault(_vault).controller();
        address strategy = IController(controller).strategies(lpCurve);
        IStrategy.CurvePoolConfig memory curvePoolConfig = IStrategy(strategy).curvePool();
        address curvePool = curvePoolConfig.swap;

        return (lpCurve, curvePool);
    }

    /**
     * @notice OneClick a token out
     */
    function OneClickOut(
        address _curvePool,
        address _lpCurve,
        address _tokenOut,
        uint _amountIn,
        uint[] memory _amountsOutMinCurve,
        bool _removeLiquidityOneCoin,
        bytes[] memory _listPathData,
        uint[] memory _listTypeSwap,
        uint[] memory _listAmountOutMin,
        address[] memory _listRouterAddress,
        address _vault
    ) external payable {
        require(_curvePool != address(0), "curve pool cannot be 0");
        require(_tokenOut != address(0), "token out cannot be 0");
        require(_amountIn > 0, "amount in must be > 0");

        require(_listPathData.length == _listTypeSwap.length, "list length invalid");
        require(_listTypeSwap.length == _listAmountOutMin.length, "list length invalid");
        require(_listAmountOutMin.length == _amountsOutMinCurve.length, "list length invalid");
        require(_amountsOutMinCurve.length == _listRouterAddress.length, "list length invalid");

        _amountIn = transferTokenIn(_vault, _amountIn);

        uint lpAmount = ISCompVault(_vault).withdraw(_amountIn);

        uint[] memory amountsToSwap = _removeLiquidityCurve(_lpCurve, _curvePool, _removeLiquidityOneCoin, lpAmount, _amountsOutMinCurve);


        uint amountsOut = _executeSwapOut(_curvePool, amountsToSwap, _listRouterAddress, _listAmountOutMin, _listPathData, _listTypeSwap);

        if (amountsOut > 0 ) {
            IERC20(_tokenOut).transfer(_msgSender(), amountsOut);
        }

        //emit NewOneClickOut(_tokenIn, _poolAddress, _amountIn, lpAmount, msg.sender);
    }

    // INTERNAL FUNCTION
    function transferTokenIn(address _tokenIn, uint _amountIn) internal returns(uint){
        uint balanceBefore = IERC20(_tokenIn).balanceOf(address(this));
        IERC20(_tokenIn).safeTransferFrom(msg.sender, address(this), _amountIn);
        uint balanceAfter = IERC20(_tokenIn).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "something wrong in transfer from");
        return balanceAfter - balanceBefore; // additional check for deflationary token
    }

    function _getCoinCurvePool(address _curvePool, uint _coinsAmount) internal view returns(address[] memory){
        ICurvePool curvePool = ICurvePool(_curvePool);
        address[] memory listAddressPool = new address[](_coinsAmount);

        for (uint i = 0; i < _coinsAmount; i++ ) {
            listAddressPool[i] = curvePool.coins(i);
        }
        return listAddressPool;
    }

    function getListAmountByAverage(uint _amountIn, uint[] memory _listAverageSwap) internal pure returns(uint[] memory) {
        uint[] memory listAmountSwap = new uint[](_listAverageSwap.length);
        uint averageTotal = 0;
        for ( uint i = 0; i < _listAverageSwap.length; i++ ) {
            averageTotal += _listAverageSwap[i];
            uint amountToSwap = _amountIn / 100 * _listAverageSwap[i];
            listAmountSwap[i] = amountToSwap;
        }
        require(averageTotal == 100, "list average swap not valid");

        return listAmountSwap;
    }

    function _executeSwapIn(
        uint _amountIn,
        address _tokenIn,
        OneClickParamsSwap memory paramsSwap
    ) internal returns(uint[] memory amountsOut) {
        uint[] memory amountsToSwap = getListAmountByAverage(_amountIn, paramsSwap.listAverageSwap);
        amountsOut = new uint[](amountsToSwap.length);
        for(uint i = 0; i < amountsToSwap.length; i++) {
            if (amountsToSwap[i] != 0 ) {
                if(paramsSwap.listTypeSwap[i] == 0) {
                    uint[] memory amountsOutV2 = _makeSwapV2(paramsSwap.listRouterAddress[i], _tokenIn, amountsToSwap[i], paramsSwap.listAmountOutMin[i], paramsSwap.listPathData[i]);
                    amountsOut[i] = amountsOutV2[amountsOutV2.length -1];
                } else if(paramsSwap.listTypeSwap[i] == 1) {
                    uint amountOutV3 = _makeSwapV3(paramsSwap.listRouterAddress[i], _tokenIn, amountsToSwap[i], paramsSwap.listAmountOutMin[i], paramsSwap.listPathData[i]);
                    amountsOut[i] = amountOutV3;
                } else if(paramsSwap.listTypeSwap[i] == 2) {
                    uint amountOutCurve = _makeSwapCurve(paramsSwap.listRouterAddress[i], _tokenIn, amountsToSwap[i], paramsSwap.listAmountOutMin[i], paramsSwap.listPathData[i]);
                    amountsOut[i] = amountOutCurve;
                } else {
                    amountsOut[i] = 0;
                }
            } else {
                amountsOut[i] = 0;
            }
        }
        return amountsOut;
    }

    function _executeSwapOut(
        address _curvePool,
        uint[] memory _listAmountToSwap,
        address[]memory _listRouterAddress,
        uint[] memory _listAmountOutMin,
        bytes[] memory _listPathData,
        uint[] memory _listTypeSwap
    ) internal returns(uint amountsOut) {
        address[] memory listCoin = _getCoinCurvePool(_curvePool, _listAmountToSwap.length);
        for(uint i = 0; i < _listAmountToSwap.length; i++) {
            if (_listAmountToSwap[i] != 0 ) {
                if(_listTypeSwap[i] == 0) {
                    uint[] memory amountsOutV2 = _makeSwapV2(_listRouterAddress[i], listCoin[i], _listAmountToSwap[i], _listAmountOutMin[i], _listPathData[i]);
                    amountsOut += amountsOutV2[amountsOutV2.length -1];
                } else {
                    _makeSwapV3(_listRouterAddress[i], listCoin[i], _listAmountToSwap[i], _listAmountOutMin[i], _listPathData[i]);
                    //amountsOut
                }
            }
        }
        return 0;
    }

    function _makeSwapV2(address _router, address _tokenIn, uint _amountIn, uint _amountOutMin, bytes memory _pathData) internal returns(uint[] memory){
        if ( _tokenIn != address(0) ) {
            return _swapExactTokensForTokens(_router, _tokenIn, _amountIn, _amountOutMin, _pathData);
        } else {
            // todo swap exact eth
        }
    }

    function _makeSwapV3(address _router, address _tokenIn, uint _amountIn, uint _amountOutMin, bytes memory _pathData) internal returns(uint) {
        return _swapExactInputMultihop(_router, _tokenIn, _amountIn, _amountOutMin, _pathData);
    }

    function _makeSwapCurve(address _router, address _tokenIn, uint _amountIn, uint _amountOutMin, bytes memory _pathData) internal returns(uint) {
        return _exchange_multiple(_router, _tokenIn, _amountIn, _amountOutMin, _pathData);
    }

    // CURVE
    function _addLiquidityCurve(address _pool, address _lpCurve, uint[] memory _amountsIn, uint _minMintAmount) internal returns(uint){
        uint balanceLPBefore = IERC20(_lpCurve).balanceOf(address(this));
        _approvePoolCoin(_pool, _pool, _amountsIn);
        if ( _amountsIn.length == 2) {
            uint[2] memory amountsIn;
            for ( uint i = 0; i < 2; i++ ) {
                amountsIn[i] = _amountsIn[i];
            }
            ICurvePool(_pool).add_liquidity(amountsIn, _minMintAmount);
        } else if ( _amountsIn.length == 3) {
            uint[3] memory amountsIn;
            for ( uint i = 0; i < 3; i++ ) {
                amountsIn[i] = _amountsIn[i];
            }
            ICurvePool(_pool).add_liquidity(amountsIn, _minMintAmount);
        } else if ( _amountsIn.length == 4) {
            uint[4] memory amountsIn;
            for ( uint i = 0; i < 4; i++ ) {
                amountsIn[i] = _amountsIn[i];
            }
            ICurvePool(_pool).add_liquidity(amountsIn, _minMintAmount);
        }
        uint balanceLPAfter = IERC20(_lpCurve).balanceOf(address(this));
        return balanceLPAfter - balanceLPBefore;

    }

    function _removeLiquidityCurve(address _token, address _pool, bool _oneCoin, uint _amountIn, uint[] memory _minAmountsOut) internal returns(uint[] memory amounts){
        require(_minAmountsOut.length >= 2 && _minAmountsOut.length <= 4, "min amounts out length not valid");

        if(_token != _pool) {
            IERC20(_token).safeApprove(_pool, 0);
            IERC20(_token).safeApprove(_pool, _amountIn);
        }

        if( _oneCoin ) {
            uint index = _checkIndexPool(_minAmountsOut);
            ICurvePool(_pool).remove_liquidity_one_coin(_amountIn, int128(uint128(index)), _minAmountsOut[index]);
        } else if ( _minAmountsOut.length == 2) {
            uint[2] memory minAmountsOut;
            for ( uint i = 0; i < 2; i++ ) {
                minAmountsOut[i] = _minAmountsOut[i];
            }
            ICurvePool(_pool).remove_liquidity(_amountIn, minAmountsOut);
        } else if ( _minAmountsOut.length == 3) {
            uint[3] memory minAmountsOut;
            for ( uint i = 0; i < 3; i++ ) {
                minAmountsOut[i] = _minAmountsOut[i];
            }
            ICurvePool(_pool).remove_liquidity(_amountIn, minAmountsOut);
        } else {
            uint[4] memory minAmountsOut;
            for ( uint i = 0; i < 4; i++ ) {
                minAmountsOut[i] = _minAmountsOut[i];
            }
            ICurvePool(_pool).remove_liquidity(_amountIn, minAmountsOut);
        }

        amounts = _getBalanceCoinPool(_pool, _minAmountsOut.length);
    }

    function _approvePoolCoin(address _pool, address _spender, uint[] memory _amountsIn) internal {
        address[] memory coins = _getCoinCurvePool(_pool, _amountsIn.length);

        for ( uint i = 0; i < _amountsIn.length; i++ ) {
            if(_amountsIn[i] != 0) {
                _safeApproveHelper(coins[i], _spender, _amountsIn[i]);
            }
        }
    }

    function _approveVault(address _token, address _vault, uint _amount) internal {
        if(IERC20(_token).allowance(address(this), _vault) < _amount) {
            IERC20(_token).approve(_vault,  2**256 - 1);
        }
    }

    function _checkIndexPool(uint[] memory _minAmountsOut) internal returns(uint){
        for(uint i = 0; i < _minAmountsOut.length; i++) {
            if(_minAmountsOut[i] > 0) {
                return i;
            }
        }
        return 0;
    }

    function _getBalanceCoinPool(address _pool, uint _poolLength) internal view returns(uint[] memory){
        uint[] memory amounts = new uint[](_poolLength);

        address[] memory coins = _getCoinCurvePool(_pool, _poolLength);
        for(uint i = 0; i < _poolLength; i++) {
            amounts[i] = IERC20(coins[i]).balanceOf(address(this));
        }
        return amounts;
    }

}
