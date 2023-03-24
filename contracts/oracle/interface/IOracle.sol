// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.13;

interface IOracle {
    /**
     * @dev returns the asset price in USD, 8 decimal digits.
     */
    function price(address asset) external view returns (uint256);
}
