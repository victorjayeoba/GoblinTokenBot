import constants, { FEE_CONFIGS, POOL_POSITIONS, CLANKER_ADDRESS } from '../config/constants.js';
import logger from '../utils/logger.js';
import { Clanker } from 'clanker-sdk/v4';
import { createWalletClient, createPublicClient, http, isHex, parseEther, formatEther, decodeErrorResult } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';

class TokenDeploymentService {
  constructor(walletService) {
    this.walletService = walletService;
    this.chain = constants.CHAIN_ID === 84532 ? baseSepolia : base;
    logger.info('TokenDeploymentService initialized for Clanker SDK v4');
  }

  /**
   * Enhanced diagnostic function to check network connectivity and wallet status
   */
  async performDiagnostics(account, publicClient) {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      network: {
        chainId: constants.CHAIN_ID,
        rpcUrl: constants.RPC_URL,
        baseEthAddress: constants.BASE_ETH_ADDRESS
      },
      wallet: {
        address: account.address,
        privateKeyLength: account.source ? account.source.length : 0
      },
      connectivity: {},
      balance: {}
    };

    try {
      // Test network connectivity
      logger.info('🔍 Testing network connectivity...');
      const blockNumber = await publicClient.getBlockNumber();
      diagnostics.connectivity.blockNumber = blockNumber.toString();
      diagnostics.connectivity.status = 'connected';
      logger.info(`✅ Network connected - Current block: ${blockNumber}`);

      // Check wallet balance
      logger.info('💰 Checking wallet balance...');
      const balanceWei = await publicClient.getBalance({ address: account.address });
      const balanceEth = Number(formatEther(balanceWei));
      diagnostics.balance.wei = balanceWei.toString();
      diagnostics.balance.eth = balanceEth;
      logger.info(`💰 Wallet balance: ${balanceEth} ETH (${balanceWei} wei)`);

      // Test gas price estimation
      try {
        const gasPrice = await publicClient.getGasPrice();
        diagnostics.connectivity.gasPrice = gasPrice.toString();
        logger.info(`⛽ Gas price: ${formatEther(gasPrice)} ETH`);
      } catch (gasErr) {
        diagnostics.connectivity.gasPriceError = gasErr.message;
        logger.warn(`⚠️ Could not fetch gas price: ${gasErr.message}`);
      }

      // Check if wallet has any transaction history
      try {
        const transactionCount = await publicClient.getTransactionCount({ address: account.address });
        diagnostics.wallet.nonce = transactionCount;
        logger.info(`📊 Transaction count: ${transactionCount}`);
      } catch (txErr) {
        diagnostics.wallet.nonceError = txErr.message;
        logger.warn(`⚠️ Could not fetch transaction count: ${txErr.message}`);
      }

    } catch (error) {
      diagnostics.connectivity.error = error.message;
      logger.error('❌ Network connectivity test failed:', error.message);
      throw new Error(`Network connectivity failed: ${error.message}`);
    }

