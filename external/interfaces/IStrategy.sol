/// Copyright (c) 2022 tokens ltd.
/// opensource@tokens.com
/// SPDX-License-Identifier: MIT
/// Licensed under the MIT License;
/// You may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
/// https://github.com/tokens/contracts/blob/main/LICENSE
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.

pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

interface IStrategy {
    function vault() external view returns (address);
    function want() external view returns (IERC20Upgradeable);
    function beforeDeposit() external;
    function deposit() external;
    function withdraw(uint256) external;
    function balanceOf() external view returns (uint256);
    function balanceOfWant() external view returns (uint256);
    function balanceOfPool() external view returns (uint256);
    function harvest() external;
    function retireStrat() external;
    function panic() external;
    function pause() external;
    function unpause() external;
    function paused() external view returns (bool);
    function unirouter() external view returns (address);
}
