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

contract TestCheckpoint is AccessControl {

    struct Lock {
        uint256 lockAmount;
        uint256 unlockDate;
    }

    using SafeMath for uint256;
    uint256 PRECISION = 10 ** 18;
    uint256 MAX_LOCK = 2 * 365 * 86400; // 2 years
    uint public WEEK = 7 * 86400;  // all future times are rounded by week

    mapping(address => Lock[]) private tokenLock;

    uint public totLockTime;
    uint public lastLock;
    uint public userDeposited;
    uint public userExpired;
    mapping(uint => uint) public weekToLockExpired;
    mapping(address => bool) public isUserDeposited;
    mapping(address => uint) public userLockExpired;

    event Deposit(address, uint256);
    event Withdraw(address, uint256);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        lastLock = block.timestamp;
    }

    function deposit(uint256 amount, uint256 lockTime) public returns (bool) {
        require(lockTime > block.timestamp, "locktime is not valid");
        if(lockTime >= block.timestamp.add(MAX_LOCK)) {
            lockTime = block.timestamp.add(MAX_LOCK);
        }
        lockTime = (lockTime / WEEK) * WEEK;  // Locktime is rounded down to weeks
        uint oldLockTime;

        if (userLockExpired[msg.sender] > 0) {
            oldLockTime = userLockExpired[msg.sender];
        } else {
            userDeposited += 1;
        }

        userLockExpired[msg.sender] = lockTime;
        if(oldLockTime != lockTime) {
            weekToLockExpired[lockTime] += 1;
        }

        if(!isUserDeposited[msg.sender]){
            userDeposited += 1;
            isUserDeposited[msg.sender] = true;
        } else {

        }

        checkpoint(amount, lockTime);
        return true;
    }

    function checkpoint(uint _adepositmount, uint _lockTime) internal {
        totLockTime += (_lockTime - block.timestamp);

        uint temp = block.timestamp - lastLock;
        uint weekToCheck = ((block.timestamp - lastLock) / WEEK);

        for ( uint i = 0; i < weekToCheck ; i++) {
            userExpired += weekToLockExpired[lastLock + WEEK*i];
        }

        lastLock = (block.timestamp / WEEK) * WEEK;
    }

}
