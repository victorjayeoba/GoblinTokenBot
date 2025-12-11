// launch-goblin-enhanced.js - Enhanced Launch Goblin Bot with Database
require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const logger = require('./src/utils/logger');
const DatabaseService = require('./src/services/dbService');

console.log('🚀 Starting Launch Goblin Bot (Enhanced with Database)...');
console.log('📋 Token loaded:', process.env.BOT_TOKEN ? 'YES' : 'NO');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Add session middleware
bot.use(session());

let dbService;

// Initialize database
async function initializeServices() {
  try {
    dbService = new DatabaseService();
    await dbService.initialize();
    console.log('✅ Database service initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

// Basic commands
bot.command('start', async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    const username = ctx.from.username;
    const firstName = ctx.from.first_name;
    const lastName = ctx.from.last_name;

    // Register or update user using the correct method
    await dbService.createUser(telegramId, username, firstName, lastName);

    const welcomeMessage = `🚀 Welcome to Launch Goblin Bot!

I'm your AI-powered launch assistant for creating and managing tokens.

📋 Available Commands:
/createtoken - Create a new token
/listtokens - View all your tokens
/tokenstats - Get token statistics
/help - Show detailed help
/ping - Test bot response
/test - Test bot and session
/testsession - Verify session persistence

🎯 Get started with /createToken to launch your first token!`;
  
    ctx.reply(welcomeMessage);
  } catch (error) {
    logger.error('Error in start command:', error);
    ctx.reply('❌ Error starting bot. Please try again.');
  }
});

bot.command('ping', (ctx) => {
  ctx.reply('🏓 Pong! Bot is responsive!');
});

bot.command('test', (ctx) => {
  // Test session functionality
  if (!ctx.session) {
    ctx.session = {};
  }
  ctx.session.testValue = 'test-' + Date.now();
  ctx.reply(`✅ Launch Goblin Bot test successful!\n\nSession test: ${ctx.session.testValue}\n\nTry /testsession to verify session persistence.`);
});

bot.command('testsession', (ctx) => {
  if (ctx.session && ctx.session.testValue) {
    ctx.reply(`✅ Session working! Test value: ${ctx.session.testValue}`);
  } else {
    ctx.reply('❌ Session not working. Test value not found.');
  }
});

// Enhanced Launch Goblin Commands
async function handleCreateToken(ctx) {
  try {
    const telegramId = ctx.from.id;
    
    // Create deployment session using the correct method
    await dbService.createDeploymentSession(telegramId, 'started', {
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name
    });
    
    const message = `🎯 Token Creation Wizard

I'll help you create a new token! Here's what I need:

1️⃣ Token Name (e.g., "My Awesome Token")
2️⃣ Token Symbol (e.g., "MAT")
3️⃣ Trading Fee (e.g., 0.05 for 5%)
4️⃣ Logo URL (optional, or type "skip")
5️⃣ Wallet Address (your wallet for fees)

📝 Please send me the token name first, or type "cancel" to stop.`;

    ctx.reply(message);
    
    // Set up conversation state - ensure proper session initialization
    if (!ctx.session) {
      ctx.session = {};
    }
    
    // Initialize session properties
    ctx.session.creatingToken = true;
    ctx.session.step = 'name';
    ctx.session.telegramId = telegramId;
    ctx.session.userId = ctx.from.id;
    ctx.session.username = ctx.from.username;
    
    console.log('🚀 Token creation session started for user:', telegramId);
    console.log('📋 Session state:', JSON.stringify(ctx.session, null, 2));
    console.log('🔍 Context session:', JSON.stringify(ctx.session, null, 2));
    
  } catch (error) {
    logger.error('Error in createToken command:', error);
    ctx.reply('❌ Error starting token creation. Please try again.');
  }
}

// Register both lowercase and camelCase versions
bot.command('createtoken', handleCreateToken);
bot.command('createToken', handleCreateToken);

bot.command('listtokens', async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    
    // Get user's tokens from database using the correct method
    const tokens = await dbService.getTokensByUser(telegramId);
    
    let message = '📋 Your Tokens:\n\n';
    
    if (tokens.length === 0) {
      message += 'No tokens found. Create your first one with /createToken!';
    } else {
      tokens.forEach((token, index) => {
        message += `${index + 1}. ${token.token_name} (${token.token_symbol})\n`;
        if (token.token_address) {
          message += `   Address: ${token.token_address.substring(0, 8)}...\n`;
        }
        message += `   Fee: ${(token.trading_fee * 100).toFixed(1)}%\n`;
        message += `   Status: ${token.status || 'Active'}\n`;
        if (token.deployment_time) {
          message += `   Deployed: ${new Date(token.deployment_time).toLocaleDateString()}\n`;
        }
        message += '\n';
      });
    }
    
    ctx.reply(message);
    
  } catch (error) {
    logger.error('Error in listTokens command:', error);
    ctx.reply('❌ Error listing tokens. Please try again.');
  }
});

