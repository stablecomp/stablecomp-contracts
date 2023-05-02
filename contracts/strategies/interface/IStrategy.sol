// SPDX-License-Identifier: ISC

pragma solidity ^0.8.13;

interface IStrategy {
    struct CurvePoolConfig {
        address swap;
        uint256 tokenCompoundPosition;
        uint256 numElements;
    }

    function curvePool() external view returns (CurvePoolConfig memory);

    function want() external view returns (address);

    function deposit() external;

    // NOTE: must exclude any tokens used in the yield
    // Controller role - withdraw should return to Controller
    function withdrawOther(address) external returns (uint256 balance);

    // Controller | Vault role - withdraw should always return to Vault
    function withdraw(uint256) external;

    // Controller | Vault role - withdraw should always return to Vault
    function withdrawAll() external returns (uint256);

    function balanceOf() external view returns (uint256);

    function getName() external pure returns (string memory);

    function setStrategist(address _strategist) external;

    function setWithdrawalFee(uint256 _withdrawalFee) external;

    function setPerformanceFeeStrategist(uint256 _performanceFeeStrategist)
    external;

    function setPerformanceFeeGovernance(uint256 _performanceFeeGovernance)
    external;

    function setGovernance(address _governance) external;

    function setController(address _controller) external;

    function tend() external;

    function harvest() external;
}
