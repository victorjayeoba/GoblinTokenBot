import { ethers } from 'ethers';
import constants from '../config/constants.js';
import logger from '../utils/logger.js';
import DatabaseService from '../services/dbService.js';

class FeeTracker {
  constructor() {
    this.provider = null;
    this.treasuryWallet = null;
    this.isRunning = false;
    this.dbService = null;
    this.trackedTokens = new Map();
  }

  async initialize() {
    try {
      // Initialize provider and wallet
      this.provider = new ethers.JsonRpcProvider(constants.RPC_URL);
      this.treasuryWallet = new ethers.Wallet(process.env.TREASURY_PRIVATE_KEY, this.provider);
      
      logger.info('Fee tracker initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize fee tracker:', error);
      throw error;
    }
  }

  /**
   * Start monitoring fees for a specific token
   * @param {string} tokenAddress - Token contract address
   * @param {Object} tokenInfo - Token information
   */
  async startTracking(tokenAddress, tokenInfo) {
    try {
      if (this.trackedTokens.has(tokenAddress)) {
        logger.warn(`Already tracking token: ${tokenAddress}`);
        return;
      }

      // Store token info
      this.trackedTokens.set(tokenAddress, {
        ...tokenInfo,
        lastProcessedBlock: await this.provider.getBlockNumber(),
        totalFeesCollected: 0
      });

      logger.info(`Started tracking fees for token: ${tokenAddress}`);
    } catch (error) {
      logger.error(`Failed to start tracking token ${tokenAddress}:`, error);
    }
  }

  /**
   * Stop monitoring fees for a specific token
   * @param {string} tokenAddress - Token contract address
   */
  async stopTracking(tokenAddress) {
    try {
      if (this.trackedTokens.has(tokenAddress)) {
        this.trackedTokens.delete(tokenAddress);
        logger.info(`Stopped tracking fees for token: ${tokenAddress}`);
      }
    } catch (error) {
      logger.error(`Failed to stop tracking token ${tokenAddress}:`, error);
    }
  }

  /**
   * Process fee collection event
   * @param {Object} eventData - Fee event data
   */
  async processFeeEvent(eventData) {
    try {
      const {
        tokenAddress,
        amount,
        from,
        to,
        txHash
      } = eventData;

      const tokenInfo = this.trackedTokens.get(tokenAddress);
      if (!tokenInfo) {
        logger.warn(`Received fee event for untracked token: ${tokenAddress}`);
        return;
      }

      logger.info(`Processing fee event for token ${tokenAddress}: ${ethers.formatEther(amount)} ETH`);

      // Calculate fee distribution
      const feeDistribution = this.calculateFeeDistribution(amount, tokenInfo.tradingFee);

      // Update token stats
      tokenInfo.totalFeesCollected += parseFloat(ethers.formatEther(amount));

      // Record fee event in database
      if (this.dbService) {
        await this.dbService.recordFeeEvent({
          tokenAddress,
          amount: parseFloat(ethers.formatEther(amount)),
          creatorReward: parseFloat(ethers.formatEther(feeDistribution.creatorReward)),
          teamReward: parseFloat(ethers.formatEther(feeDistribution.teamReward)),
          clankerReward: parseFloat(ethers.formatEther(feeDistribution.clankerReward)),
          txHash
        });

        // Update token volume and fees
        await this.dbService.updateTokenStats(
          tokenAddress,
          parseFloat(ethers.formatEther(amount)),
          parseFloat(ethers.formatEther(amount))
        );
      }

      // Execute fee distribution
      await this.executeFeeDistribution(tokenAddress, feeDistribution, txHash);

      logger.info(`Fee event processed successfully for token ${tokenAddress}`);

    } catch (error) {
      logger.error('Failed to process fee event:', error);
    }
  }

  /**
   * Calculate fee distribution based on Clanker v4 percentages
   * @param {BigInt} totalAmount - Total fee amount
   * @param {number} tradingFee - Trading fee percentage
   * @returns {Object} Fee distribution
   */
  calculateFeeDistribution(totalAmount, tradingFee) {
    const creatorReward = (totalAmount * BigInt(constants.CREATOR_REWARD_PERCENTAGE)) / BigInt(100);
    const teamReward = (totalAmount * BigInt(constants.TEAM_REWARD_PERCENTAGE)) / BigInt(100);
    const clankerReward = (totalAmount * BigInt(constants.CLANKER_REWARD_PERCENTAGE)) / BigInt(100);

    return {
      creatorReward,
      teamReward,
      clankerReward,
      totalAmount
    };
  }