bot.command('tokenstats', async (ctx) => {
  try {
    // Get global token statistics using the correct method
    const globalStats = await dbService.getTokenStats();
    
    const message = `📊 Token Statistics

🌍 Global Stats:
🎯 Total Tokens: ${globalStats.total_tokens || 0}
💰 Total Volume: $${(globalStats.total_volume || 0).toLocaleString()}
💸 Total Fees: $${(globalStats.total_fees || 0).toLocaleString()}
📊 Average Fee: ${((globalStats.avg_trading_fee || 0) * 100).toFixed(1)}%

🚀 Create more tokens with /createToken!`;
    
    ctx.reply(message);
    
  } catch (error) {
    logger.error('Error in tokenStats command:', error);
    ctx.reply('❌ Error getting statistics. Please try again.');
  }
});

bot.command('help', (ctx) => {
  const helpMessage = `🆘 Launch Goblin Bot Help

🎯 Core Commands:
/start - Welcome message and overview
/createToken - Start token creation wizard
/listTokens - View all your tokens
/tokenStats - Get token statistics
/help - Show this help message
/ping - Test bot response

📝 How to Create a Token:
1. Use /createToken command
2. Follow the step-by-step wizard
3. Provide token details when prompted
4. Confirm and deploy

🔧 Features:
• Multi-network support
• Token management
• Statistics tracking
• AI-powered assistance
• Database persistence

💡 Tips:
• Use /start to see all commands
• Type "cancel" during creation to stop
• Check /tokenStats for overview
• Your data is saved automatically

Need more help? The bot will guide you through each step!`;
  
  ctx.reply(helpMessage);
});

