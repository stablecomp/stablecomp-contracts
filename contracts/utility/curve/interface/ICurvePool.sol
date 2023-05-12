// SPDX-License-Identifier: ISC
pragma solidity ^0.8.13;

interface ICurvePool {
    function get_virtual_price() external view returns (uint256);

    function coins(
        uint256 _index
    ) external view returns (address);

    function calc_token_amount(
        uint256[2] calldata _amounts,
        bool _isDeposit
    ) external view returns (uint256);

    function calc_token_amount(
        uint256[3] calldata _amounts,
        bool _isDeposit
    ) external view returns (uint256);

    function calc_token_amount(
        uint256[4] calldata _amounts,
        bool _isDeposit
    ) external view returns (uint256);

    function add_liquidity(
        uint256[2] calldata _amounts,
        uint256 _min_mint_amount
    ) external;

    function add_liquidity(
        uint256[3] calldata _amounts,
        uint256 _min_mint_amount
    ) external;

    function add_liquidity(
        uint256[4] calldata _amounts,
        uint256 _min_mint_amount
    ) external;

    function calc_withdraw_one_coin(
        uint256 _token_amount,
        int128 i
    ) external view returns (uint256);

    function remove_liquidity_one_coin(
        uint256 _token_amount,
        int128 i,
        uint256 _min_amount
    ) external returns(uint);

    function remove_liquidity_one_coin(
        uint256 _token_amount,
        uint256 i,
        uint256 _min_amount
    ) external returns(uint);

    function remove_liquidity(
        uint256 _amount,
        uint256[2] calldata min_amounts
    ) external;

    function remove_liquidity(
        uint256 _amount,
        uint256[3] calldata min_amounts
    ) external returns(uint[] memory);

    function remove_liquidity(
        uint256 _amount,
        uint256[4] calldata min_amounts
    ) external returns(uint[] memory);

    function remove_liquidity_imbalance(
        uint256[2] calldata min_amounts,
        uint256 _amount
    ) external;

    function remove_liquidity_imbalance(
        uint256 _amount,
        uint256[3] calldata min_amounts
    ) external returns(uint[] memory);

    function remove_liquidity_imbalance(
        uint256 _amount,
        uint256[4] calldata min_amounts
    ) external returns(uint[] memory);
}
