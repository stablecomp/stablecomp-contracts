pragma solidity ^0.8.13;

// File: IGac.sol

interface IGac {
    function DEV_MULTISIG() external view returns (address);

    function WAR_ROOM_ACL() external view returns (address);

    function BLACKLISTED_ROLE() external view returns (bytes32);

    function paused() external view returns (bool);

    function transferFromDisabled() external view returns (bool);

    function isBlacklisted(address account) external view returns (bool);

    function unpause() external;

    function pause() external;

    function enableTransferFrom() external;

    function disableTransferFrom() external;

    function grantRole(bytes32 role, address account) external;
}