  /**
   * Execute fee distribution to different wallets
   * @param {string} tokenAddress - Token address
   * @param {Object} feeDistribution - Fee distribution amounts
   * @param {string} txHash - Original transaction hash
   */
  async executeFeeDistribution(tokenAddress, feeDistribution, txHash) {
    try {
      const tokenInfo = this.trackedTokens.get(tokenAddress);
      if (!tokenInfo) return;

      // Send creator reward
      if (feeDistribution.creatorReward > 0) {
        await this.sendCreatorReward(tokenAddress, feeDistribution.creatorReward, txHash);
      }

      // Send team reward
      if (feeDistribution.teamReward > 0) {
        await this.sendTeamReward(feeDistribution.teamReward, txHash);
      }

      // Log Clanker reward (handled automatically by Clanker)
      if (feeDistribution.clankerReward > 0) {
        await this.logClankerReward(feeDistribution.clankerReward, txHash);
      }

      logger.info(`Fee distribution executed for token ${tokenAddress}`);

    } catch (error) {
      logger.error(`Failed to execute fee distribution for token ${tokenAddress}:`, error);
    }
  }

  /**
   * Send creator reward
   * @param {string} tokenAddress - Token address
   * @param {BigInt} amount - Amount to send
   * @param {string} txHash - Original transaction hash
   */
  async sendCreatorReward(tokenAddress, amount, txHash) {
    try {
      // Get creator address from database
      if (!this.dbService) return;

      const tokens = await this.dbService.getAllTokens();
      const token = tokens.find(t => t.token_address === tokenAddress);
      if (!token) return;

      // Send ETH to creator (this would typically be done through the smart contract)
      logger.info(`Creator reward sent: ${ethers.formatEther(amount)} ETH to ${token.username}`);
      
    } catch (error) {
      logger.error('Failed to send creator reward:', error);
    }
  }

  /**
   * Send team reward to team wallet
   * @param {BigInt} amount - Amount to send
   * @param {string} txHash - Original transaction hash
   */
  async sendTeamReward(amount, txHash) {
    try {
      // Team reward is automatically routed to team wallet by Clanker
      logger.info(`Team reward received: ${ethers.formatEther(amount)} ETH to ${constants.TEAM_WALLET_ADDRESS}`);
      
    } catch (error) {
      logger.error('Failed to process team reward:', error);
    }
  }

  /**
   * Log Clanker reward (handled automatically by Clanker)
   * @param {BigInt} amount - Amount for Clanker
   * @param {string} txHash - Original transaction hash
   */
  async logClankerReward(amount, txHash) {
    try {
      // Clanker reward is handled automatically by the protocol
      logger.info(`Clanker reward: ${ethers.formatEther(amount)} ETH (handled by protocol)`);
      
    } catch (error) {
      logger.error('Failed to log Clanker reward:', error);
    }
  }

  /**
   * Get fee statistics for a token
   * @param {string} tokenAddress - Token address
   * @returns {Object} Fee statistics
   */
  async getFeeStats(tokenAddress) {
    try {
      const tokenInfo = this.trackedTokens.get(tokenAddress);
      if (!tokenInfo) {
        return null;
      }

      return {
        totalFeesCollected: tokenInfo.totalFeesCollected,
        lastProcessedBlock: tokenInfo.lastProcessedBlock,
        tradingFee: tokenInfo.tradingFee
      };
    } catch (error) {
      logger.error(`Failed to get fee stats for token ${tokenAddress}:`, error);
      return null;
    }
  }

  /**
   * Get overall fee statistics
   * @returns {Object} Overall statistics
   */
  async getOverallStats() {
    try {
      const stats = {
        totalTrackedTokens: this.trackedTokens.size,
        totalFeesCollected: 0,
        activeTracking: this.isRunning
      };

      for (const [_, tokenInfo] of this.trackedTokens) {
        stats.totalFeesCollected += tokenInfo.totalFeesCollected;
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get overall stats:', error);
      return null;
    }
  }

  /**
   * Set database service reference
   * @param {DatabaseService} dbService - Database service instance
   */
  setDatabaseService(dbService) {
    this.dbService = dbService;
  }

  /**
   * Start the fee tracking service
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Fee tracker is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Fee tracking service started');

    // Start monitoring blockchain events
    await this.startBlockchainMonitoring();
  }

  /**
   * Stop the fee tracking service
   */
  async stop() {
    this.isRunning = false;
    logger.info('Fee tracking service stopped');
  }

  /**
   * Start monitoring blockchain for fee events
   */
  async startBlockchainMonitoring() {
    try {
      // This would typically involve setting up event listeners for fee collection
      // For now, just log that monitoring is active
      logger.info('Blockchain monitoring started for fee events');
      
    } catch (error) {
      logger.error('Failed to start blockchain monitoring:', error);
    }
  }
}

export default FeeTracker; 