    return diagnostics;
  }

  /**
   * Enhanced configuration validation with detailed logging
   */
  validateDeploymentConfig(deployConfig, diagnostics) {
    logger.info('🔍 Validating deployment configuration...');
    
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      config: {
        name: deployConfig.name,
        symbol: deployConfig.symbol,
        devBuy: deployConfig.devBuy,
        fees: deployConfig.fees?.type || 'unknown',
        rewardRecipients: deployConfig.rewards?.recipients?.length || 0
      }
    };

    // Validate token name
    if (!deployConfig.name || deployConfig.name.length === 0) {
      validation.errors.push('Token name is required');
      validation.isValid = false;
    } else if (deployConfig.name.length > 50) {
      validation.errors.push('Token name too long (max 50 characters)');
      validation.isValid = false;
    }

    // Validate token symbol
    if (!deployConfig.symbol || deployConfig.symbol.length === 0) {
      validation.errors.push('Token symbol is required');
      validation.isValid = false;
    } else if (deployConfig.symbol.length > 10) {
      validation.errors.push('Token symbol too long (max 10 characters)');
      validation.isValid = false;
    }

    // Validate dev buy amount (only enforce minimum if user provided a dev buy)
    const devBuyAmount = deployConfig.devBuy?.ethAmount || 0;
    const minRequired = constants.MIN_CONTRACT_DEV_BUY_ETH || 0.01;
    
    // Only validate minimum if devBuy configuration exists (user provided an amount)
    if (deployConfig.devBuy && deployConfig.devBuy.ethAmount > 0) {
      if (devBuyAmount < minRequired) {
        validation.errors.push(`Dev buy amount ${devBuyAmount} ETH is below minimum ${minRequired} ETH`);
        validation.isValid = false;
      }
    }

    // Validate wallet balance vs required amount
    const gasReserve = constants.GAS_RESERVE_ETH || 0.005;
    const totalRequired = devBuyAmount + gasReserve;
    const availableBalance = diagnostics.balance.eth || 0;
    
    if (availableBalance < totalRequired) {
      validation.errors.push(`Insufficient balance: need ${totalRequired} ETH (${devBuyAmount} buy-in + ${gasReserve} gas), have ${availableBalance} ETH`);
      validation.isValid = false;
    } else {
      validation.warnings.push(`Balance check passed: ${availableBalance} ETH available, ${totalRequired} ETH required`);
    }

    // Validate fee configuration
    if (!deployConfig.fees) {
      validation.errors.push('Fee configuration is missing');
      validation.isValid = false;
    }

    // Validate rewards configuration (new Clanker v4 schema)
    if (!deployConfig.rewards || !deployConfig.rewards.recipients || !Array.isArray(deployConfig.rewards.recipients)) {
      validation.errors.push('Rewards configuration is missing or invalid');
      validation.isValid = false;
    } else if (deployConfig.rewards.recipients.length === 0) {
      validation.errors.push('At least one reward recipient is required');
      validation.isValid = false;
    }

    // Log validation results
    if (validation.isValid) {
      logger.info('✅ Deployment configuration validation passed');
    } else {
      logger.error('❌ Deployment configuration validation failed:', validation.errors);
    }

    if (validation.warnings.length > 0) {
      logger.warn('⚠️ Deployment configuration warnings:', validation.warnings);
    }

    return validation;
  }

  /**
   * Alias method for backward compatibility
   */
  async deployConditionalToken(deploymentData, userPrivateKey) {
    return this.deployToken(deploymentData, userPrivateKey);
  }

  /**
   * Build deployment configuration for Clanker SDK
   */
  buildDeploymentConfig(deploymentData, walletAddress) {
    logger.info('Building deployment configuration for Clanker SDK v4');

    // Validate wallet address
    if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      throw new Error(`Invalid wallet address: ${walletAddress}`);
    }

    logger.info('Using wallet address:', walletAddress);

    const config = {
      name: deploymentData.tokenName,
      symbol: deploymentData.tokenSymbol,
      tokenAdmin: walletAddress, // Required: token admin address

      // Provide image at top-level if present; move description into metadata
      ...(deploymentData.imageUrl && { image: deploymentData.imageUrl }),
      ...(deploymentData.description && { metadata: { description: deploymentData.description } }),

      // Fee setup (static 1% total)
      fees: {
        type: "static",
        clankerFee: 100,  // 0.1% (100 basis points)
        pairedFee: 100    // 0.1% (100 basis points) - total 1%
      },

      // Reward splitting between creator (50%), team (30%), and Clanker (20%)
      rewards: {
        recipients: [
          {
            recipient: walletAddress,    // Creator address
            admin: walletAddress,        // Creator controls their own rewards
            bps: 5000,                  // 50% share of rewards
            token: "Paired"             // Receive in paired token (WETH)
          },
          {
            recipient: constants.TEAM_WALLET_ADDRESS,  // Team wallet
            admin: walletAddress,                      // Creator can change team recipient
            bps: 3000,                                // 30% share
            token: "Paired"                           // Receive in paired token (WETH)
          },
          {
            recipient: CLANKER_ADDRESS,                // Clanker protocol address
            admin: walletAddress,                      // Creator can change Clanker recipient
            bps: 2000,                                // 20% share
            token: "Both"                             // Receive in both tokens
          }
        ]
      },

      // Dev buy-in (only include if user provided an amount)
      ...(deploymentData.creatorBuyInEth !== null && deploymentData.creatorBuyInEth !== undefined && deploymentData.creatorBuyInEth > 0 ? {
        devBuy: {
          ethAmount: deploymentData.creatorBuyInEth
        }
      } : {})
    };

    // Note: Image is provided as ipfs://CID via session.data.imageUrl

    logger.info('Deployment configuration built:', {
      name: config.name,
      symbol: config.symbol,
      tokenAdmin: config.tokenAdmin,
      devBuy: config.devBuy?.ethAmount || 'Skipped',
      fees: config.fees,
      feeSplit: 'Custom: 50% Creator, 30% Team, 20% Clanker',
      teamWallet: constants.TEAM_WALLET_ADDRESS,
      rewardRecipients: config.rewards.recipients.length
    });

    // Debug: Log the full configuration to see what's actually being built
    logger.info('Full deployment configuration for debugging:', JSON.stringify(config, null, 2));

    return config;
  }

  /**
   * Decode revert data from contract errors
   */
  static decodeRevertData(data) {
    try {
      if (!TokenDeploymentService._clankerFactoryAbi || !Array.isArray(TokenDeploymentService._clankerFactoryAbi)) {
        return { name: 'Unknown', args: [] };
      }

      // Try to decode using the factory ABI
      const decoded = decodeErrorResult({
        abi: TokenDeploymentService._clankerFactoryAbi,
        data: data
      });

      return decoded;
    } catch (error) {
      logger.warn('Failed to decode revert data:', error.message);
      return { name: 'Unknown', args: [] };
    }
  }

  /**
   * Enhanced deployToken method with comprehensive error handling and diagnostics
   */
  async deployToken(deploymentData, userPrivateKey) {
    const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    logger.info(`🚀 Starting token deployment [${deploymentId}]`, {
      tokenName: deploymentData.tokenName,
      tokenSymbol: deploymentData.tokenSymbol,
      creatorBuyInEth: deploymentData.creatorBuyInEth
    });

    try {
      // Validate private key
      if (!userPrivateKey || !isHex(userPrivateKey)) {
        logger.error(`❌ [${deploymentId}] Invalid or missing private key:`, { 
          hasKey: !!userPrivateKey, 
          isHex: userPrivateKey ? isHex(userPrivateKey) : false,
          keyLength: userPrivateKey ? userPrivateKey.length : 0
        });
        throw new Error('Invalid or missing private key');
      }

      // Create account and clients
      const account = privateKeyToAccount(userPrivateKey);
      const publicClient = createPublicClient({ chain: this.chain, transport: http(constants.RPC_URL) });
      const wallet = createWalletClient({ account, chain: this.chain, transport: http(constants.RPC_URL) });

      // Perform comprehensive diagnostics
      logger.info(`🔍 [${deploymentId}] Running pre-deployment diagnostics...`);
      const diagnostics = await this.performDiagnostics(account, publicClient);

      // Set safe defaults but allow dev buy-in (required by Clanker v4)
      deploymentData = { ...deploymentData, vaultPercentage: 0 };
      logger.info(`⚙️ [${deploymentId}] Setting safe defaults: vaultPercentage=0, dev buy-in enabled`);

      // Initialize Clanker SDK
      logger.info(`🔧 [${deploymentId}] Initializing Clanker SDK...`);
      const clanker = new Clanker({ wallet, publicClient });

      // Determine dev buy amount (required by Clanker v4)
      let creatorBuyInEth = 0;
      const gasReserveEth = Number(constants.GAS_RESERVE_ETH || 0.005);
      const minUiDevBuyEth = Number(constants.MIN_DEV_BUY_ETH || 0.001);
      const minContractDevBuyEth = Number(constants.MIN_CONTRACT_DEV_BUY_ETH || 0.01);
      const depositChargeEth = Number(constants.DEPOSIT_CHARGE_ETH || 0.006);
      const totalMinimumDepositEth = Number(constants.TOTAL_MINIMUM_DEPOSIT_ETH || 0.016);

      if (deploymentData.autoDevBuy === true) {
        // Auto mode: use available balance minus gas reserves
        const balanceWei = diagnostics.balance.wei;
        const reserveWei = parseEther(String(gasReserveEth));
        const availableWei = balanceWei > reserveWei ? balanceWei - reserveWei : 0n;
        creatorBuyInEth = Number(formatEther(availableWei));
        if (creatorBuyInEth < 0) creatorBuyInEth = 0;
        creatorBuyInEth = Math.round(creatorBuyInEth * 1e6) / 1e6;
        logger.info(`🤖 [${deploymentId}] Auto dev-buy: balance=${diagnostics.balance.eth} ETH, reserve=${gasReserveEth} ETH, buyIn=${creatorBuyInEth} ETH`);
      } else if (deploymentData.creatorBuyInEth !== null && deploymentData.creatorBuyInEth !== undefined && deploymentData.creatorBuyInEth > 0) {
        // Use provided amount (only if user actually provided one)
        creatorBuyInEth = Number(deploymentData.creatorBuyInEth);
        logger.info(`💰 [${deploymentId}] Using provided dev-buy amount: ${creatorBuyInEth} ETH`);
      } else {
        // User skipped dev buy - use 0
        creatorBuyInEth = 0;
        logger.info(`⏭️ [${deploymentId}] Dev buy skipped by user: ${creatorBuyInEth} ETH`);
      }

      // Check if wallet has enough balance for dev buy-in + gas
      let totalRequired = creatorBuyInEth + gasReserveEth;
      const availableBalance = diagnostics.balance.eth;
      
      if (availableBalance < totalRequired) {
        // Attempt auto-adjust: lower dev buy just enough to fit, but not below contract minimum
        const maxAffordableDevBuy = Math.max(0, availableBalance - gasReserveEth);
        const adjustedDevBuy = Math.max(minContractDevBuyEth, Math.floor(maxAffordableDevBuy * 1e6) / 1e6);
        if (adjustedDevBuy < creatorBuyInEth && adjustedDevBuy + gasReserveEth <= availableBalance) {
          logger.warn(`⚠️ [${deploymentId}] Balance short. Auto-adjusting dev buy-in from ${creatorBuyInEth} to ${adjustedDevBuy} ETH to fit available balance.`);
          creatorBuyInEth = adjustedDevBuy;
          totalRequired = creatorBuyInEth + gasReserveEth;
        }
      }

      if (availableBalance < (creatorBuyInEth + gasReserveEth)) {
        const required = creatorBuyInEth + gasReserveEth;
        const error = `Insufficient balance: need ${required} ETH (${creatorBuyInEth} ETH dev buy-in + ${gasReserveEth} ETH gas), but wallet only has ${availableBalance} ETH`;
        logger.error(`❌ [${deploymentId}] ${error}`, { 
          required, 
          available: availableBalance, 
          creatorBuyInEth, 
          depositChargeEth,
          gasReserveEth,
          totalMinimumDeposit: totalMinimumDepositEth,
          diagnostics 
        });
        throw new Error(error);
      }

      // Build SDK-compliant deployment config
      logger.info(`🏗️ [${deploymentId}] Building deployment configuration...`);
      const deployConfig = this.buildDeploymentConfig({ ...deploymentData, creatorBuyInEth }, account.address);

      // Validate deployment configuration
      logger.info(`🔍 [${deploymentId}] Validating deployment configuration...`);
      const validation = this.validateDeploymentConfig(deployConfig, diagnostics);
      
      if (!validation.isValid) {
        logger.error(`❌ [${deploymentId}] Configuration validation failed:`, validation.errors);
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }

      // Log full deployment configuration
      logger.info(`📋 [${deploymentId}] Full deployment configuration:`, {
        name: deployConfig.name,
        symbol: deployConfig.symbol,
        devBuy: deployConfig.devBuy,
        depositCharge: depositChargeEth,
        fees: deployConfig.fees,
        pool: deployConfig.pool,
        vault: deployConfig.vault,
        rewards: deployConfig.rewards,
        walletAddress: account.address,
        walletBalance: availableBalance,
        totalRequired: totalRequired,
        breakdown: {
          devBuy: creatorBuyInEth,
          depositCharge: depositChargeEth,
          gasReserve: gasReserveEth,
          total: totalRequired
        }
      });

      // Prefetch deploy tx to capture factory ABI for error decoding
      logger.info(`🔧 [${deploymentId}] Prefetching deployment transaction...`);
      try {
        const tx = await clanker.getDeployTransaction(deployConfig);
        if (tx?.abi && Array.isArray(tx.abi)) {
          TokenDeploymentService._clankerFactoryAbi = tx.abi;
          logger.info(`✅ [${deploymentId}] Successfully prefetched deployment transaction`);
        }
      } catch (prefetchErr) {
        logger.warn(`⚠️ [${deploymentId}] Prefetch failed (non-fatal):`, prefetchErr.message);
      }

      // Preflight simulate to surface precise error names without sending a tx
      logger.info(`🧪 [${deploymentId}] Running deployment simulation...`);
      try {
        const sim = await clanker.deploySimulate(deployConfig, account);
        if (sim && 'error' in sim && sim.error) {
          const maybeRaw = sim.error?.cause?.data || sim.error?.data || sim.error?.shortMessage;
          
          logger.error(`❌ [${deploymentId}] Deployment simulation failed:`, {
            error: sim.error,
            rawData: maybeRaw,
            errorSignature: typeof maybeRaw === 'string' && maybeRaw.startsWith('0x') ? maybeRaw.slice(0, 10) : null,
            deployConfig: JSON.stringify(deployConfig, null, 2),
            diagnostics: diagnostics
          });
          
          if (typeof maybeRaw === 'string') {
            if (maybeRaw.startsWith('0x')) {
              const decoded = TokenDeploymentService.decodeRevertData(maybeRaw);
              if (decoded?.name) {
                logger.error(`❌ [${deploymentId}] Simulation reverted with ${decoded.name}`, { args: decoded.args });
              } else {
                const match = maybeRaw.slice(0, 10);
                logger.error(`❌ [${deploymentId}] Simulation reverted with selector ${match}. Lookup: https://openchain.xyz/signatures?query=${match}`);
              }
            } else {
              const sig = maybeRaw.match(/0x[0-9a-fA-F]{8}/)?.[0];
              if (sig) logger.error(`❌ [${deploymentId}] Simulation reverted selector ${sig}. Lookup: https://openchain.xyz/signatures?query=${sig}`);
            }
          }
          throw sim.error;
        }
        logger.info(`✅ [${deploymentId}] Deployment simulation passed`);
      } catch (simErr) {
        logger.error(`❌ [${deploymentId}] Simulation error:`, {
          error: simErr,
          deployConfig: JSON.stringify(deployConfig, null, 2),
          diagnostics: diagnostics
        });
        throw simErr;
      }

      // Execute actual deployment
      logger.info(`🚀 [${deploymentId}] Executing deployment transaction...`);
      const { txHash, waitForTransaction, error } = await clanker.deploy(deployConfig);
      if (error) {
        logger.error(`❌ [${deploymentId}] Deployment transaction failed:`, error);
        throw error;
      }

      logger.info(`📤 [${deploymentId}] Transaction submitted:`, txHash);

      // Wait for transaction confirmation
      logger.info(`⏳ [${deploymentId}] Waiting for transaction confirmation...`);
      const { address: tokenAddress } = await waitForTransaction();

      logger.info(`🎉 [${deploymentId}] Token deployed successfully:`, {
        tokenAddress,
        txHash,
        deployConfig: {
          name: deployConfig.name,
          symbol: deployConfig.symbol,
          devBuy: deployConfig.devBuy
        }
      });

      return {
        success: true,
        contractAddress: tokenAddress,
        txHash: txHash,
        deploymentId: deploymentId
      };

    } catch (error) {
      logger.error(`❌ [${deploymentId}] Deployment failed:`, {
        error: error.message,
        stack: error.stack,
        deploymentData: {
          tokenName: deploymentData.tokenName,
          tokenSymbol: deploymentData.tokenSymbol,
          creatorBuyInEth: deploymentData.creatorBuyInEth
        }
      });
      
      throw error;
    }
  }

  // ... rest of the methods remain the same
}

export default TokenDeploymentService;
