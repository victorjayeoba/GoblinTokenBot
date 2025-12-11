 // Official Clanker SDK v4 Constants
export const DEGEN_ADDRESS = '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed';
export const NATIVE_ADDRESS = '0x20DD04c17AFD5c9a8b3f2cdacaa8Ee7907385BEF';
export const CLANKER_ADDRESS = '0x1bc0c42215582d5A085795f4baDbaC3ff36d1Bcb';
export const ANON_ADDRESS = '0x0Db510e79909666d6dEc7f5e49370838c16D950f';
export const HIGHER_ADDRESS = '0x0578d8A44db98B23BF096A382e016e29a5Ce0ffe';
export const CB_BTC_ADDRESS = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';
export const A0X_ADDRESS = '0x820C5F0fB255a1D18fd0eBB0F1CCefbC4D546dA7';

export const DEFAULT_SUPPLY = 100_000_000_000_000_000_000_000_000_000n;

// Clanker v4 Configuration Presets - Official SDK Structure
export const FEE_CONFIGS = {
  StaticBasic: {
    type: 'static',
    clankerFee: 100,
    pairedFee: 100,
  },
  DynamicBasic: {
    type: 'dynamic',
    baseFee: 100, // 1% minimum fee
    maxFee: 500, // 5% maximum fee
    referenceTickFilterPeriod: 30, // 30 seconds
    resetPeriod: 120, // 2 minutes
    resetTickFilter: 200, // 2% price movement
    feeControlNumerator: 500000000, // Constant for scaling variable fee component
    decayFilterBps: 7500, // 75% decay after filter period
  },
};

export const POOL_POSITIONS = {
  Standard: [
    {
      tickLower: -230400, // ~$27,000
      tickUpper: -120000, // ~$1.5B
      positionBps: 10_000, // All tokens in one LP position
    },
  ],
  Project: [
    {
      tickLower: -230400, // ~$27K
      tickUpper: -214000, // ~$130K
      positionBps: 1_000, // 10% of LP
    },
    {
      tickLower: -214000, // ~$130K
      tickUpper: -155000, // ~$50M
      positionBps: 5_000, // 50% of LP
    },
    {
      tickLower: -202000, // ~$450K
      tickUpper: -155000, // ~$50M
      positionBps: 1_500, // 15% of LP
    },
    {
      tickLower: -155000, // ~$50M
      tickUpper: -120000, // ~$1.5B
      positionBps: 2_000, // 20% of LP
    },
    {
      tickLower: -141000, // ~$200M
      tickUpper: -120000, // ~$1.5B
      positionBps: 500, // 5% of LP
    },
  ],
};

