// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.13;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./abstract/OracleRouterBase.sol";

/**
 * Oracle set to retrieve the price of an asset in dollars with 8 decimals.
 * @dev If feed not exist admin can set a price fixed for the asset
 * @dev When adding a feed for a stablecoin asset, set the '_isStablecoin' variable to true
 *  to enable checking for stablecoins that cannot deviate in price by more than 30% from 1 USD.
 * @dev Use "setFeed(address _asset, address _feed, uint _priceAdmin, bool _isStablecoin)" to add a new asset.
 * @dev Use "price(address _asset)" to retrieve the price of an asset in USD with 8 decimal
 */
contract OracleRouter is OracleRouterBase, Ownable {
    struct FeedStruct {
        address feedAddress;
        uint priceAdmin;
        bool isStablecoin;
    }
    mapping(address => FeedStruct) public assetToFeed;

    function setFeed(address _asset, address _feed, uint _priceAdmin, bool _isStablecoin) external {
        require(_feed == address(0) || _priceAdmin == 0, "cannot set feed and priceAdmin at same time");
        assetToFeed[_asset].feedAddress = _feed;
        assetToFeed[_asset].priceAdmin = _priceAdmin;
        assetToFeed[_asset].isStablecoin = _isStablecoin;
    }

    /**
     * @dev The price feed contract to use for a particular asset and if is a stablecoin.
     * @param _asset address of the asset
     */
    function feed(address _asset) internal view override returns (address, uint, bool) {
        return (assetToFeed[_asset].feedAddress, assetToFeed[_asset].priceAdmin, assetToFeed[_asset].isStablecoin);
    }
}
