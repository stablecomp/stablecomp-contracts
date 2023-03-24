// SPDX-License-Identifier: ISC

pragma solidity ^0.8.13;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./BaseSwapper.sol";
import "../interface/ICurveRegistryAddressProvider.sol";
import "../interface/ICurveRegistry.sol";
import "../interface/ICurveFi_V1_0.sol";

/*
    Expands swapping functionality over base strategy
    - ETH in and ETH out Variants
    - Sushiswap support in addition to Uniswap
*/
contract CurveSwapper_V1_0 is BaseSwapper {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    address public constant addressProvider =
    0x0000000022D53366457F9d5E68Ec105046FC4383;

    uint256 public constant registryId = 0;
    uint256 public constant metaPoolFactoryId = 3;

    function _exchange(
        address _from,
        address _to,
        uint256 _dx,
        uint256 _min_dy,
        uint256 _index,
        bool _isFactoryPool
    ) internal {
        address poolRegistry =
        ICurveRegistryAddressProvider(addressProvider).get_address(
            _isFactoryPool ? metaPoolFactoryId : registryId
        );
        address poolAddress =
        ICurveRegistry(poolRegistry).find_pool_for_coins(
            _from,
            _to,
            _index
        );

        if (poolAddress != address(0)) {
            _safeApproveHelper(_from, poolAddress, _dx);
            (int128 i, int128 j, ) =
            ICurveRegistry(poolRegistry).get_coin_indices(
                poolAddress,
                _from,
                _to
            );
            ICurveFi_V1_0(poolAddress).exchange(i, j, _dx, _min_dy);
        }
    }

    function _add_liquidity_single_coin(
        address swap,
        address inputToken,
        uint256 inputAmount,
        uint256 inputPosition,
        uint256 numPoolElements,
        uint256 min_mint_amount
    ) internal {
        _safeApproveHelper(inputToken, swap, inputAmount);
        if (numPoolElements == 2) {
            uint256[2] memory convertedAmounts;
            convertedAmounts[inputPosition] = inputAmount;
            ICurveFi_V1_0(swap).add_liquidity(convertedAmounts, min_mint_amount);
        } else if (numPoolElements == 3) {
            uint256[3] memory convertedAmounts;
            convertedAmounts[inputPosition] = inputAmount;
            ICurveFi_V1_0(swap).add_liquidity(convertedAmounts, min_mint_amount);
        } else if (numPoolElements == 4) {
            uint256[4] memory convertedAmounts;
            convertedAmounts[inputPosition] = inputAmount;
            ICurveFi_V1_0(swap).add_liquidity(convertedAmounts, min_mint_amount);
        } else {
            revert("Bad numPoolElements");
        }
    }

    function _add_liquidity(
        address pool,
        uint256[2] memory amounts,
        uint256 min_mint_amount
    ) internal {
        ICurveFi_V1_0(pool).add_liquidity(amounts, min_mint_amount);
    }

    function _add_liquidity(
        address pool,
        uint256[3] memory amounts,
        uint256 min_mint_amount
    ) internal {
        ICurveFi_V1_0(pool).add_liquidity(amounts, min_mint_amount);
    }

    function _add_liquidity_4coins(
        address pool,
        uint256[4] memory amounts,
        uint256 min_mint_amount
    ) internal {
        ICurveFi_V1_0(pool).add_liquidity(amounts, min_mint_amount);
    }

    function _remove_liquidity_one_coin(
        address swap,
        uint256 _token_amount,
        int128 i,
        uint256 _min_amount
    ) internal {
        ICurveFi_V1_0(swap).remove_liquidity_one_coin(_token_amount, i, _min_amount);
    }
}
