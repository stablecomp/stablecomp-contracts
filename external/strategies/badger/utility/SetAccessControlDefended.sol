pragma solidity ^0.8.13;
import "./SetAccessControl.sol";

// File: SettAccessControlDefended.sol

/*
    Add ability to prevent unwanted contract access to Sett permissions
*/
contract SettAccessControlDefended is SettAccessControl {
    mapping (address => bool) public approved;

    function approveContractAccess(address account) external {
        _onlyGovernanceOrStrategist();
        approved[account] = true;
    }

    function revokeContractAccess(address account) external {
        _onlyGovernanceOrStrategist();
        approved[account] = false;
    }

    /**
        Only approved contract or EOA account check
    */
    function _defend() internal view returns (bool) {
        require(approved[msg.sender] || msg.sender == tx.origin, "Access denied for caller");
    }
    uint256[50] private __gap;
}
