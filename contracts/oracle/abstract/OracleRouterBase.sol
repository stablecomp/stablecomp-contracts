// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.13;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import { IOracle } from "../interface/IOracle.sol";

abstract contract OracleRouterBase is IOracle {
    uint256 constant MIN_DRIFT = uint256(70000000);
    uint256 constant MAX_DRIFT = uint256(130000000);

    /**
     * @dev The price feed contract to use for a particular asset.
     * @param _asset address of the asset
     * @return address address of the price feed for the asset
     * @return uint price set by admin
     * @return bool if asset is stablecoin
     */
    function feed(address _asset) internal view virtual returns (address, uint, bool);

    /**
     * @notice Returns the total price in 8 digit USD for a given asset.
     * @param _asset address of the asset
     * @return uint256 USD price of 1 of the asset, in 8 decimal fixed
     */
    function price(address _asset) external view virtual override returns (uint256) {
        (address feed, uint priceAdmin, bool isStablecoin) = feed(_asset);
        if(feed == address(0)) {
            return priceAdmin;
        }
        (, int256 _iprice, , , ) = AggregatorV3Interface(feed).latestRoundData();
        uint256 _price = uint256(_iprice);
        if (isStablecoin) {
            require(_price <= MAX_DRIFT, "Oracle: Price exceeds max");
            require(_price >= MIN_DRIFT, "Oracle: Price under min");
        }
        return _price;
    }
}
