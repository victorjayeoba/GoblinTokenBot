require('dotenv').config();
const { Telegraf } = require('telegraf');
const logger = require('./src/utils/logger');
const DatabaseService = require('./src/services/dbService');
const WalletService = require('./src/services/walletService');
const FeeTracker = require('./src/blockchain/feeTracker');
const WalletServer = require('./src/web/walletServer');

// Import bot commands
const startCommand = require('./src/bot/commands/start');
const createTokenCommand = require('./src/bot/commands/createToken');
const tokenStatsCommand = require('./src/bot/commands/tokenStats');
const listTokensCommand = require('./src/bot/commands/listTokens');
const helpCommand = require('./src/bot/commands/help');

async function main() {
  try {
    logger.info('🚀 Starting Launch Goblin Bot...');
    
    // Initialize services
    const dbService = new DatabaseService();
    await dbService.initialize();
    
    const walletService = new WalletService();
    
    // Initialize fee tracker
    const feeTracker = new FeeTracker();
    await feeTracker.initialize();
    
    // Start wallet server for MetaMask/WalletConnect integration
    const walletServer = new WalletServer(process.env.WEB_SERVER_PORT || 3000);
    await walletServer.start();
    
    // Create bot instance
    const bot = new Telegraf(process.env.BOT_TOKEN);
    
    // Register commands
    startCommand(bot, dbService, walletService);
    createTokenCommand(bot, dbService, walletService);
    tokenStatsCommand(bot, dbService);
    listTokensCommand(bot, dbService);
    helpCommand(bot);
    
    // Error handling
    bot.catch((err, ctx) => {
      logger.error('Bot error:', err);
      ctx.reply('❌ An error occurred. Please try again later.');
    });
    
    // Start bot
    await bot.launch();
    logger.info('✅ Launch Goblin Bot is running!');
    
    // Graceful shutdown
    process.once('SIGINT', async () => {
      logger.info('Shutting down gracefully...');
      await walletServer.stop();
      bot.stop('SIGINT');
    });
    process.once('SIGTERM', async () => {
      logger.info('Shutting down gracefully...');
      await walletServer.stop();
      bot.stop('SIGTERM');
    });
    
  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

main();
