
pragma solidity ^0.8.13;

interface IBadgerGeyser {
    function stake(address) external returns (uint256);

    function signalTokenLock(
        address token,
        uint256 amount,
        uint256 durationSec,
        uint256 startTime
    ) external;

    function modifyTokenLock(
        address token,
        uint256 index,
        uint256 amount,
        uint256 durationSec,
        uint256 startTime
    ) external;
}
