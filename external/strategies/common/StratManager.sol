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

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract StratManager is Ownable, Pausable {
  /**
   * @dev tokens Contracts:
   * {vault} - Address of the vault that controls the strategy's funds.
   * {keeper} - Address to manage a few lower risk features of the strat
   * {unirouter} - Address of exchange to execute swaps.
   * {strategist} - Address of the strategy author/deployer where strategist fee will go.
   * {treasuryFeeRecipient} - Address where to send treasury fees.
   **/
  address public vault;
  address public keeper;
  address public unirouter;
  address public strategist;
  address public treasuryFeeRecipient;

  constructor (address _strategist) {
      strategist = _strategist;
  }

  // checks that caller is either owner or keeper.
  modifier onlyManager() {
	require(msg.sender == owner() || msg.sender == keeper, "!manager");
	_;
  }

  /**
   * @dev Updates address of the strat keeper.
   * keeper is used as alternative owner
   * @param _keeper new keeper address.
   **/
  function setKeeper(address _keeper) external onlyManager {
	keeper = _keeper;
  }

  /**
   * @dev Updates address where strategist fee earnings will go.
   * @param _strategist new strategist address.
   **/
  function setStrategist(address _strategist) external {
	require(msg.sender == strategist, "!strategist");
	strategist = _strategist;
  }

  /**
   * @dev Updates router that will be used for swaps.
   * @param _unirouter new unirouter address.
   **/
  function setUnirouter(address _unirouter) external onlyOwner {
	unirouter = _unirouter;
  }

  /**
   * @dev Updates parent vault.
   * @param _vault new vault address.
   **/
  function setVault(address _vault) external onlyOwner {
	vault = _vault;
  }

  /**
   * @dev Updates treasury fee recipient.
   * @param _treasuryFeeRecipient new treasury fee recipient address.
   **/
  function setTreasuryFeeRecipient(address _treasuryFeeRecipient) external onlyOwner {
	treasuryFeeRecipient = _treasuryFeeRecipient;
  }

  /**
   * @dev Function to synchronize balances before new user deposit.
   * Can be overridden in the strategy.
   **/
  function beforeDeposit() external virtual {}
}
