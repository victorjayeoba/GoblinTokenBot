// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FeeERC20 is ERC20, Ownable {
    address public clankerWallet;
    address public teamWallet;
    address public deployerWallet;
    
    uint256 public constant TOTAL_FEE = 100; // 1% (100 basis points)
    uint256 public constant CLANKER_FEE = 20; // 0.2%
    uint256 public constant TEAM_FEE = 30;    // 0.3%
    uint256 public constant DEPLOYER_FEE = 50; // 0.5%
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        address _clankerWallet,
        address _teamWallet,
        address _deployerWallet
    ) ERC20(name, symbol) Ownable(msg.sender) {
        clankerWallet = _clankerWallet;
        teamWallet = _teamWallet;
        deployerWallet = _deployerWallet;
        
        _mint(msg.sender, totalSupply);
    }
    
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        address owner = _msgSender();
        _transferWithFees(owner, to, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        _transferWithFees(from, to, amount);
        return true;
    }
    
    function _transferWithFees(address from, address to, uint256 amount) internal {
        if (from == address(0) || to == address(0) || from == owner()) {
            // No fee on mint, burn, or owner transfers
            _transfer(from, to, amount);
            return;
        }
        
        uint256 fee = (amount * TOTAL_FEE) / 10000;
        uint256 clankerAmount = (fee * CLANKER_FEE) / TOTAL_FEE;
        uint256 teamAmount = (fee * TEAM_FEE) / TOTAL_FEE;
        uint256 deployerAmount = (fee * DEPLOYER_FEE) / TOTAL_FEE;
        
        uint256 transferAmount = amount - fee;
        
        _transfer(from, to, transferAmount);
        _transfer(from, clankerWallet, clankerAmount);
        _transfer(from, teamWallet, teamAmount);
        _transfer(from, deployerWallet, deployerAmount);
    }
    
    // Function to update fee recipients (only owner)
    function updateFeeRecipients(
        address _clankerWallet,
        address _teamWallet,
        address _deployerWallet
    ) external onlyOwner {
        clankerWallet = _clankerWallet;
        teamWallet = _teamWallet;
        deployerWallet = _deployerWallet;
    }
}
