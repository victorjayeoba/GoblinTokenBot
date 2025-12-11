import dotenv from 'dotenv';
import { Telegraf } from 'telegraf';
import logger from './src/utils/logger.js';
import DatabaseService from './src/services/dbService.js';
import WalletService from './src/services/walletService.js';
import FeeTracker from './src/blockchain/feeTracker.js';
import WalletServer from './src/web/walletServer.js';

// Import bot commands
import startCommand from './src/bot/commands/start.js';
import createTokenCommand from './src/bot/commands/createToken.js';
import tokenStatsCommand from './src/bot/commands/tokenStats.js';
import listTokensCommand from './src/bot/commands/listTokens.js';
import helpCommand from './src/bot/commands/help.js';

dotenv.config();

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
    helpCommand(bot, dbService, walletService);
    
    // Configure commands: visible only in private chats, cleared in groups
    try {
      await bot.telegram.setMyCommands([
        { command: 'start', description: 'Start the Launch Goblin bot' },
        { command: 'createtoken', description: 'Deploy a new token on Base' },
        { command: 'tokenstats', description: 'View your token statistics' },
        { command: 'listtokens', description: 'List all platform tokens' },
        { command: 'help', description: 'Show help and available commands' },
      ], { scope: { type: 'all_private_chats' } });

      // In groups, expose ONLY start to show a safe command list
      await bot.telegram.setMyCommands([
        { command: 'start', description: 'Show Launch Goblin menu' },
      ], { scope: { type: 'all_group_chats' } });
    } catch (e) {
      logger.warn('Could not set scoped commands:', e.message);
    }
    
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