export default {
  // Bot Configuration
  BOT_NAME: 'Launch Goblin',
  BOT_VERSION: '1.0.0',
  
  // Blockchain Configuration
  CHAIN_ID: parseInt(process.env.CHAIN_ID) || 8453,
  RPC_URL: process.env.RPC_URL || 'https://mainnet.base.org',
  BASE_ETH_ADDRESS: process.env.BASE_ETH_ADDRESS || '0x4200000000000000000000000000000000000006',
  
  // Clanker v4.0.0 Factory Contract Addresses
  CLANKER_V4_FACTORY_BASE: '0xE85A59c628F7d27878ACeB4bf3b35733630083a9',
  
  // Fee Configuration - Clanker v4 Structure
  // 1% total trading fee breakdown:
  // - 0.2% (20%) → Clanker default
  // - 0.3% (30%) → Team wallet  
  // - 0.5% (50%) → Token deployer (creator)
  CREATOR_REWARD_PERCENTAGE: 50,        // 50% to creator
  TEAM_REWARD_PERCENTAGE: 30,           // 30% to team wallet
  CLANKER_REWARD_PERCENTAGE: 20,        // 20% to Clanker default
  
  // Team wallet address for fee distribution (hardcoded as requested)
  TEAM_WALLET_ADDRESS: '0x51b072a2d45627e23bF12AB722b7A291684206Eb',
  
  // Legacy fields (keeping for backward compatibility)
  TREASURY_REWARD_PERCENTAGE: 0,
  BUYBACK_REWARD_PERCENTAGE: 0,
  
  // Token Configuration
  DEFAULT_TRADING_FEE: 1,
  MIN_TRADING_FEE: 1,
  MAX_TRADING_FEE: 1,
  
  // Wallet Configuration
  MIN_ETH_REQUIRED: '0.001', // Minimum ETH required for deployment (legacy)
  GAS_LIMIT: 5000000,       // Gas limit for token deployment
  GAS_RESERVE_ETH: parseFloat(process.env.GAS_RESERVE_ETH || '0.005'), // Reserved ETH for gas
  MIN_DEV_BUY_ETH: parseFloat(process.env.MIN_DEV_BUY_ETH || '0.001'), // Bot UI minimum dev buy-in (soft)
  MIN_CONTRACT_DEV_BUY_ETH: parseFloat(process.env.MIN_CONTRACT_DEV_BUY_ETH || '0.01'), // Clanker v4 contract minimum
  
  // Deposit Configuration
  DEPOSIT_CHARGE_ETH: parseFloat(process.env.DEPOSIT_CHARGE_ETH || '0.006'), // Additional charge on top of dev buy (0.006 ETH)
  TOTAL_MINIMUM_DEPOSIT_ETH: parseFloat(process.env.MIN_CONTRACT_DEV_BUY_ETH || '0.01') + parseFloat(process.env.DEPOSIT_CHARGE_ETH || '0.006'), // 0.016 ETH total
  
  // Database Configuration
  DB_PATH: process.env.DB_PATH || './data/launch_goblin.db',
  
  // IPFS Configuration
  IPFS_API_URL: process.env.IPFS_API_URL || 'https://ipfs.infura.io:5001/api/v0',
  
  // CAT Token (for buyback)
  CAT_TOKEN_ADDRESS: process.env.CAT_TOKEN_ADDRESS || '0x1234567890123456789012345678901234567890',
  
  // Dexscreener API
  DEXSCREENER_API_URL: 'https://api.dexscreener.com/latest/dex',
  
  
  // Messages
  MESSAGES: {
    WELCOME: '🧌 Welcome to Launch Goblin! Use /createToken to deploy your own token on Base.',
    HELP: `🤖 <b>Launch Goblin Bot Commands</b>

/start - Start the bot
/createToken - Deploy a new token
/listTokens - Show all deployed tokens
/tokenStats - Show token statistics
/help - Show this help message

<b>How to use:</b>
1. Use /createToken to start token creation
2. Follow the step-by-step process
3. In groups: mention me @launchgoblinbot with /start or /createToken
4. Continue securely in DM for sensitive steps
5. Your token will be deployed automatically!`,
    TOKEN_CREATION_START: '🚀 Let\'s create your token! I\'ll guide you through the process step by step.',
    TOKEN_CREATION_NAME: '📝 What\'s the token name?',
    TOKEN_CREATION_SYMBOL: '💎 What\'s the ticker? (A–Z only, 2–10 characters)',
    TOKEN_CREATION_IMAGE: '🖼️ Upload an image or type skip to continue without one. (JPG, PNG, GIF only)',
    TOKEN_CREATION_DESCRIPTION: '✍️ Enter a short description or type skip to continue without one (500 characters max).',
    TOKEN_CREATION_BUYIN: '💰 Enter creator buy-in amount in ETH or type skip (Range: 0.01 – 1 ETH)',
    TOKEN_PREVIEW: '👀 Preview your token below. If everything looks good, tap Sign & Deploy to continue.',
    WALLET_GENERATED: '💳 I\'ve generated a smart wallet for you. Send ETH to this address to deploy your token:',
    DEPLOYMENT_IN_PROGRESS: '⏳ Token deployment in progress... This may take a few minutes.',
    DEPLOYMENT_SUCCESS: '🎉 Token deployed successfully!',
    DEPLOYMENT_FAILED: '❌ Token deployment failed. Please try again.',
    INSUFFICIENT_FUNDS: '❌ Insufficient ETH in wallet. Please send more ETH and try again.',
    INVALID_INPUT: '❌ Invalid input. Please try again.',
    COMMAND_NOT_FOUND: '❌ Command not found. Use /help to see available commands.'
  },
  
  // Error Messages
  ERRORS: {
    INVALID_TOKEN_NAME: 'Token name must be 3-50 characters long and contain only letters, numbers, spaces, hyphens, and underscores.',
    INVALID_SYMBOL: 'Symbol must be 2-10 characters long and contain only letters and numbers.',
    INVALID_FEE: 'Trading fee must be between 1% and 20%.',
    INVALID_IMAGE: 'Please send a valid image file (JPG, PNG, GIF) or type "skip".',
    WALLET_CREATION_FAILED: 'Failed to create wallet. Please try again.',
    DEPLOYMENT_FAILED: 'Token deployment failed. Please check your ETH balance and try again.',
    DATABASE_ERROR: 'Database error occurred. Please try again later.',
    BLOCKCHAIN_ERROR: 'Blockchain error occurred. Please try again later.'
  }
}; 