pragma solidity ^0.8.13;

// File: BadgerGuestlistApi.sol

interface BadgerGuestListAPI {
    function authorized(address guest, uint256 amount, bytes32[] calldata merkleProof) external view returns (bool);
    function setGuests(address[] calldata _guests, bool[] calldata _invited) external;
}
