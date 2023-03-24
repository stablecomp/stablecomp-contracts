// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.13;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./abstract/OracleRouterBase.sol";
import { IOracle } from "./interface/IOracle.sol";
import { Helpers } from "./utils/Helpers.sol";

contract OracleRouter is OracleRouterBase {
    mapping(address => address) public assetToFeed;

    function setFeed(address _asset, address _feed) external {
        assetToFeed[_asset] = _feed;
    }

    /**
     * @dev The price feed contract to use for a particular asset.
     * @param asset address of the asset
     */
    function feed(address asset) internal view override returns (address) {
        return assetToFeed[asset];
    }
}
