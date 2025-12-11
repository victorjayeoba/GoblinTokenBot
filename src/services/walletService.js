import { ethers } from 'ethers';
import constants from '../config/constants.js';
import logger from '../utils/logger.js';

class WalletService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(constants.RPC_URL);
    
    // Only treasury wallet needed for fee collection in v4
    // Users pay their own gas fees, no deployer wallet required
    this.treasuryWallet = new ethers.Wallet(process.env.TREASURY_PRIVATE_KEY, this.provider);
    
    logger.info('WalletService initialized for Clanker v4 - users pay their own gas');
  }

  /**
   * Generate a new smart wallet for a user
   * @param {number} telegramId - User's Telegram ID
   * @returns {Object} Wallet object with address and private key
   */
  generateUserWallet(telegramId) {
    try {
      // Generate a new valid HD wallet with mnemonic
      const wallet = ethers.Wallet.createRandom();
      
      logger.info(`Generated wallet for user ${telegramId}: ${wallet.address}`);
      
      return {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic ? wallet.mnemonic.phrase : 'Not available'
      };
    } catch (error) {
      logger.error('Failed to generate user wallet:', error);
      throw new Error('Failed to generate wallet');
    }
  }

  /**
   * Check ETH balance of a wallet
   * @param {string} address - Wallet address
   * @returns {string} Balance in ETH
   */
  async getEthBalance(address) {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      logger.error(`Failed to get ETH balance for ${address}:`, error);
      throw error;
    }
  }

  /**
   * Check if wallet has sufficient ETH for deployment
   * @param {string} address - Wallet address
   * @param {number|null} devBuyAmount - Dev buy amount in ETH (null if skipped)
   * @returns {boolean} True if sufficient funds
   */
  async hasSufficientFunds(address, devBuyAmount = null) {
    try {
      const balance = await this.getEthBalance(address);
      const userBuyIn = devBuyAmount !== null ? devBuyAmount : 0;
      const required = parseFloat(userBuyIn) + parseFloat(constants.GAS_RESERVE_ETH);
      return parseFloat(balance) >= required;
    } catch (error) {
      logger.error(`Failed to check funds for ${address}:`, error);
      return false;
    }
  }

  /**
   * Check if user has sufficient funds for deployment
   * In v4, users must fund their own wallets
   * @param {string} address - User wallet address
   * @param {number|null} devBuyAmount - Dev buy amount in ETH (null if skipped)
   * @returns {boolean} True if sufficient funds
   */
  async checkUserFunds(address, devBuyAmount = null) {
    try {
      const balance = await this.getEthBalance(address);
      const userBuyIn = devBuyAmount !== null ? devBuyAmount : 0;
      const required = parseFloat(userBuyIn) + parseFloat(constants.GAS_RESERVE_ETH);
      const hasFunds = parseFloat(balance) >= required;
      
      logger.info(`User ${address} balance: ${balance} ETH, required: ${required} ETH, sufficient: ${hasFunds}`);
      return hasFunds;
    } catch (error) {
      logger.error(`Failed to check funds for ${address}:`, error);
      return false;
    }
  }

  /**
   * Get gas estimate for token deployment
   * @param {Object} deploymentData - Token deployment configuration
   * @returns {string} Estimated gas cost in ETH
   */
  async estimateDeploymentGas(deploymentData) {
    try {
      // This is a placeholder - actual gas estimation would depend on Clanker SDK
      const estimatedGas = constants.GAS_LIMIT;
      const gasPrice = await this.provider.getFeeData();
      
      const gasCost = ethers.formatEther(
        BigInt(estimatedGas) * BigInt(gasPrice.gasPrice || gasPrice.maxFeePerGas || 0)
      );
      
      return gasCost;
    } catch (error) {
      logger.error('Failed to estimate deployment gas:', error);
      return '0.01'; // Fallback estimate
    }
  }

  /**
   * Get current gas price
   * @returns {string} Gas price in Gwei
   */
  async getGasPrice() {
    try {
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || 0;
      return ethers.formatUnits(gasPrice, 'gwei');
    } catch (error) {
      logger.error('Failed to get gas price:', error);
      return '20'; // Fallback gas price
    }
  }

  /**
   * Validate wallet address format
   * @param {string} address - Address to validate
   * @returns {boolean} True if valid
   */
  isValidAddress(address) {
    try {
      return ethers.isAddress(address);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get wallet transaction history
   * @param {string} address - Wallet address
   * @returns {Array} Array of transactions
   */
  async getTransactionHistory(address) {
    try {
      // This would typically use an API like Etherscan or BaseScan
      // For now, return empty array
      return [];
    } catch (error) {
      logger.error(`Failed to get transaction history for ${address}:`, error);
      return [];
    }
  }

  /**
   * Get provider instance
   * @returns {ethers.Provider} Provider instance
   */
  getProvider() {
    return this.provider;
  }

  /**
   * Get treasury wallet instance
   * @returns {ethers.Wallet} Treasury wallet
   */
  getTreasuryWallet() {
    return this.treasuryWallet;
  }
}

export default WalletService; 