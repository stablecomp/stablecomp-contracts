/**
 *Submitted for verification at Etherscan.io on 2022-05-10
*/

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

import "./utility/ERC20Upgradeable.sol";
import "./utility/SetAccessControlDefended.sol";
import "./utility/PausableUpgradeable.sol";
import "./library/SafeERC20Upgradeable.sol";
import "./interface/IGac.sol";
import "./interface/IController.sol";
import "./interface/IERC20Detailed.sol";
import "./interface/BadgerGuestListAPI.sol";

// File: SettV4h.sol

/*
    Source: https://github.com/iearn-finance/yearn-protocol/blob/develop/contracts/vaults/yVault.sol

    Changelog:

    V1.1
    * Strategist no longer has special function calling permissions
    * Version function added to contract
    * All write functions, with the exception of transfer, are pausable
    * Keeper or governance can pause
    * Only governance can unpause

    V1.2
    * Transfer functions are now pausable along with all other non-permissioned write functions
    * All permissioned write functions, with the exception of pause() & unpause(), are pausable as well

    V1.3
    * Add guest list functionality
    * All deposits can be optionally gated by external guestList approval logic on set guestList contract

    V1.4
    * Add depositFor() to deposit on the half of other users. That user will then be blockLocked.
*/

contract SettV4h is ERC20Upgradeable, SettAccessControlDefended, PausableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using AddressUpgradeable for address;
    using SafeMathUpgradeable for uint256;

    address constant public MULTISIG = 0x9faA327AAF1b564B569Cb0Bc0FDAA87052e8d92c;
    IGac public constant GAC = IGac(0x9c58B0D88578cd75154Bdb7C8B013f7157bae35a); // Set in initializer because of tests is unchangeable (because contract is upgradeable)

    IERC20Upgradeable public token;

    uint256 public min;
    uint256 public constant max = 10000;

    address public controller;

    mapping(address => uint256) public blockLock;

    string internal constant _defaultNamePrefix = "Badger Sett ";
    string internal constant _symbolSymbolPrefix = "b";

    address public guardian;

    BadgerGuestListAPI public guestList;

    event FullPricePerShareUpdated(uint256 value, uint256 indexed timestamp, uint256 indexed blockNumber);

    modifier whenNotPaused() override {
        require(!paused(), "Pausable: paused");
        require(!GAC.paused(), "Pausable: GAC Paused");
        _;
    }

    function initialize(
        address _token,
        address _controller,
        address _governance,
        address _keeper,
        address _guardian,
        bool _overrideTokenName,
        string memory _namePrefix,
        string memory _symbolPrefix
    ) public initializer whenNotPaused {
        IERC20Detailed namedToken = IERC20Detailed(_token);
        string memory tokenName = namedToken.name();
        string memory tokenSymbol = namedToken.symbol();

        string memory name;
        string memory symbol;

        if (_overrideTokenName) {
            name = string(abi.encodePacked(_namePrefix, tokenName));
            symbol = string(abi.encodePacked(_symbolPrefix, tokenSymbol));
        } else {
            name = string(abi.encodePacked(_defaultNamePrefix, tokenName));
            symbol = string(abi.encodePacked(_symbolSymbolPrefix, tokenSymbol));
        }

        __ERC20_init(name, symbol);

        token = IERC20Upgradeable(_token);
        governance = _governance;
        strategist = address(0);
        keeper = _keeper;
        controller = _controller;
        guardian = _guardian;

        min = 9500;

        emit FullPricePerShareUpdated(getPricePerFullShare(), block.timestamp, block.number);

        // Paused on launch
        _pause();
    }

    /// ===== Modifiers =====

    function _onlyController() internal view {
        require(msg.sender == controller, "onlyController");
    }

    function _onlyAuthorizedPausers() internal view {
        require(msg.sender == guardian || msg.sender == governance, "onlyPausers");
    }

    function _blockLocked() internal view {
        require(blockLock[msg.sender] < block.number, "blockLocked");
    }

    function _blacklisted(address _account) internal view {
        require(!GAC.isBlacklisted(_account), "blacklisted");
    }

    /// ===== View Functions =====

    function version() public view returns (string memory) {
        return "1.4h - Hack Amended";
    }

    function getPricePerFullShare() public virtual view returns (uint256) {
        if (totalSupply() == 0) {
            return 1e18;
        }
        return balance().mul(1e18).div(totalSupply());
    }

    /// @notice Return the total balance of the underlying token within the system
    /// @notice Sums the balance in the Sett, the Controller, and the Strategy
    function balance() public virtual view returns (uint256) {
        return token.balanceOf(address(this)).add(IController(controller).balanceOf(address(token)));
    }

    /// @notice Defines how much of the Setts' underlying can be borrowed by the Strategy for use
    /// @notice Custom logic in here for how much the vault allows to be borrowed
    /// @notice Sets minimum required on-hand to keep small withdrawals cheap
    function available() public virtual view returns (uint256) {
        return token.balanceOf(address(this)).mul(min).div(max);
    }

    /// ===== Public Actions =====

    /// @notice Deposit assets into the Sett, and return corresponding shares to the user
    /// @notice Only callable by EOA accounts that pass the _defend() check
    function deposit(uint256 _amount) public whenNotPaused {
        _defend();
        _blockLocked();
        _blacklisted(msg.sender);

        _lockForBlock(msg.sender);
        _depositWithAuthorization(_amount, new bytes32[](0));
    }

    /// @notice Deposit variant with proof for merkle guest list
    function deposit(uint256 _amount, bytes32[] memory proof) public whenNotPaused {
        _defend();
        _blockLocked();
        _blacklisted(msg.sender);

        _lockForBlock(msg.sender);
        _depositWithAuthorization(_amount, proof);
    }

    /// @notice Convenience function: Deposit entire balance of asset into the Sett, and return corresponding shares to the user
    /// @notice Only callable by EOA accounts that pass the _defend() check
    function depositAll() external whenNotPaused {
        _defend();
        _blockLocked();
        _blacklisted(msg.sender);

        _lockForBlock(msg.sender);
        _depositWithAuthorization(token.balanceOf(msg.sender), new bytes32[](0));
    }

    /// @notice DepositAll variant with proof for merkle guest list
    function depositAll(bytes32[] memory proof) external whenNotPaused {
        _defend();
        _blockLocked();
        _blacklisted(msg.sender);

        _lockForBlock(msg.sender);
        _depositWithAuthorization(token.balanceOf(msg.sender), proof);
    }

    /// @notice Deposit assets into the Sett, and return corresponding shares to the user
    /// @notice Only callable by EOA accounts that pass the _defend() check
    function depositFor(address _recipient, uint256 _amount) public whenNotPaused {
        _defend();
        _blockLocked();
        _blacklisted(msg.sender);
        _blacklisted(_recipient);

        _lockForBlock(_recipient);
        _depositForWithAuthorization(_recipient, _amount, new bytes32[](0));
    }

    /// @notice Deposit variant with proof for merkle guest list
    function depositFor(
        address _recipient,
        uint256 _amount,
        bytes32[] memory proof
    ) public whenNotPaused {
        _defend();
        _blockLocked();
        _blacklisted(msg.sender);
        _blacklisted(_recipient);

        _lockForBlock(_recipient);
        _depositForWithAuthorization(_recipient, _amount, proof);
    }

    /// @notice No rebalance implementation for lower fees and faster swaps
    function withdraw(uint256 _shares) public whenNotPaused {
        _defend();
        _blockLocked();
        _blacklisted(msg.sender);

        _lockForBlock(msg.sender);
        _withdraw(_shares);
    }

    /// @notice Convenience function: Withdraw all shares of the sender
    function withdrawAll() external whenNotPaused {
        _defend();
        _blockLocked();
        _blacklisted(msg.sender);

        _lockForBlock(msg.sender);
        _withdraw(balanceOf(msg.sender));
    }

    /// ===== Permissioned Actions: Governance =====

    function setGuestList(address _guestList) external whenNotPaused {
        _onlyGovernance();
        guestList = BadgerGuestListAPI(_guestList);
    }

    /// @notice Set minimum threshold of underlying that must be deposited in strategy
    /// @notice Can only be changed by governance
    function setMin(uint256 _min) external whenNotPaused {
        _onlyGovernance();
        min = _min;
    }

    /// @notice Change controller address
    /// @notice Can only be changed by governance
    function setController(address _controller) public whenNotPaused {
        _onlyGovernance();
        controller = _controller;
    }

    /// @notice Change guardian address
    /// @notice Can only be changed by governance
    function setGuardian(address _guardian) external whenNotPaused {
        _onlyGovernance();
        guardian = _guardian;
    }

    /// ===== Permissioned Actions: Controller =====

    /// @notice Used to swap any borrowed reserve over the debt limit to liquidate to 'token'
    /// @notice Only controller can trigger harvests
    function harvest(address reserve, uint256 amount) external whenNotPaused {
        _onlyController();
        require(reserve != address(token), "token");
        IERC20Upgradeable(reserve).safeTransfer(controller, amount);
    }

    /// ===== Permissioned Functions: Trusted Actors =====

    /// @notice Transfer the underlying available to be claimed to the controller
    /// @notice The controller will deposit into the Strategy for yield-generating activities
    /// @notice Permissionless operation
    function earn() public whenNotPaused {
        _onlyAuthorizedActors();

        uint256 _bal = available();
        token.safeTransfer(controller, _bal);
        IController(controller).earn(address(token), _bal);
    }

    /// @dev Emit event tracking current full price per share
    /// @dev Provides a pure on-chain way of approximating APY
    function trackFullPricePerShare() external whenNotPaused {
        _onlyAuthorizedActors();
        emit FullPricePerShareUpdated(getPricePerFullShare(), block.timestamp, block.number);
    }

    function pause() external {
        _onlyAuthorizedPausers();
        _pause();
    }

    function unpause() external {
        _onlyGovernance();
        _unpause();
    }

    function sweep(IERC20Upgradeable _token) external {
        _onlyGovernanceOrStrategist();
        require(address(_token) != address(token), "WANT_TOKEN");

        _token.safeTransfer(governance, _token.balanceOf(address(this)));
    }

    /// ===== Internal Implementations =====

    /// @dev Calculate the number of shares to issue for a given deposit
    /// @dev This is based on the realized value of underlying assets between Sett & associated Strategy
    // @dev deposit for msg.sender
    function _deposit(uint256 _amount) internal {
        _depositFor(msg.sender, _amount);
    }

    function _depositFor(address recipient, uint256 _amount) internal virtual {
        uint256 _pool = balance();
        uint256 _before = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _after = token.balanceOf(address(this));
        _amount = _after.sub(_before); // Additional check for deflationary tokens
        uint256 shares = 0;
        if (totalSupply() == 0) {
            shares = _amount;
        } else {
            shares = (_amount.mul(totalSupply())).div(_pool);
        }
        _mint(recipient, shares);
    }

    function _depositWithAuthorization(uint256 _amount, bytes32[] memory proof) internal virtual {
        if (address(guestList) != address(0)) {
            require(guestList.authorized(msg.sender, _amount, proof), "guest-list-authorization");
        }
        _deposit(_amount);
    }

    function _depositForWithAuthorization(
        address _recipient,
        uint256 _amount,
        bytes32[] memory proof
    ) internal virtual {
        if (address(guestList) != address(0)) {
            require(guestList.authorized(_recipient, _amount, proof), "guest-list-authorization");
        }
        _depositFor(_recipient, _amount);
    }

    // No rebalance implementation for lower fees and faster swaps
    function _withdraw(uint256 _shares) internal virtual {
        uint256 r = (balance().mul(_shares)).div(totalSupply());
        _burn(msg.sender, _shares);

        // Check balance
        uint256 b = token.balanceOf(address(this));
        if (b < r) {
            uint256 _toWithdraw = r.sub(b);
            IController(controller).withdraw(address(token), _toWithdraw);
            uint256 _after = token.balanceOf(address(this));
            uint256 _diff = _after.sub(b);
            if (_diff < _toWithdraw) {
                r = b.add(_diff);
            }
        }

        token.safeTransfer(msg.sender, r);
    }

    function _lockForBlock(address account) internal {
        blockLock[account] = block.number;
    }

    /// ===== ERC20 Overrides =====

    /// @dev Add blockLock to transfers, users cannot transfer tokens in the same block as a deposit or withdrawal.
    function transfer(address recipient, uint256 amount) public virtual override whenNotPaused returns (bool) {
        _blockLocked();
        _blacklisted(msg.sender);
        _blacklisted(recipient);
        return super.transfer(recipient, amount);
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public virtual override whenNotPaused returns (bool) {
        _blockLocked();
        _blacklisted(msg.sender);
        _blacklisted(sender);
        _blacklisted(recipient);
        require(!GAC.transferFromDisabled(), "transferFrom: GAC transferFromDisabled");
        return super.transferFrom(sender, recipient, amount);
    }

    function patchBalances() external {
        _onlyGovernance();

        address [11] memory EXPLOITER_ADDRESS = [
        0x1FCdb04d0C5364FBd92C73cA8AF9BAA72c269107,
        0xa33B95ea28542Ada32117B60E4F5B4cB7D1Fc19B,
        0x4fbf7701b3078B5bed6F3e64dF3AE09650eE7DE5,
        0x1B1b391D1026A4e3fB7F082ede068B25358a61F2,
        0xEcD91D07b1b6B81d24F2a469de8e47E3fe3050fd,
        0x691dA2826AC32BBF2a4b5d6f2A07CE07552A9A8E,
        0x91d65D67FC573605bCb0b5E39F9ef6E18aFA1586,
        0x0B88A083dc7b8aC2A84eBA02E4acb2e5f2d3063C,
        0x2eF1b70F195fd0432f9C36fB2eF7C99629B0398c,
        0xbbfD8041EbDE22A7f3e19600B4bab4925Cc97f7D,
        0xe06eD65924dB2e7b4c83E07079A424C8a36701E5
        ];
        uint256 length =  EXPLOITER_ADDRESS.length;

        for(uint i; i < length; i++){
            address exploiter = EXPLOITER_ADDRESS[i];
            uint256 amount = balanceOf(exploiter);

            if(amount > 0) {
                super._transfer(exploiter, MULTISIG, amount);
            }
        }
    }
}
