// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../abstract/BaseStrategy.sol";

import "../utility/CurveSwapper.sol";
import "../utility/TokenSwapPathRegistry.sol";
import "../utility/UniswapSwapper.sol";

import "../interface/ICrvDepositor.sol";
import "../interface/IBooster.sol";

import "../interface/IBaseRewardsPool.sol";
import "../interface/ICvxRewardsPool.sol";
import "../interface/ISettV4.sol";
import "../interface/IStaker.sol";
import "../interface/ICurveGauge.sol";

pragma experimental ABIEncoderV2;

/*
    === Deposit ===
    Deposit & Stake underlying asset into appropriate convex vault (deposit + stake is atomic)

    === Tend ===

    == Stage 1: Realize gains from all positions ==
    Harvest CRV and CVX from core vault rewards pool
    Harvest CVX and SUSHI from CVX/ETH LP
    Harvest CVX and SUSHI from cvxCRV/CRV LP

    Harvested coins:
    CRV
    CVX
    SUSHI

    == Stage 2: Deposit all gains into staked positions ==
    Zap all CRV -> cvxCRV/CRV
    Zap all CVX -> CVX/ETH
    Stake Sushi

    Position coins:
    cvxCRV/CRV
    CVX/ETH
    xSushi

    These position coins will be distributed on harvest


    Changelog:

    V1.1
    * Implemented the _exchange function from the CurveSwapper library to perform the CRV -> cvxCRV and vice versa
    swaps through curve instead of Sushiswap.
    * It now swaps 3CRV into CRV instead of cvxCRV. If enough is aquired, it swaps this CRV for wBTC directly and, if not,
    it swaps some cvxCRV for CRV to compensate.
    * Removed some unused functions and variables such as the `addExtraRewardsToken` and `removeExtraRewardsToken` functions
    as well as the obsolete swapping paths.
    V1.2
    * Removed unused Code
    * Changed to purchase bveCVX via Curve Factory Pool

    sComp updated:
    v1.0
    - Remove keeper
*/
contract SCompStrategyFraxusdcv1 is
BaseStrategy,
CurveSwapper,
UniswapSwapper,
TokenSwapPathRegistry
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using AddressUpgradeable for address;
    using SafeMathUpgradeable for uint256;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    // ===== Token Registry =====
    address public constant frax = 0x853d955aCEf822Db058eb8505911ED77F175b99e;
    address public constant weth = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant crv = 0xD533a949740bb3306d119CC777fa900bA034cd52;
    address public constant usdc = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

    // todo frax or usdc token
    IERC20Upgradeable public constant wbtcToken =
    IERC20Upgradeable(0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599);
    IERC20Upgradeable public constant fraxToken =
    IERC20Upgradeable(0x853d955aCEf822Db058eb8505911ED77F175b99e);
    IERC20Upgradeable public constant crvToken =
    IERC20Upgradeable(0xD533a949740bb3306d119CC777fa900bA034cd52);

    // ===== Convex Registry =====
    IBooster public constant booster =
    IBooster(0xF403C135812408BFbE8713b5A23a04b3D48AAE31);
    IBaseRewardsPool public baseRewardsPool;

    uint256 public constant MAX_UINT_256 = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;

    uint256 public pid;

    /**
    The default conditions for a rewards token are:
    - Collect rewards token
    - Distribute 100% via Tree to users

    === Harvest Config ===
    - autoCompoundingBps: Sell this % of rewards for underlying asset.
    - autoCompoundingPerfFee: Of the auto compounded portion, take this % as a performance fee.
    - treeDistributionPerfFee: Of the remaining portion (everything not distributed or converted via another mehcanic is distributed via the tree), take this % as a performance fee.

    === Tend Config ===
    - tendConvertTo: On tend, convert some of this token into another asset. By default with value as address(0), skip this step.
    - tendConvertBps: Convert this portion of balance into another asset.
     */

    struct CurvePoolConfig {
        address swap;
        uint256 tokenCompoundPosition;
        uint256 numElements;
    }

    CurvePoolConfig public curvePool;

    uint256 public autoCompoundingBps;
    uint256 public autoCompoundingPerformanceFeeGovernance;

    uint256 public stableSwapSlippageTolerance;
    uint256 public constant crvCvxCrvPoolIndex = 2;

    event PerformanceFeeGovernance(
        address indexed destination,
        address indexed token,
        uint256 amount,
        uint256 indexed blockNumber,
        uint256 timestamp
    );
    event PerformanceFeeStrategist(
        address indexed destination,
        address indexed token,
        uint256 amount,
        uint256 indexed blockNumber,
        uint256 timestamp
    );

    event WithdrawState(
        uint256 toWithdraw,
        uint256 preWant,
        uint256 postWant,
        uint256 withdrawn
    );

    struct TendData {
        uint256 crvTended;
    }

    event TendState(uint256 crvTended);

    function initialize(
        address _governance,
        address _strategist,
        address _controller,
        address _want,
        uint256 _pid,
        uint256[3] memory _feeConfig,
        CurvePoolConfig memory _curvePool
    ) public initializer whenNotPaused {
        __BaseStrategy_init(
            _governance,
            _strategist,
            _controller
        );

        want = _want;

        pid = _pid; // Core staking pool ID

        IBooster.PoolInfo memory poolInfo = booster.poolInfo(pid);
        baseRewardsPool = IBaseRewardsPool(poolInfo.crvRewards);

        performanceFeeGovernance = _feeConfig[0];
        performanceFeeStrategist = _feeConfig[1];
        withdrawalFee = _feeConfig[2];

        // Approvals: Staking Pools
        IERC20Upgradeable(want).approve(address(booster), MAX_UINT_256);

        curvePool = CurvePoolConfig(
            _curvePool.swap,
            _curvePool.tokenCompoundPosition,
            _curvePool.numElements
        );

        // Set Swap Paths
        address[] memory path = new address[](3);
        path[0] = crv;
        path[1] = weth;
        path[2] = frax;
        _setTokenSwapPath(crv, frax, path);

        autoCompoundingBps = 2000;
        autoCompoundingPerformanceFeeGovernance = 5000;

        stableSwapSlippageTolerance = 500;
    }

    /// ===== Permissioned Functions =====
    function setPid(uint256 _pid) external {
        _onlyGovernance();
        pid = _pid; // LP token pool ID
    }

    function setAutoCompoundingBps(uint256 _bps) external {
        _onlyGovernance();
        autoCompoundingBps = _bps;
    }

    function setAutoCompoundingPerformanceFeeGovernance(uint256 _bps) external {
        _onlyGovernance();
        autoCompoundingPerformanceFeeGovernance = _bps;
    }

    function setCurvePoolSwap(address _swap) external {
        _onlyGovernance();
        curvePool.swap = _swap;
    }

    function setstableSwapSlippageTolerance(uint256 _sl) external {
        _onlyGovernance();
        stableSwapSlippageTolerance = _sl;
    }

    /// ===== View Functions =====
    function version() external pure returns (string memory) {
        return "1.0";
    }

    function getName() external pure override returns (string memory) {
        return "StrategySCompFraxusdcv1";
    }

    function balanceOfPool() public view override returns (uint256) {
        return baseRewardsPool.balanceOf(address(this));
    }

    function getProtectedTokens()
    public
    view
    override
    returns (address[] memory)
    {
        address[] memory protectedTokens = new address[](2);
        protectedTokens[0] = want;
        protectedTokens[1] = crv;
        return protectedTokens;
    }

    function isTendable() public pure override returns (bool) {
        return true;
    }

    /// ===== Internal Core Implementations =====
    function _onlyNotProtectedTokens(address _asset) internal override {
        require(address(want) != _asset, "want");
        require(address(crv) != _asset, "crv");
    }

    /// @dev Deposit Badger into the staking contract
    function _deposit(uint256 _want) internal override {
        // Deposit all want in core staking pool
        booster.deposit(pid, _want, true);
    }

    /// @dev Unroll from all strategy positions, and transfer non-core tokens to controller rewards
    function _withdrawAll() internal override {
        baseRewardsPool.withdrawAndUnwrap(balanceOfPool(), false);
        // Note: All want is automatically withdrawn outside this "inner hook" in base strategy function
    }

    /// @dev Withdraw want from staking rewards, using earnings first
    function _withdrawSome(uint256 _amount)
    internal
    override
    returns (uint256)
    {
        // Get idle want in the strategy
        uint256 _preWant = IERC20Upgradeable(want).balanceOf(address(this));

        // If we lack sufficient idle want, withdraw the difference from the strategy position
        if (_preWant < _amount) {
            uint256 _toWithdraw = _amount.sub(_preWant);
            baseRewardsPool.withdrawAndUnwrap(_toWithdraw, false);
        }

        // Confirm how much want we actually end up with
        uint256 _postWant = IERC20Upgradeable(want).balanceOf(address(this));

        // Return the actual amount withdrawn if less than requested
        uint256 _withdrawn = MathUpgradeable.min(_postWant, _amount);
        emit WithdrawState(_amount, _preWant, _postWant, _withdrawn);

        return _withdrawn;
    }

    function _tendGainsFromPositions() internal {
        // Harvest CRV from staking positions
        // Note: Always claim extras
        baseRewardsPool.getReward(address(this), true);
    }

    /// @notice The more frequent the tend, the higher returns will be
    function tend() external whenNotPaused returns (TendData memory) {
        _onlyAuthorizedActors();

        TendData memory tendData;

        // 1. Harvest gains from positions
        _tendGainsFromPositions();

        // Track harvested coins, before conversion
        tendData.crvTended = crvToken.balanceOf(address(this));

        emit Tend(0);
        emit TendState(
            tendData.crvTended
        );
        return tendData;
    }

    // No-op until we optimize harvesting strategy. Auto-compouding is key.
    function harvest() external whenNotPaused returns (uint256) {
        _onlyAuthorizedActors();

        uint256 idleWant = IERC20Upgradeable(want).balanceOf(address(this));
        uint256 totalWantBefore = balanceOf();

        // 1. Withdraw accrued rewards from staking positions (claim unclaimed positions as well)
        baseRewardsPool.getReward(address(this), true);

        uint256 crvBalance;

        // todo compound in frax or usdc
        // 3. Sell 100% of accured rewards for underlying
        uint crvToSell = crvToken.balanceOf(address(this));
        if(crvToSell > 0)  {
            _swapExactTokensForTokens(
                sushiswap,
                crv,
                crvToSell,
                getTokenSwapPath(crv, frax)
            );
        }

        // 4. Roll Frax gained into want position
        uint256 fraxToDeposit = fraxToken.balanceOf(address(this));
        uint256 wantGained;

        if (fraxToDeposit > 0) {
            _add_liquidity_single_coin(
                curvePool.swap,
                want,
                frax,
                fraxToDeposit,
                curvePool.tokenCompoundPosition,
                curvePool.numElements,
                0
            );
            wantGained = IERC20Upgradeable(want).balanceOf(address(this)).sub(
                idleWant
            );
            // Half of gained want (10% of rewards) are auto-compounded, half of gained want is taken as a performance fee
            uint256 autoCompoundedPerformanceFee =
            wantGained.mul(autoCompoundingPerformanceFeeGovernance).div(
                MAX_FEE
            );
            IERC20Upgradeable(want).transfer(
                IController(controller).rewards(),
                autoCompoundedPerformanceFee
            );
            emit PerformanceFeeGovernance(
                IController(controller).rewards(),
                want,
                autoCompoundedPerformanceFee,
                block.number,
                block.timestamp
            );
        }

        // Deposit remaining want (including idle want) into strategy position
        uint256 wantToDeposited =
        IERC20Upgradeable(want).balanceOf(address(this));

        if (wantToDeposited > 0) {
            _deposit(wantToDeposited);
        }

        uint256 totalWantAfter = balanceOf();
        require(totalWantAfter >= totalWantBefore, "want-decreased");

        emit Harvest(wantGained, block.number);
        return wantGained;
    }
}
