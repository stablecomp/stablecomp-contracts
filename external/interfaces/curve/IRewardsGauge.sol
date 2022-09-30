// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

interface IRewardsGauge {
    function balanceOf(address account) external view returns (uint256);
    function claimable_reward(address _addr, address _token) external view returns (uint256);
    function claimable_tokens(address _addr) external view returns (uint256);
    function claim_rewards(address _addr) external;
    function deposit(uint256 _value) external;
    function deposit(uint256 _value, address _addr) external;
    function withdraw(uint256 _value) external;
    function reward_contract() external view returns (address);
}
