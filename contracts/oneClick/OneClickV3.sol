// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.13;

import "hardhat/console.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IWETH.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";

import "../interface/ICurvePool.sol";
import "../interface/ISCompVault.sol";

contract OneClickV3 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IUniswapV2Router02 public immutable router;
    address private routerAddress02;

    ISwapRouter public immutable swapRouter;
    address private routerAddress03;

    IQuoter public immutable quoter;
    address private quoterAddress;

    IWETH public immutable wTokenInterface;
    address private wToken;

    uint256 private constant minAmount = 1000;
    uint256 public constant maxInt = 2 ** 256 - 1;

    uint256 public constant oneClickFeeMax = 10000; // 100%
    uint256 public oneClickFee; // 1 = 0.01% ; 10 = 0.1% ; 100 = 1% ; 1000 = 10% ; 10000 = 100%
    address public oneClickFeeAddress;
    address public timeLockController;

    /**
     * @notice Fallback for wToken
     */
    receive() external payable {
        assert(msg.sender == wToken);
    }

    event NewOneClickIn(
        address indexed TokenIn,
        address indexed poolAddress,
        uint256 amountIn,
        uint256 lpAmount,
        address indexed user
    );

    event NewOneClickOut(
        address indexed TokenOut,
        address indexed poolAddress,
        uint256 amountOut,
        uint256[] TokenOutAmount,
        address indexed user
    );

    // Owner recovers token
    event TokenRecovery(address indexed token, uint256 amount);

    /**
     * @notice Constructor
     * @param _router: address of the Uniswap V2 Router
     * @param _swapRouter: address of the Uniswap V3 Router
     * @param _wToken address: address of the wToken contract
     * @param _oneClickFee: set the fee for the OneClick
     * @param _oneClickFeeAddress: set the fee address for the OneClick
     */
    constructor(
        address _router,
        address _swapRouter,
        address _quoter,
        address _wToken,
        uint256 _oneClickFee,
        address _oneClickFeeAddress
    ) {
        //Uniswap V2 Router
        routerAddress02 = _router;
        router = IUniswapV2Router02(_router);
        //Uniswap V3 Router
        routerAddress03 = _swapRouter;
        swapRouter = ISwapRouter(_swapRouter);
        //Uniswap V3 Quoter
        quoterAddress = _quoter;
        quoter = IQuoter(_quoter);
        //wToken
        wToken = _wToken;
        wTokenInterface = IWETH(_wToken);
        //OneClick Fee
        oneClickFee = _oneClickFee;
        oneClickFeeAddress = _oneClickFeeAddress;
    }

    /* --------------------------- External Functions --------------------------- */

    /**
     * @notice OneClick a token in (e.g. token/other token)
     * @param _routev2: The routing of UniswapV2 for the swap
     * @param _routev3: The routing of UniswapV3 for the swap
     * @param _poolAddress: Curve pool address
     * @param _tokenAddress: Curve token address
     * @param _poolTokens: Curve tokens in the pool
     * @param _vault: StablecompVault address
     * @param _crvSlippage: slippage for the deposit
     * @param _oneToken: invest in all tokens or in a one of specified index
     * @param _indexIn: index of the specified to invest
     */
    function OneClickInETH(
        address[][] memory _routev2,
        bytes[] memory _routev3,
        address _poolAddress,
        address _tokenAddress,
        address[] memory _poolTokens,
        address _vault,
        uint256 _crvSlippage,
        bool _oneToken,
        uint256 _indexIn
    ) external payable nonReentrant {
        require(msg.value >= minAmount, "One Click: too small input amount");
        require(
            _poolTokens.length <= 4 && _poolTokens.length >= 2,
            "OneClick: pool size range is: min 2, max 4"
        );

        wTokenInterface.deposit{value: msg.value}();

        uint256 lpAmount = _OneClickIn(
            _routev2,
            _routev3,
            wToken,
            _poolAddress,
            _tokenAddress,
            _poolTokens,
            _vault,
            msg.value,
            _crvSlippage,
            _oneToken,
            _indexIn
        );

        emit NewOneClickIn(
            address(0),
            _poolAddress,
            msg.value,
            lpAmount,
            msg.sender
        );
    }

    /**
     * @notice OneClick a token in (e.g. token/other token)
     * @param _routev2: The routing of UniswapV2 for the swap
     * @param _routev3: The routing of UniswapV3 for the swap
     * @param _tokenIn: the token to swap or deposit
     * @param _poolAddress: Curve pool address
     * @param _tokenAddress: Curve token address
     * @param _poolTokens: Curve tokens in the pool
     * @param _vault: StablecompVault address
     * @param _amountIn: amount of token to swap or deposit
     * @param _crvSlippage: slippage for the deposit
     * @param _oneToken: invest in all tokens or in a one of specified index
     * @param _indexIn: index of the specified to invest
     */
    function OneClickIn(
        address[][] memory _routev2,
        bytes[] memory _routev3,
        address _tokenIn,
        address _poolAddress,
        address _tokenAddress,
        address[] memory _poolTokens,
        address _vault,
        uint256 _amountIn,
        uint256 _crvSlippage,
        bool _oneToken,
        uint256 _indexIn
    ) external nonReentrant {
        require(_amountIn >= minAmount, "OneClick: too small input amount");
        require(
            _poolTokens.length <= 4 && _poolTokens.length >= 2,
            "OneClick: pool size range is: min 2, max 4"
        );

        require(
            IERC20(_tokenIn).allowance(msg.sender, address(this)) >= _amountIn,
            "OneClick: Input token is not approved"
        );

        IERC20(_tokenIn).safeTransferFrom(msg.sender, address(this), _amountIn);

        uint256 lpAmount = _OneClickIn(
            _routev2,
            _routev3,
            _tokenIn,
            _poolAddress,
            _tokenAddress,
            _poolTokens,
            _vault,
            _amountIn,
            _crvSlippage,
            _oneToken,
            _indexIn
        );

        emit NewOneClickIn(
            _tokenIn,
            _poolAddress,
            _amountIn,
            lpAmount,
            msg.sender
        );
    }

    /**
     * @notice OneClick a token out
     * @param _routev2: The routing of UniswapV2 for the swap
     * @param _routev3: The routing of UniswapV3 for the swap
     * @param _poolAddress: Curve pool address
     * @param _tokenAddress: Curve token address
     * @param _poolTokens: Curve tokens in the pool
     * @param _vault: StablecompVault address
     * @param _amountOut: amount of token to remove
     */
    function OneClickOutETH(
        address[][] memory _routev2,
        bytes[] memory _routev3,
        address _poolAddress,
        address _tokenAddress,
        address[] memory _poolTokens,
        address _vault,
        uint256 _amountOut
    ) external nonReentrant {
        require(_amountOut >= minAmount, "OneClick: too small input amount");
        require(
            _poolTokens.length <= 4 && _poolTokens.length >= 2,
            "OneClick: pool size range is: min 2, max 4"
        );

        require(
            IERC20(_vault).allowance(msg.sender, address(this)) >= _amountOut,
            "OneClick: Input token is not approved"
        );

        IERC20(_vault).safeTransferFrom(msg.sender, address(this), _amountOut);

        uint256 tokenOutAmount = _OneClickOut(
            _routev2,
            _routev3,
            _poolAddress,
            _tokenAddress,
            _poolTokens,
            _vault,
            wToken,
            _amountOut
        );

        wTokenInterface.withdraw(tokenOutAmount);
        payable(msg.sender).transfer(tokenOutAmount);

        uint256[] memory tokensOutAmount = new uint256[](1);
        tokensOutAmount[0] = tokenOutAmount;

        emit NewOneClickOut(
            address(0x0000000000000000000000000000000000000000),
            _poolAddress,
            _amountOut,
            tokensOutAmount,
            msg.sender
        );
    }

    /**
     * @notice OneClick a token out
     * @param _routev2: The routing of UniswapV2 for the swap
     * @param _routev3: The routing of UniswapV3 for the swap
     * @param _poolAddress: Curve pool address
     * @param _tokenAddress: Curve token address
     * @param _poolTokens: Curve tokens in the pool
     * @param _vault: StablecompVault address
     * @param _tokenOut: token we want to get out
     * @param _amountOut: amount of token to remove
     */
    function OneClickOut(
        address[][] memory _routev2,
        bytes[] memory _routev3,
        address _poolAddress,
        address _tokenAddress,
        address[] memory _poolTokens,
        address _vault,
        address _tokenOut,
        uint256 _amountOut
    ) external nonReentrant {
        require(_amountOut >= minAmount, "OneClick: too small input amount");
        require(
            _poolTokens.length <= 4 && _poolTokens.length >= 2,
            "OneClick: pool size range is: min 2, max 4"
        );

        require(
            IERC20(_vault).allowance(msg.sender, address(this)) >= _amountOut,
            "OneClick: Input token is not approved"
        );

        IERC20(_vault).safeTransferFrom(msg.sender, address(this), _amountOut);

        uint256 tokenOutAmount = _OneClickOut(
            _routev2,
            _routev3,
            _poolAddress,
            _tokenAddress,
            _poolTokens,
            _vault,
            _tokenOut,
            _amountOut
        );

        if (_tokenOut == _tokenAddress) {
            uint256[] memory tokensOutAmount = new uint256[](
                _poolTokens.length
            );
            for (uint256 i = 0; i < _poolTokens.length; i++) {
                _approveToken(
                    _poolTokens[i],
                    address(this),
                    IERC20(_poolTokens[i]).balanceOf(address(this))
                );
                IERC20(_poolTokens[i]).safeTransfer(
                    msg.sender,
                    IERC20(_poolTokens[i]).balanceOf(address(this))
                );

                tokensOutAmount[i] = IERC20(_poolTokens[i]).balanceOf(
                    address(this)
                );
            }

            emit NewOneClickOut(
                _tokenOut,
                _poolAddress,
                _amountOut,
                tokensOutAmount,
                msg.sender
            );
        } else {
            uint256[] memory tokensOutAmount = new uint256[](1);
            tokensOutAmount[0] = tokenOutAmount;

            _approveToken(_tokenOut, address(this), tokenOutAmount);
            IERC20(_tokenOut).safeTransferFrom(
                address(this),
                msg.sender,
                tokenOutAmount
            );
            emit NewOneClickOut(
                _tokenOut,
                _poolAddress,
                _amountOut,
                tokensOutAmount,
                msg.sender
            );
        }
    }

    /**
     * @notice Estimate the amount of token out
     * @param _tokenIn: token to deposit
     * @param _poolAddress: Curve pool address
     * @param _poolTokens: Curve tokens in the pool
     * @param _priceTokensIn: Curve tokens price vs _tokenIn
     * @param _vault: StablecompVault address
     * @param _amountIn: amount of token to deposit
     * @param _crvSlippage: slippage for deposit
     * @param _oneToken: if you want to deposit only one token
     * @param _indexIn: index of the token to deposit
     */
    function estimateOneClickIn(
        address _tokenIn,
        address _poolAddress,
        address[] memory _poolTokens,
        uint256[] memory _priceTokensIn,
        address _vault,
        uint256 _amountIn,
        uint256 _crvSlippage,
        bool _oneToken,
        uint256 _indexIn
    ) external view returns (uint256 amountTokenOut) {
        require(_amountIn >= minAmount, "OneClick: too small input amount");
        require(
            _poolTokens.length <= 4 && _poolTokens.length >= 2,
            "OneClick: pool size range is: min 2, max 4"
        );

        ICurvePool pool = ICurvePool(_poolAddress);

        // If you intend to deposit only one token
        if (_oneToken) {
            require(
                _indexIn <= _poolTokens.length,
                "OneClick: index out of range"
            );

            // If the input token is directly the one to be deposited --> deposit
            if (_tokenIn == _poolTokens[_indexIn]) {
                if (_poolTokens.length == 2) {
                    uint256[2] memory amounts;
                    amounts[_indexIn] = _amountIn;

                    uint256 slippage = (pool.calc_token_amount(amounts, true) *
                        _crvSlippage) / oneClickFeeMax;

                    uint256 amountCurveOut = pool.calc_token_amount(
                        amounts,
                        true
                    ) - slippage;
                    amountTokenOut = ISCompVault(_vault).balance() == 0
                        ? amountCurveOut
                        : (amountCurveOut * ISCompVault(_vault).totalSupply()) /
                            ISCompVault(_vault).balance();
                } else if (_poolTokens.length == 3) {
                    uint256[3] memory amounts;
                    amounts[_indexIn] = _amountIn;

                    uint256 slippage = (pool.calc_token_amount(amounts, true) *
                        _crvSlippage) / oneClickFeeMax;

                    uint256 amountCurveOut = pool.calc_token_amount(
                        amounts,
                        true
                    ) - slippage;
                    amountTokenOut = ISCompVault(_vault).balance() == 0
                        ? amountCurveOut
                        : (amountCurveOut * ISCompVault(_vault).totalSupply()) /
                            ISCompVault(_vault).balance();
                } else if (_poolTokens.length == 4) {
                    uint256[4] memory amounts;
                    amounts[_indexIn] = _amountIn;

                    uint256 slippage = (pool.calc_token_amount(amounts, true) *
                        _crvSlippage) / oneClickFeeMax;

                    uint256 amountCurveOut = pool.calc_token_amount(
                        amounts,
                        true
                    ) - slippage;
                    amountTokenOut = ISCompVault(_vault).balance() == 0
                        ? amountCurveOut
                        : (amountCurveOut * ISCompVault(_vault).totalSupply()) /
                            ISCompVault(_vault).balance();
                }
            }
            // If the input token does not match the one you want to deposit --> Swap --> Deposit
            else {
                if (_poolTokens.length == 2) {
                    uint256[2] memory amounts;
                    amounts[_indexIn] = _priceTokensIn[_indexIn];

                    uint256 slippage = (pool.calc_token_amount(amounts, true) *
                        _crvSlippage) / oneClickFeeMax;

                    uint256 amountCurveOut = pool.calc_token_amount(
                        amounts,
                        true
                    ) - slippage;
                    amountTokenOut = ISCompVault(_vault).balance() == 0
                        ? amountCurveOut
                        : (amountCurveOut * ISCompVault(_vault).totalSupply()) /
                            ISCompVault(_vault).balance();
                } else if (_poolTokens.length == 3) {
                    uint256[3] memory amounts;
                    amounts[_indexIn] = _priceTokensIn[_indexIn];

                    uint256 slippage = (pool.calc_token_amount(amounts, true) *
                        _crvSlippage) / oneClickFeeMax;

                    uint256 amountCurveOut = pool.calc_token_amount(
                        amounts,
                        true
                    ) - slippage;
                    amountTokenOut = ISCompVault(_vault).balance() == 0
                        ? amountCurveOut
                        : (amountCurveOut * ISCompVault(_vault).totalSupply()) /
                            ISCompVault(_vault).balance();
                } else if (_poolTokens.length == 4) {
                    uint256[4] memory amounts;
                    amounts[_indexIn] = _priceTokensIn[_indexIn];

                    uint256 slippage = (pool.calc_token_amount(amounts, true) *
                        _crvSlippage) / oneClickFeeMax;

                    uint256 amountCurveOut = pool.calc_token_amount(
                        amounts,
                        true
                    ) - slippage;
                    amountTokenOut = ISCompVault(_vault).balance() == 0
                        ? amountCurveOut
                        : (amountCurveOut * ISCompVault(_vault).totalSupply()) /
                            ISCompVault(_vault).balance();
                }
            }
        }
        // If the input token deposit in equal parts to the pool
        else {
            if (_poolTokens.length == 2) {
                uint256[2] memory amounts;
                amounts[0] = _priceTokensIn[0];
                amounts[1] = _priceTokensIn[1];

                uint256 slippage = (pool.calc_token_amount(amounts, true) *
                    _crvSlippage) / oneClickFeeMax;

                uint256 amountCurveOut = pool.calc_token_amount(amounts, true) -
                    slippage;

                amountTokenOut = ISCompVault(_vault).balance() == 0
                    ? amountCurveOut
                    : (amountCurveOut * ISCompVault(_vault).totalSupply()) /
                        ISCompVault(_vault).balance();
            } else if (_poolTokens.length == 3) {
                uint256[3] memory amounts;
                amounts[0] = _priceTokensIn[0];
                amounts[1] = _priceTokensIn[1];
                amounts[2] = _priceTokensIn[2];

                uint256 slippage = (pool.calc_token_amount(amounts, true) *
                    _crvSlippage) / oneClickFeeMax;

                uint256 amountCurveOut = pool.calc_token_amount(amounts, true) -
                    slippage;
                amountTokenOut = ISCompVault(_vault).balance() == 0
                    ? amountCurveOut
                    : (amountCurveOut * ISCompVault(_vault).totalSupply()) /
                        ISCompVault(_vault).balance();
            } else if (_poolTokens.length == 4) {
                uint256[4] memory amounts;
                amounts[0] = _priceTokensIn[0];
                amounts[1] = _priceTokensIn[1];
                amounts[2] = _priceTokensIn[2];
                amounts[3] = _priceTokensIn[3];

                uint256 slippage = (pool.calc_token_amount(amounts, true) *
                    _crvSlippage) / oneClickFeeMax;

                uint256 amountCurveOut = pool.calc_token_amount(amounts, true) -
                    slippage;
                amountTokenOut = ISCompVault(_vault).balance() == 0
                    ? amountCurveOut
                    : (amountCurveOut * ISCompVault(_vault).totalSupply()) /
                        ISCompVault(_vault).balance();
            }
        }
    }

    function estimateOneClickOut(
        address _poolAddress,
        address[] memory _poolTokens,
        address _vault,
        address _tokenOut,
        uint256[] memory _priceTokens,
        uint256 _amountOut
    ) external view returns (uint256 amountTokenOut) {
        ISCompVault vault = ISCompVault(_vault);

        uint256 vaultBalance = vault.balance() == 0 ? 1 : vault.balance();
        uint256 vaultTotalSupply = vault.totalSupply() == 0
            ? 1
            : vault.totalSupply();

        uint256 curveLpAmount = (vaultBalance * _amountOut) / vaultTotalSupply;

        if (_poolTokens.length == 2) {
            uint256[2] memory amountOutMin = getAmountOutMin2(
                _poolAddress,
                _poolTokens,
                curveLpAmount
            );

            for (uint256 i = 0; i < _poolTokens.length; i++) {
                if (_poolTokens[i] == _tokenOut) {
                    amountTokenOut += amountOutMin[i];
                } else {
                    uint256 decimalTokenOut = IERC20Metadata(_tokenOut)
                        .decimals();
                    uint256 decimalTokenIn = IERC20Metadata(_poolTokens[i])
                        .decimals();
                    if (decimalTokenOut > decimalTokenIn) {
                        uint256 pricePoolToken = _priceTokens[i] *
                            (10 ** (decimalTokenOut - decimalTokenIn));
                        amountTokenOut += pricePoolToken;
                    } else {
                        uint256 pricePoolToken = _priceTokens[i] /
                            (10 ** (decimalTokenIn - decimalTokenOut));
                        amountTokenOut += pricePoolToken;
                    }
                }
            }
        } else if (_poolTokens.length == 3) {
            uint256[3] memory amountOutMin = getAmountOutMin3(
                _poolAddress,
                _poolTokens,
                curveLpAmount
            );

            for (uint256 i = 0; i < _poolTokens.length; i++) {
                if (_poolTokens[i] == _tokenOut) {
                    amountTokenOut += amountOutMin[i];
                } else {
                    uint256 decimalTokenOut = IERC20Metadata(_tokenOut)
                        .decimals();
                    uint256 decimalTokenIn = IERC20Metadata(_poolTokens[i])
                        .decimals();
                    if (decimalTokenOut > decimalTokenIn) {
                        uint256 pricePoolToken = _priceTokens[i] *
                            (10 ** (decimalTokenOut - decimalTokenIn));
                        amountTokenOut += pricePoolToken;
                    } else {
                        uint256 pricePoolToken = _priceTokens[i] /
                            (10 ** (decimalTokenIn - decimalTokenOut));
                        amountTokenOut += pricePoolToken;
                    }
                }
            }
        } else if (_poolTokens.length == 4) {
            uint256[4] memory amountOutMin = getAmountOutMin4(
                _poolAddress,
                _poolTokens,
                curveLpAmount
            );

            for (uint256 i = 0; i < _poolTokens.length; i++) {
                if (_poolTokens[i] == _tokenOut) {
                    amountTokenOut += amountOutMin[i];
                } else {
                    uint256 decimalTokenOut = IERC20Metadata(_tokenOut)
                        .decimals();
                    uint256 decimalTokenIn = IERC20Metadata(_poolTokens[i])
                        .decimals();
                    if (decimalTokenOut > decimalTokenIn) {
                        uint256 pricePoolToken = _priceTokens[i] *
                            (10 ** (decimalTokenOut - decimalTokenIn));
                        amountTokenOut += pricePoolToken;
                    } else {
                        uint256 pricePoolToken = _priceTokens[i] /
                            (10 ** (decimalTokenIn - decimalTokenOut));
                        amountTokenOut += pricePoolToken;
                    }
                }
            }
        }
    }

    /**
     * @notice Estimate the price of a token in using the UniswapV2 router
     * @param _path: The token in and routing for swap
     * @param _swapAmount: amount of token to swap
     * @param _slippage: slippage percentage
     */
    function estimatePriceV2(
        address[] memory _path,
        uint256 _swapAmount,
        uint256 _slippage
    ) public view returns (uint256 amountOut) {
        require(_path.length >= 2, "Estimate Price: path size is: min 2");

        uint256[] memory amountsOut = router.getAmountsOut(_swapAmount, _path);
        uint256 slippage = (amountsOut[amountsOut.length - 1] * _slippage) /
            oneClickFeeMax;
        amountOut = amountsOut[amountsOut.length - 1] - slippage;
    }

    /**
     * @notice Estimate the price of a token in using the UniswapV3 router
     * @param _path: The token in and routing for swap
     * @param _swapAmount: amount of token to swap
     * @param _slippage: slippage percentage
     */
    function estimatePriceV3(
        address[] memory _path,
        uint256 _swapAmount,
        uint256 _slippage
    ) public returns (uint256 amountOut) {
        require(_path.length >= 2, "Estimate Price: path size is: min 2");

        uint256 amountsOut = quoter.quoteExactInput(
            abi.encodePacked(_path),
            _swapAmount
        );
        uint256 slippage = (amountsOut * _slippage) / oneClickFeeMax;
        amountOut = amountsOut - slippage;
    }

    /**
     * @notice Estimate minimum amount out from Curve pool of 2 tokens
     * @param _poolAddress: Curve pool address
     * @param _poolTokens: Curve pool tokens
     * @param _amountOut: Amount out
     */
    function getAmountOutMin2(
        address _poolAddress,
        address[] memory _poolTokens,
        uint256 _amountOut
    ) public view returns (uint256[2] memory _amountOutMin) {
        uint256 totalSupply;
        for (uint256 i = 0; i < _poolTokens.length; i++) {
            uint256 decimalDiff10 = _get18Decimals(_poolTokens[i]);
            totalSupply +=
                IERC20(_poolTokens[i]).balanceOf(_poolAddress) *
                decimalDiff10;
        }

        for (uint256 i = 0; i < _poolTokens.length; i++) {
            uint256 decimalDiff10 = _get18Decimals(_poolTokens[i]);
            uint256 percent = (IERC20(_poolTokens[i]).balanceOf(_poolAddress) *
                decimalDiff10 *
                10) / totalSupply;
            _amountOutMin[i] =
                (percent *
                    _amountOut *
                    ICurvePool(_poolAddress).get_virtual_price()) /
                (decimalDiff10 * 1e19);
        }
    }

    /**
     * @notice Estimate minimum amount out from Curve pool of 3 tokens
     * @param _poolAddress: Curve pool address
     * @param _poolTokens: Curve pool tokens
     * @param _amountOut: Amount out
     */
    function getAmountOutMin3(
        address _poolAddress,
        address[] memory _poolTokens,
        uint256 _amountOut
    ) public view returns (uint256[3] memory _amountOutMin) {
        uint256 totalSupply;
        for (uint256 i = 0; i < _poolTokens.length; i++) {
            uint256 decimalDiff10 = _get18Decimals(_poolTokens[i]);
            totalSupply +=
                IERC20(_poolTokens[i]).balanceOf(_poolAddress) *
                decimalDiff10;
        }

        for (uint256 i = 0; i < _poolTokens.length; i++) {
            uint256 decimalDiff10 = _get18Decimals(_poolTokens[i]);
            uint256 percent = (IERC20(_poolTokens[i]).balanceOf(_poolAddress) *
                decimalDiff10 *
                10) / totalSupply;
            _amountOutMin[i] =
                (percent *
                    _amountOut *
                    ICurvePool(_poolAddress).get_virtual_price()) /
                (decimalDiff10 * 1e19);
        }
    }

    /**
     * @notice Estimate minimum amount out from Curve pool of 4 tokens
     * @param _poolAddress: Curve pool address
     * @param _poolTokens: Curve pool tokens
     * @param _amountOut: Amount out
     */
    function getAmountOutMin4(
        address _poolAddress,
        address[] memory _poolTokens,
        uint256 _amountOut
    ) public view returns (uint256[4] memory _amountOutMin) {
        uint256 totalSupply;
        for (uint256 i = 0; i < _poolTokens.length; i++) {
            uint256 decimalDiff10 = _get18Decimals(_poolTokens[i]);
            totalSupply +=
                IERC20(_poolTokens[i]).balanceOf(_poolAddress) *
                decimalDiff10;
        }

        for (uint256 i = 0; i < _poolTokens.length; i++) {
            uint256 decimalDiff10 = _get18Decimals(_poolTokens[i]);
            uint256 percent = (IERC20(_poolTokens[i]).balanceOf(_poolAddress) *
                decimalDiff10 *
                10) / totalSupply;
            _amountOutMin[i] =
                (percent *
                    _amountOut *
                    ICurvePool(_poolAddress).get_virtual_price()) /
                (decimalDiff10 * 1e19);
        }
    }

    /**
     * @notice Set the new address and the new % for the zapper fees
     * @param _newAddressFee: the address where to send the zapper fees
     * @param _newVauleFee: the fee percentage for each transaction
     * @dev This function is only callable by owner.
     */
    function setOneclickFee(
        address _newAddressFee,
        uint256 _newVauleFee
    ) external {
        _onlyTimeLockController();

        require(
            _newAddressFee != address(0),
            "OneClick: Fee Address not allowed"
        );
        require(
            _newVauleFee >= 0 && _newVauleFee <= oneClickFeeMax,
            "OneClick: Fee Value not allowed"
        );
        oneClickFeeAddress = _newAddressFee;
        oneClickFee = _newVauleFee;
    }

    /**
     * @notice Change TimeLockController address
     * @notice Can only be changed by owner itself
     * @param _timeLockController: the new address of the TimeLockController
     * @dev This function is only callable by owner.
     */
    function setTimeLockController(
        address _timeLockController
    ) public onlyOwner {
        timeLockController = _timeLockController;
    }

    /**
     * @notice It allows the owner to recover wrong tokens sent to the contract
     * @param _token: the address of the token to withdraw (18 decimals)
     * @param _amount: the number of token amount to withdraw
     * @dev This function is only callable by owner.
     */
    function recoverTokens(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(msg.sender, _amount);
        emit TokenRecovery(_token, _amount);
    }

    /* --------------------------- Internal functions --------------------------- */

    function _OneClickIn(
        address[][] memory _routev2,
        bytes[] memory _routev3,
        address _tokenIn,
        address _poolAddress,
        address _tokenAddress,
        address[] memory _poolTokens,
        address _vault,
        uint256 _amountIn,
        uint256 _crvSlippage,
        bool _oneToken,
        uint256 _indexIn
    ) internal returns (uint256) {
        uint256 amountIn = _fee(_tokenIn, _amountIn);

        uint256 lpAmount;

        // If you intend to deposit only one token
        if (_oneToken) {
            require(
                _indexIn <= _poolTokens.length,
                "OneClick: index out of range"
            );

            // If the input token is directly the one to be deposited --> deposit
            if (_tokenIn == _poolTokens[_indexIn]) {
                if (_poolTokens.length == 2) {
                    uint256[2] memory amounts;
                    amounts[_indexIn] = amountIn;

                    lpAmount = _add_liquidity(
                        _poolAddress,
                        _tokenAddress,
                        _poolTokens,
                        _vault,
                        amounts,
                        _crvSlippage
                    );
                } else if (_poolTokens.length == 3) {
                    uint256[3] memory amounts;
                    amounts[_indexIn] = amountIn;

                    lpAmount = _add_liquidity(
                        _poolAddress,
                        _tokenAddress,
                        _poolTokens,
                        _vault,
                        amounts,
                        _crvSlippage
                    );
                } else if (_poolTokens.length == 4) {
                    uint256[4] memory amounts;
                    amounts[_indexIn] = amountIn;

                    lpAmount = _add_liquidity(
                        _poolAddress,
                        _tokenAddress,
                        _poolTokens,
                        _vault,
                        amounts,
                        _crvSlippage
                    );
                }
            } else {
                address[][] memory ruotev2 = _routev2;
                bytes[] memory ruotev3 = _routev3;
                // If the input token does not match the one you want to deposit --> Swap --> Deposit
                uint256 swapedAmounts;
                if (ruotev3[0].length > 0) {
                    swapedAmounts = _swapV3(_tokenIn, ruotev3[0], amountIn, 1);
                } else {
                    _approveToken(_tokenIn, routerAddress02, amountIn);

                    swapedAmounts = _swapV2(_tokenIn, ruotev2[0], amountIn, 1);
                }

                if (_poolTokens.length == 2) {
                    uint256[2] memory amounts;
                    amounts[_indexIn] = swapedAmounts;

                    lpAmount = _add_liquidity(
                        _poolAddress,
                        _tokenAddress,
                        _poolTokens,
                        _vault,
                        amounts,
                        _crvSlippage
                    );
                } else if (_poolTokens.length == 3) {
                    uint256[3] memory amounts;
                    amounts[_indexIn] = swapedAmounts;

                    lpAmount = _add_liquidity(
                        _poolAddress,
                        _tokenAddress,
                        _poolTokens,
                        _vault,
                        amounts,
                        _crvSlippage
                    );
                } else if (_poolTokens.length == 4) {
                    uint256[4] memory amounts;
                    amounts[_indexIn] = swapedAmounts;

                    lpAmount = _add_liquidity(
                        _poolAddress,
                        _tokenAddress,
                        _poolTokens,
                        _vault,
                        amounts,
                        _crvSlippage
                    );
                }
            }
        }
        // If the input token deposit in equal parts to the pool
        else {
            require(
                _routev2.length <= _poolTokens.length ||
                    _routev3.length <= _poolTokens.length ||
                    _routev2.length + _routev3.length <= _poolTokens.length,
                "OneClick: route path not match"
            );
            address[][] memory ruotev2 = _routev2;
            bytes[] memory ruotev3 = _routev3;
            address tokenIn = _tokenIn;

            address poolAddress = _poolAddress;
            address tokenAddress = _tokenAddress;
            address[] memory poolTokens = _poolTokens;
            address vault = _vault;

            uint256 swapAmount = amountIn / poolTokens.length;
            uint256 crvSlippage = _crvSlippage;

            if (poolTokens.length == 2) {
                uint256[2] memory amounts;
                lpAmount = _swapAndDeposit(
                    ruotev2,
                    ruotev3,
                    tokenIn,
                    poolAddress,
                    tokenAddress,
                    poolTokens,
                    vault,
                    swapAmount,
                    amounts,
                    crvSlippage
                );
            } else if (poolTokens.length == 3) {
                uint256[3] memory amounts;
                lpAmount = _swapAndDeposit(
                    ruotev2,
                    ruotev3,
                    tokenIn,
                    poolAddress,
                    tokenAddress,
                    poolTokens,
                    vault,
                    swapAmount,
                    amounts,
                    crvSlippage
                );
            } else if (poolTokens.length == 4) {
                uint256[4] memory amounts;
                lpAmount = _swapAndDeposit(
                    ruotev2,
                    ruotev3,
                    tokenIn,
                    poolAddress,
                    tokenAddress,
                    poolTokens,
                    vault,
                    swapAmount,
                    amounts,
                    crvSlippage
                );
            }
        }
        return lpAmount;
    }

    function _OneClickOut(
        address[][] memory _routev2,
        bytes[] memory _routev3,
        address _poolAddress,
        address _tokenAddress,
        address[] memory _poolTokens,
        address _vault,
        address _tokenOut,
        uint256 _amountOut
    ) internal returns (uint256 tokeOutAmount) {
        uint256 lpAmount = ISCompVault(_vault).withdrawOneClick(
            _amountOut,
            address(this)
        );

        if (_tokenOut == _tokenAddress) {
            if (_poolTokens.length == 2) {
                uint256[2] memory amountOutMin = getAmountOutMin2(
                    _poolAddress,
                    _poolTokens,
                    _amountOut
                );
                ICurvePool(_poolAddress).remove_liquidity(
                    _amountOut,
                    amountOutMin
                );
            } else if (_poolTokens.length == 3) {
                uint256[3] memory amountOutMin = getAmountOutMin3(
                    _poolAddress,
                    _poolTokens,
                    _amountOut
                );
                ICurvePool(_poolAddress).remove_liquidity(
                    _amountOut,
                    amountOutMin
                );
            } else if (_poolTokens.length == 4) {
                uint256[4] memory amountOutMin = getAmountOutMin4(
                    _poolAddress,
                    _poolTokens,
                    _amountOut
                );
                ICurvePool(_poolAddress).remove_liquidity(
                    _amountOut,
                    amountOutMin
                );
            }
        } else {
            if (_poolTokens.length == 2) {
                uint256[2] memory amountOutMin = getAmountOutMin2(
                    _poolAddress,
                    _poolTokens,
                    _amountOut
                );
                tokeOutAmount = _removeAndSwap(
                    _routev2,
                    _routev3,
                    _poolAddress,
                    _poolTokens,
                    _tokenOut,
                    lpAmount,
                    amountOutMin
                );
            } else if (_poolTokens.length == 3) {
                uint256[3] memory amountOutMin = getAmountOutMin3(
                    _poolAddress,
                    _poolTokens,
                    _amountOut
                );
                tokeOutAmount = _removeAndSwap(
                    _routev2,
                    _routev3,
                    _poolAddress,
                    _poolTokens,
                    _tokenOut,
                    lpAmount,
                    amountOutMin
                );
            } else if (_poolTokens.length == 4) {
                uint256[4] memory amountOutMin = getAmountOutMin4(
                    _poolAddress,
                    _poolTokens,
                    _amountOut
                );
                tokeOutAmount = _removeAndSwap(
                    _routev2,
                    _routev3,
                    _poolAddress,
                    _poolTokens,
                    _tokenOut,
                    lpAmount,
                    amountOutMin
                );
            }
        }
        return tokeOutAmount;
    }

    function _swapAndDeposit(
        address[][] memory _routev2,
        bytes[] memory _routev3,
        address _tokenIn,
        address _poolAddress,
        address _tokenAddress,
        address[] memory _poolTokens,
        address _vault,
        uint256 _swapAmount,
        uint256[2] memory _amounts,
        uint256 _slippage
    ) internal returns (uint256) {
        for (uint256 i = 0; i < _poolTokens.length; i++) {
            // If token in does not match token[i] of pool
            if (_tokenIn == _poolTokens[i]) {
                _amounts[i] = _swapAmount;
            }
        }

        if (_routev3.length > 0) {
            for (uint256 i = 0; i < _routev3.length; i++) {
                _amounts[_getIndexV3(_routev3[i], _poolTokens)] = _swapV3(
                    _tokenIn,
                    _routev3[i],
                    _swapAmount,
                    1
                );
            }
        }
        if (_routev2.length > 0) {
            for (uint256 i = 0; i < _routev2.length; i++) {
                if (_routev2[i].length > 0)
                    _amounts[_getIndexV2(_routev2[i], _poolTokens)] = _swapV2(
                        _tokenIn,
                        _routev2[i],
                        _swapAmount,
                        1
                    );
            }
        }

        return
            _add_liquidity(
                _poolAddress,
                _tokenAddress,
                _poolTokens,
                _vault,
                _amounts,
                _slippage
            );
    }

    function _swapAndDeposit(
        address[][] memory _routev2,
        bytes[] memory _routev3,
        address _tokenIn,
        address _poolAddress,
        address _tokenAddress,
        address[] memory _poolTokens,
        address _vault,
        uint256 _swapAmount,
        uint256[3] memory _amounts,
        uint256 _slippage
    ) internal returns (uint256) {
        for (uint256 i = 0; i < _poolTokens.length; i++) {
            // If token in does not match token[i] of pool
            if (_tokenIn == _poolTokens[i]) {
                _amounts[i] = _swapAmount;
            }
        }

        if (_routev3.length > 0) {
            for (uint256 i = 0; i < _routev3.length; i++) {
                _amounts[_getIndexV3(_routev3[i], _poolTokens)] = _swapV3(
                    _tokenIn,
                    _routev3[i],
                    _swapAmount,
                    1
                );
            }
        }
        if (_routev2.length > 0) {
            for (uint256 i = 0; i < _routev2.length; i++) {
                if (_routev2[i].length > 0)
                    _amounts[_getIndexV2(_routev2[i], _poolTokens)] = _swapV2(
                        _tokenIn,
                        _routev2[i],
                        _swapAmount,
                        1
                    );
            }
        }

        return
            _add_liquidity(
                _poolAddress,
                _tokenAddress,
                _poolTokens,
                _vault,
                _amounts,
                _slippage
            );
    }

    function _swapAndDeposit(
        address[][] memory _routev2,
        bytes[] memory _routev3,
        address _tokenIn,
        address _poolAddress,
        address _tokenAddress,
        address[] memory _poolTokens,
        address _vault,
        uint256 _swapAmount,
        uint256[4] memory _amounts,
        uint256 _slippage
    ) internal returns (uint256) {
        for (uint256 i = 0; i < _poolTokens.length; i++) {
            // If token in does not match token[i] of pool
            if (_tokenIn == _poolTokens[i]) {
                _amounts[i] = _swapAmount;
            }
        }

        if (_routev3.length > 0) {
            for (uint256 i = 0; i < _routev3.length; i++) {
                _amounts[_getIndexV3(_routev3[i], _poolTokens)] = _swapV3(
                    _tokenIn,
                    _routev3[i],
                    _swapAmount,
                    1
                );
            }
        }
        if (_routev2.length > 0) {
            for (uint256 i = 0; i < _routev2.length; i++) {
                if (_routev2[i].length > 0)
                    _amounts[_getIndexV2(_routev2[i], _poolTokens)] = _swapV2(
                        _tokenIn,
                        _routev2[i],
                        _swapAmount,
                        1
                    );
            }
        }

        return
            _add_liquidity(
                _poolAddress,
                _tokenAddress,
                _poolTokens,
                _vault,
                _amounts,
                _slippage
            );
    }

    function _add_liquidity(
        address _poolAddress,
        address _tokenAddress,
        address[] memory _poolTokens,
        address _vault,
        uint256[2] memory _amounts,
        uint256 _slippage
    ) internal returns (uint256) {
        _approveToken(_poolTokens[0], _poolAddress, _amounts[0]);
        _approveToken(_poolTokens[1], _poolAddress, _amounts[1]);

        uint256 slippage = (ICurvePool(_poolAddress).calc_token_amount(
            _amounts,
            true
        ) * _slippage) / oneClickFeeMax;
        uint256 amountOutMin = ICurvePool(_poolAddress).calc_token_amount(
            _amounts,
            true
        ) - slippage;

        ICurvePool(_poolAddress).add_liquidity(_amounts, amountOutMin);

        _approveToken(
            _tokenAddress,
            _vault,
            IERC20(_tokenAddress).balanceOf(address(this))
        );

        return ISCompVault(_vault).depositAllFor(msg.sender);
    }

    function _add_liquidity(
        address _poolAddress,
        address _tokenAddress,
        address[] memory _poolTokens,
        address _vault,
        uint256[3] memory _amounts,
        uint256 _slippage
    ) internal returns (uint256) {
        _approveToken(_poolTokens[0], _poolAddress, _amounts[0]);
        _approveToken(_poolTokens[1], _poolAddress, _amounts[1]);
        _approveToken(_poolTokens[2], _poolAddress, _amounts[2]);

        uint256 slippage = (ICurvePool(_poolAddress).calc_token_amount(
            _amounts,
            true
        ) * _slippage) / oneClickFeeMax;
        uint256 amountOutMin = ICurvePool(_poolAddress).calc_token_amount(
            _amounts,
            true
        ) - slippage;
        ICurvePool(_poolAddress).add_liquidity(_amounts, amountOutMin);

        _approveToken(
            _tokenAddress,
            _vault,
            IERC20(_tokenAddress).balanceOf(address(this))
        );

        return ISCompVault(_vault).depositAllFor(msg.sender);
    }

    function _add_liquidity(
        address _poolAddress,
        address _tokenAddress,
        address[] memory _poolTokens,
        address _vault,
        uint256[4] memory _amounts,
        uint256 _slippage
    ) internal returns (uint256) {
        _approveToken(_poolTokens[0], _poolAddress, _amounts[0]);
        _approveToken(_poolTokens[1], _poolAddress, _amounts[1]);
        _approveToken(_poolTokens[2], _poolAddress, _amounts[2]);
        _approveToken(_poolTokens[3], _poolAddress, _amounts[3]);

        uint256 slippage = (ICurvePool(_poolAddress).calc_token_amount(
            _amounts,
            true
        ) * _slippage) / oneClickFeeMax;
        uint256 amountOutMin = ICurvePool(_poolAddress).calc_token_amount(
            _amounts,
            true
        ) - slippage;
        ICurvePool(_poolAddress).add_liquidity(_amounts, amountOutMin);

        _approveToken(
            _tokenAddress,
            _vault,
            IERC20(_tokenAddress).balanceOf(address(this))
        );

        return ISCompVault(_vault).depositAllFor(msg.sender);
    }

    function _removeAndSwap(
        address[][] memory _routev2,
        bytes[] memory _routev3,
        address _poolAddress,
        address[] memory _poolTokens,
        address _tokenOut,
        uint256 _amountOut,
        uint256[2] memory _amountOutMin
    ) internal returns (uint256) {
        ICurvePool(_poolAddress).remove_liquidity(_amountOut, _amountOutMin);

        uint256 amount;
        for (uint256 i = 0; i < _poolTokens.length; i++) {
            if (_tokenOut == _poolTokens[i]) {
                amount += IERC20(_poolTokens[i]).balanceOf(address(this));
            }
        }

        if (_routev3.length > 0) {
            for (uint256 i = 0; i < _routev3.length; i++) {
                amount += _swapV3(
                    _getAddress(_routev3[i], 0),
                    _routev3[i],
                    IERC20(_getAddress(_routev3[i], 0)).balanceOf(
                        address(this)
                    ),
                    1
                );
            }
        }
        if (_routev2.length > 0) {
            for (uint256 i = 0; i < _routev2.length; i++) {
                if (_routev2[i].length > 0)
                    amount += _swapV2(
                        _routev2[i][0],
                        _routev2[i],
                        IERC20(_routev2[i][0]).balanceOf(address(this)),
                        1
                    );
            }
        }

        return amount;
    }

    function _removeAndSwap(
        address[][] memory _routev2,
        bytes[] memory _routev3,
        address _poolAddress,
        address[] memory _poolTokens,
        address _tokenOut,
        uint256 _amountOut,
        uint256[3] memory _amountOutMin
    ) internal returns (uint256) {
        ICurvePool(_poolAddress).remove_liquidity(_amountOut, _amountOutMin);

        uint256 amount;
        for (uint256 i = 0; i < _poolTokens.length; i++) {
            if (_tokenOut == _poolTokens[i]) {
                amount += IERC20(_poolTokens[i]).balanceOf(address(this));
            }
        }

        if (_routev3.length > 0) {
            for (uint256 i = 0; i < _routev3.length; i++) {
                amount += _swapV3(
                    _getAddress(_routev3[i], 0),
                    _routev3[i],
                    IERC20(_getAddress(_routev3[i], 0)).balanceOf(
                        address(this)
                    ),
                    1
                );
            }
        }
        if (_routev2.length > 0) {
            for (uint256 i = 0; i < _routev2.length; i++) {
                if (_routev2[i].length > 0)
                    amount += _swapV2(
                        _routev2[i][0],
                        _routev2[i],
                        IERC20(_routev2[i][0]).balanceOf(address(this)),
                        1
                    );
            }
        }

        return amount;
    }

    function _removeAndSwap(
        address[][] memory _routev2,
        bytes[] memory _routev3,
        address _poolAddress,
        address[] memory _poolTokens,
        address _tokenOut,
        uint256 _amountOut,
        uint256[4] memory _amountOutMin
    ) internal returns (uint256) {
        ICurvePool(_poolAddress).remove_liquidity(_amountOut, _amountOutMin);

        uint256 amount;
        for (uint256 i = 0; i < _poolTokens.length; i++) {
            if (_tokenOut == _poolTokens[i]) {
                amount += IERC20(_poolTokens[i]).balanceOf(address(this));
            }
        }

        if (_routev3.length > 0) {
            for (uint256 i = 0; i < _routev3.length; i++) {
                amount += _swapV3(
                    _getAddress(_routev3[i], 0),
                    _routev3[i],
                    IERC20(_getAddress(_routev3[i], 0)).balanceOf(
                        address(this)
                    ),
                    1
                );
            }
        }
        if (_routev2.length > 0) {
            for (uint256 i = 0; i < _routev2.length; i++) {
                if (_routev2[i].length > 0)
                    amount += _swapV2(
                        _routev2[i][0],
                        _routev2[i],
                        IERC20(_routev2[i][0]).balanceOf(address(this)),
                        1
                    );
            }
        }

        return amount;
    }

    function _swapV3(
        address _tokenIn,
        bytes memory _route,
        uint256 _amountIn,
        uint256 _amountOutMin
    ) internal returns (uint256) {
        _approveToken(_tokenIn, routerAddress03, _amountIn);

        ISwapRouter.ExactInputParams memory params = ISwapRouter
            .ExactInputParams({
                path: _route,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: _amountIn,
                amountOutMinimum: _amountOutMin
            });

        return swapRouter.exactInput(params);
    }

    function _swapV2(
        address _tokenIn,
        address[] memory _route,
        uint256 _amountIn,
        uint256 _amountOutMin
    ) internal returns (uint256) {
        _approveToken(_tokenIn, routerAddress02, _amountIn);

        uint256[] memory swapedAmounts = router.swapExactTokensForTokens(
            _amountIn,
            _amountOutMin,
            _route,
            address(this),
            block.timestamp
        );

        return swapedAmounts[swapedAmounts.length - 1];
    }

    function _getIndexV3(
        bytes memory _routev3,
        address[] memory _poolTokens
    ) internal pure returns (uint256 i) {
        for (i = 0; i < _poolTokens.length; i++) {
            //The length of the bytes encoded address is 20 bytes
            if (_poolTokens[i] == _getAddress(_routev3, _routev3.length - 20)) {
                return i;
            }
        }
    }

    function _getIndexV2(
        address[] memory _routev2,
        address[] memory _poolTokens
    ) internal pure returns (uint256 i) {
        for (i = 0; i < _poolTokens.length; i++) {
            if (_poolTokens[i] == _routev2[_routev2.length - 1]) {
                return i;
            }
        }
    }

    function _getAddress(
        bytes memory _bytes,
        uint256 _start
    ) internal pure returns (address) {
        require(_start + 20 >= _start, "toAddress_overflow");
        require(_bytes.length >= _start + 20, "toAddress_outOfBounds");
        address tempAddress;

        assembly {
            tempAddress := div(
                mload(add(add(_bytes, 0x20), _start)),
                0x1000000000000000000000000
            )
        }

        return tempAddress;
    }

    function _get18Decimals(address _token) internal view returns (uint256) {
        return 10 ** (18 - IERC20Metadata(_token).decimals());
    }

    function _fee(
        address _tokenAddress,
        uint256 _amountIn
    ) internal returns (uint256) {
        uint256 fee = (_amountIn * oneClickFee) / oneClickFeeMax;
        IERC20(_tokenAddress).safeTransfer(oneClickFeeAddress, fee);
        return _amountIn - fee;
    }

    function _onlyTimeLockController() internal view {
        require(
            msg.sender == timeLockController,
            "Time Lock Controller: Only Time Lock Controller"
        );
    }

    function _approveToken(
        address _token,
        address _spender,
        uint256 _amountIn
    ) internal {
        IERC20 token = IERC20(_token);
        if (token.allowance(address(this), _spender) < _amountIn) {
            IERC20(_token).safeApprove(_spender, 0);
            IERC20(_token).safeApprove(_spender, maxInt);
        }
    }
}