// Enhanced text message handling
bot.on('text', async (ctx) => {
  // Only handle free-form text in private chats; avoid group noise
  if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
    return;
  }
  const text = ctx.message.text.toLowerCase();
  
  // Debug session state for every message
  console.log('📨 Received text message:', ctx.message.text);
  console.log('👤 From user:', ctx.from.id, ctx.from.username);
  console.log('🔍 Session exists:', !!ctx.session);
  console.log('📋 Session state:', JSON.stringify(ctx.session, null, 2));
  
  if (text === 'cancel') {
    try {
      if (ctx.session && ctx.session.telegramId) {
        // Update deployment session to cancelled
        await dbService.createDeploymentSession(ctx.session.telegramId, 'cancelled');
      }
      ctx.session = { ...ctx.session, creatingToken: false, step: null };
      ctx.reply('❌ Token creation cancelled. Use /createToken to start again.');
    } catch (error) {
      logger.error('Error cancelling token creation:', error);
      ctx.reply('❌ Error cancelling. Please try again.');
    }
    return;
  }
  
  // Enhanced token creation flow - Check session state first
  console.log('🔍 Checking session conditions:');
  console.log('  - Session exists:', !!ctx.session);
  console.log('  - creatingToken:', ctx.session?.creatingToken);
  console.log('  - step:', ctx.session?.step);
  
  if (ctx.session && ctx.session.creatingToken && ctx.session.step) {
    console.log('🎯 Processing token creation step:', ctx.session.step, 'for user:', ctx.from.id);
    
    try {
      switch (ctx.session.step) {
        case 'name':
          console.log('📝 Processing token name:', ctx.message.text);
          
          // Check if user sent all data at once
          if (ctx.message.text.includes('\n') && ctx.message.text.includes('0.') && ctx.message.text.includes('http')) {
            // User sent all data - parse it intelligently
            const lines = ctx.message.text.split('\n').filter(line => line.trim());
            let tokenName, tokenSymbol, tradingFee, logoUrl;
            
            // Parse the data (assuming format: name, symbol, fee, url)
            if (lines.length >= 4) {
              tokenName = lines[0].trim();
              tokenSymbol = lines[1].trim();
              tradingFee = parseFloat(lines[2].trim());
              logoUrl = lines[3].trim();
              
              // Validate the data
              if (isNaN(tradingFee) || tradingFee < 0 || tradingFee > 1) {
                ctx.reply('❌ Invalid trading fee. Please send just the token name first, or use the step-by-step process.');
                return;
              }
              
              // Save all data at once
              await dbService.createDeploymentSession(ctx.session.telegramId, 'all_data_entered', {
                tokenName: tokenName,
                tokenSymbol: tokenSymbol,
                tradingFee: tradingFee,
                logoUrl: logoUrl,
                username: ctx.from.username,
                firstName: ctx.from.first_name,
                lastName: ctx.from.last_name
              });
              
              const summary = `🎯 Smart Detection! I found all your token details:

📝 Name: ${tokenName}
🔤 Symbol: ${tokenSymbol}
💰 Trading Fee: ${(tradingFee * 100).toFixed(1)}%
🖼️ Logo: ${logoUrl}

🚀 Your token is ready to be created!

Note: This is a demo version. In the full version, I would:
• Deploy the smart contract
• Set up liquidity pools
• Configure trading parameters
• Provide deployment links

Use /createToken to create another token!`;
              
              ctx.reply(summary);
              ctx.session = { ...ctx.session, creatingToken: false, step: null };
              return;
            }
          }
          
          // Regular single-step flow - Update deployment session with token name
          await dbService.createDeploymentSession(ctx.session.telegramId, 'name_entered', {
            tokenName: ctx.message.text,
            username: ctx.from.username,
            firstName: ctx.from.first_name,
            lastName: ctx.from.last_name
          });
          
          // Update session state
          ctx.session.tokenName = ctx.message.text;
          ctx.session.step = 'symbol';
          
          console.log('✅ Token name saved, moving to symbol step');
          ctx.reply(`✅ Token Name: ${ctx.message.text}\n\nNow send me the token symbol (e.g., "MAT"):`);
          break;
          
        case 'symbol':
          console.log('🔤 Processing token symbol:', ctx.message.text);
          
          // Update deployment session with token symbol
          await dbService.createDeploymentSession(ctx.session.telegramId, 'symbol_entered', {
            tokenName: ctx.session.tokenName,
            tokenSymbol: ctx.message.text,
            username: ctx.from.username,
            firstName: ctx.from.first_name,
            lastName: ctx.from.last_name
          });
          
          // Update session state
          ctx.session.tokenSymbol = ctx.message.text;
          ctx.session.step = 'fee';
          
          console.log('✅ Token symbol saved, moving to fee step');
          ctx.reply(`✅ Token Symbol: ${ctx.message.text}\n\nNow send me the trading fee (e.g., 0.05 for 5%):`);
          break;
          
        case 'fee':
          console.log('💰 Processing trading fee:', ctx.message.text);
          
          const fee = parseFloat(ctx.message.text);
          if (isNaN(fee) || fee < 0 || fee > 1) {
            ctx.reply('❌ Please enter a valid fee between 0 and 1 (e.g., 0.05 for 5%):');
            return;
          }
          
          // Update deployment session with trading fee
          await dbService.createDeploymentSession(ctx.session.telegramId, 'fee_entered', {
            tokenName: ctx.session.tokenName,
            tokenSymbol: ctx.session.tokenSymbol,
            tradingFee: fee,
            username: ctx.from.username,
            firstName: ctx.from.first_name,
            lastName: ctx.from.last_name
          });
          
          // Update session state
          ctx.session.tokenFee = fee;
          ctx.session.step = 'logo';
          
          console.log('✅ Trading fee saved, moving to logo step');
          ctx.reply(`✅ Trading Fee: ${(fee * 100).toFixed(1)}%\n\nNow send me the logo URL, or type "skip":`);
          break;
          
        case 'logo':
          console.log('🖼️ Processing logo:', ctx.message.text);
          
          if (ctx.message.text.toLowerCase() === 'skip') {
            ctx.session.tokenLogo = null;
            // Update deployment session - logo skipped
            await dbService.createDeploymentSession(ctx.session.telegramId, 'logo_skipped', {
              tokenName: ctx.session.tokenName,
              tokenSymbol: ctx.session.tokenSymbol,
              tradingFee: ctx.session.tokenFee,
              logoUrl: null,
              username: ctx.from.username,
              firstName: ctx.from.first_name,
              lastName: ctx.from.last_name
            });
          } else {
            ctx.session.tokenLogo = ctx.message.text;
            // Update deployment session with logo
            await dbService.createDeploymentSession(ctx.session.telegramId, 'logo_entered', {
              tokenName: ctx.session.tokenName,
              tokenSymbol: ctx.session.tokenSymbol,
              tradingFee: ctx.session.tokenFee,
              logoUrl: ctx.message.text,
              username: ctx.from.username,
              firstName: ctx.from.first_name,
              lastName: ctx.from.last_name
            });
          }
          
          // Update session state
          ctx.session.step = 'wallet';
          
          console.log('✅ Logo processed, moving to wallet step');
          ctx.reply(`✅ Logo: ${ctx.message.text.toLowerCase() === 'skip' ? 'None' : 'Set'}\n\nNow send me your wallet address for fee collection:`);
          break;
          
        case 'wallet':
          console.log('👛 Processing wallet address:', ctx.message.text);
          
          // Basic wallet address validation
          if (!ctx.message.text.startsWith('0x') || ctx.message.text.length !== 42) {
            ctx.reply('❌ Please enter a valid Ethereum wallet address (0x...):');
            return;
          }
          
          // Update deployment session with wallet address
          await dbService.createDeploymentSession(ctx.session.telegramId, 'wallet_entered', {
            tokenName: ctx.session.tokenName,
            tokenSymbol: ctx.session.tokenSymbol,
            tradingFee: ctx.session.tokenFee,
            logoUrl: ctx.session.tokenLogo,
            walletAddress: ctx.message.text,
            username: ctx.from.username,
            firstName: ctx.from.first_name,
            lastName: ctx.from.last_name
          });
          
          const tokenName = ctx.session.tokenName;
          const tokenSymbol = ctx.session.tokenSymbol;
          const tokenFee = ctx.session.tokenFee;
          const tokenLogo = ctx.session.tokenLogo;
          const walletAddress = ctx.message.text;
          
          const summary = `🎯 Token Creation Summary:

📝 Name: ${tokenName}
🔤 Symbol: ${tokenSymbol}
💰 Trading Fee: ${(tokenFee * 100).toFixed(1)}%
🖼️ Logo: ${tokenLogo || 'None'}
👛 Wallet: ${walletAddress.substring(0, 8)}...${walletAddress.substring(walletAddress.length - 6)}

🚀 Your token is ready to be created!

Note: This is a demo version. In the full version, I would:
• Deploy the smart contract
• Set up liquidity pools
• Configure trading parameters
• Provide deployment links

Use /createToken to create another token!`;
          
          ctx.reply(summary);
          
          // Clean up session
          ctx.session = { ...ctx.session, creatingToken: false, step: null };
          console.log('✅ Token creation completed, session cleared');
          break;
          
        default:
          console.log('❓ Unknown step:', ctx.session.step);
          ctx.reply('❌ Something went wrong. Please use /createToken to start over.');
          ctx.session = { ...ctx.session, creatingToken: false, step: null };
          break;
      }
    } catch (error) {
      logger.error('Error in token creation flow:', error);
      ctx.reply('❌ Error processing your input. Please try again or use /createToken to restart.');
    }
  } else {
    // Default response for non-command text when not in token creation mode
    console.log('💬 Default text handler - not in token creation mode');
    console.log('Session state:', ctx.session);
    ctx.reply('💬 I heard you say: "' + ctx.message.text + '"\n\nUse /help to see available commands!');
  }
});

// Error handling
bot.catch((err, ctx) => {
  logger.error('Bot error:', err);
  ctx.reply('❌ An error occurred. Please try again later.');
});

// Start the bot with database initialization
async function startBot() {
  try {
    await initializeServices();
    
    console.log('📡 Starting Launch Goblin Bot with polling...');
    
    await bot.launch({ polling: true });
    
    console.log('✅ Launch Goblin Bot started successfully!');
    console.log('🔄 Polling for messages...');
    console.log('🚀 Go to Telegram and test with /start');
    console.log('🎯 Available commands: /start, /createToken, /listTokens, /tokenStats, /help');
    
  } catch (error) {
    console.error('❌ Bot failed to start:', error.message);
    process.exit(1);
  }
}

// Handle shutdown
process.once('SIGINT', () => {
  console.log('🛑 Stopping Launch Goblin Bot...');
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  console.log('🛑 Stopping Launch Goblin Bot...');
  bot.stop('SIGTERM');
});

// Start the bot
startBot();
