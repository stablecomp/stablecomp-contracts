// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";
import "hardhat/console.sol";

contract VeJDOE is ERC20, ERC20Burnable, AccessControl {

    struct Lock {
        uint256 lockAmount;
        uint256 unlockDate;
    }

    using SafeMath for uint256;
    address public baseToken;
    uint256 PRECISION = 10 ** 18;
    uint256 MAX_LOCK = 2 * 365 * 86400; // 2 years
    uint WEEK = 7 * 86400;  // all future times are rounded by week

    mapping(address => Lock[]) private tokenLock;

    uint public totLockTime;
    uint public lastLock;
    uint userDeposited;
    uint userExpired;
    mapping(uint => uint) weekToLockExpired;

    event Deposit(address, uint256);
    event Withdraw(address, uint256);

    constructor(address _baseToken) ERC20("voting escrow JDOE","veJDOE") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        baseToken = _baseToken;
    }

    function getLocksByAddr(address _addr) public view returns (Lock[] memory) {
        return tokenLock[_addr];
    }

    function deposit(uint256 amount, uint256 lockTime) public returns (bool) {
        require(lockTime > block.timestamp, "locktime is not valid");
        if(lockTime >= block.timestamp.add(MAX_LOCK)) {
            lockTime = block.timestamp.add(MAX_LOCK);
        }
        lockTime = (lockTime / WEEK) * WEEK;  // Locktime is rounded down to weeks
        weekToLockExpired[lockTime] += 1;

        ERC20(baseToken).transferFrom(msg.sender, address(this), amount);
        tokenLock[msg.sender].push(Lock(amount, lockTime));
        _mint(msg.sender, amount);
        emit Deposit(msg.sender, amount);

        return true;
    }

    function checkpoint(uint _lockTime, uint _amount) internal {
        totLockTime += _lockTime;
        lastLock = (block.timestamp / WEEK) * WEEK;

        uint weekToCheck = ((block.timestamp - lastLock) / WEEK) * WEEK;

        for ( uint i = 0; i < weekToCheck ; i++) {
            userExpired += weekToLockExpired[weekToCheck];
        }
    }

    function withdraw(uint256 lockId) public returns (bool) {
        Lock[] storage _locks = tokenLock[msg.sender];
        Lock memory _lock = _locks[lockId];
        require(_lock.unlockDate <= block.timestamp, "locktime is not expired");
        uint256 _lockedAmount = _lock.lockAmount;
        _burn(msg.sender, _lockedAmount);
        ERC20(baseToken).transfer(msg.sender, _lockedAmount);
        _locks[lockId] = _locks[_locks.length - 1];
        _locks.pop();
        emit Withdraw(msg.sender, _lockedAmount);

        return true;
    }

    function lockedBalanceOf(address _addr) public view virtual returns (uint256) {
        Lock[] memory locks = getLocksByAddr(_addr);
        uint256 _lockedBalance = 0;
        for(uint256 i = 0; i < locks.length; i++) {
            _lockedBalance = _lockedBalance.add(locks[i].lockAmount);
        }
        return _lockedBalance;
    }

    function votingPowerOf(address _addr) public view virtual returns (uint256) {
        Lock[] memory locks = getLocksByAddr(_addr);
        uint256 _votingBalance = 0;
        for(uint256 i = 0; i < locks.length; i++) {
            uint256 _unlockDate = locks[i].unlockDate;
            if(block.timestamp >= _unlockDate) continue;
            uint256 _lockAmount = locks[i].lockAmount;
            uint256 _diffNowEndLock = _unlockDate.sub(block.timestamp);
            uint256 _multiplicator = _diffNowEndLock.mul(PRECISION).div(MAX_LOCK);
            uint256 _remainingPower = _lockAmount.mul(_multiplicator).div(PRECISION);
            _votingBalance = _votingBalance.add(_remainingPower);
        }
        return _votingBalance;
    }
}
