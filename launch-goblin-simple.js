// launch-goblin-simple.js - Simplified Launch Goblin Bot
require('dotenv').config();
const { Telegraf } = require('telegraf');
const logger = require('./src/utils/logger');

console.log('🚀 Starting Launch Goblin Bot (Simplified)...');
console.log('📋 Token loaded:', process.env.BOT_TOKEN ? 'YES' : 'NO');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Basic commands
bot.command('start', (ctx) => {
  const welcomeMessage = `🚀 Welcome to Launch Goblin Bot!

I'm your AI-powered launch assistant for creating and managing tokens.

📋 Available Commands:
/createToken - Create a new token
/listTokens - View all your tokens
/tokenStats - Get token statistics
/help - Show detailed help
/ping - Test bot response

🎯 Get started with /createToken to launch your first token!`;
  
  ctx.reply(welcomeMessage);
});

bot.command('ping', (ctx) => {
  ctx.reply('🏓 Pong! Bot is responsive!');
});

bot.command('test', (ctx) => {
  ctx.reply('✅ Launch Goblin Bot test successful!');
});

// Launch Goblin Commands
bot.command('createToken', async (ctx) => {
  try {
    const message = `🎯 Token Creation Wizard

I'll help you create a new token! Here's what I need:

1️⃣ Token Name (e.g., "My Awesome Token")
2️⃣ Token Symbol (e.g., "MAT")
3️⃣ Total Supply (e.g., 1000000)
4️⃣ Network (Ethereum, BSC, etc.)

📝 Please send me the token name first, or type "cancel" to stop.`;

    ctx.reply(message);
    
    // Set up conversation state (simplified)
    ctx.session = { ...ctx.session, creatingToken: true, step: 'name' };
    
  } catch (error) {
    logger.error('Error in createToken command:', error);
    ctx.reply('❌ Error starting token creation. Please try again.');
  }
});

bot.command('listTokens', async (ctx) => {
  try {
    // Simplified token listing (mock data for now)
    const tokens = [
      { name: 'Sample Token 1', symbol: 'ST1', supply: '1,000,000', network: 'Ethereum' },
      { name: 'Sample Token 2', symbol: 'ST2', supply: '500,000', network: 'BSC' }
    ];
    
    let message = '📋 Your Tokens:\n\n';
    
    if (tokens.length === 0) {
      message += 'No tokens found. Create your first one with /createToken!';
    } else {
      tokens.forEach((token, index) => {
        message += `${index + 1}. ${token.name} (${token.symbol})\n`;
        message += `   Supply: ${token.supply}\n`;
        message += `   Network: ${token.network}\n\n`;
      });
    }
    
    ctx.reply(message);
    
  } catch (error) {
    logger.error('Error in listTokens command:', error);
    ctx.reply('❌ Error listing tokens. Please try again.');
  }
});

bot.command('tokenStats', async (ctx) => {
  try {
    const stats = {
      totalTokens: 2,
      totalSupply: '1,500,000',
      networks: ['Ethereum', 'BSC'],
      lastCreated: '2024-01-15'
    };
    
    const message = `📊 Token Statistics

🎯 Total Tokens: ${stats.totalTokens}
💰 Total Supply: ${stats.totalSupply}
🌐 Networks: ${stats.networks.join(', ')}
📅 Last Created: ${stats.lastCreated}

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

💡 Tips:
• Use /start to see all commands
• Type "cancel" during creation to stop
• Check /tokenStats for overview

Need more help? The bot will guide you through each step!`;
  
  ctx.reply(helpMessage);
});

// Handle text messages (for token creation flow)
bot.on('text', async (ctx) => {
  // Only process free-form text in private chats; ignore in groups to prevent spam
  if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
    return;
  }
  const text = ctx.message.text.toLowerCase();
  
  if (text === 'cancel') {
    ctx.session = { ...ctx.session, creatingToken: false, step: null };
    ctx.reply('❌ Token creation cancelled. Use /createToken to start again.');
    return;
  }
  
  // Simple token creation flow
  if (ctx.session && ctx.session.creatingToken) {
    const step = ctx.session.step;
    
    switch (step) {
      case 'name':
        ctx.session.tokenName = ctx.message.text;
        ctx.session.step = 'symbol';
        ctx.reply(`✅ Token Name: ${ctx.message.text}\n\nNow send me the token symbol (e.g., "MAT"):`);
        break;
        
      case 'symbol':
        ctx.session.tokenSymbol = ctx.message.text;
        ctx.session.step = 'supply';
        ctx.reply(`✅ Token Symbol: ${ctx.message.text}\n\nNow send me the total supply (e.g., 1000000):`);
        break;
        
      case 'supply':
        ctx.session.tokenSupply = ctx.message.text;
        ctx.session.step = 'network';
        ctx.reply(`✅ Total Supply: ${ctx.message.text}\n\nNow send me the network (Ethereum, BSC, Polygon):`);
        break;
        
      case 'network':
        const tokenName = ctx.session.tokenName;
        const tokenSymbol = ctx.session.tokenSymbol;
        const tokenSupply = ctx.session.tokenSupply;
        const network = ctx.message.text;
        
        const summary = `🎯 Token Creation Summary:

📝 Name: ${tokenName}
🔤 Symbol: ${tokenSymbol}
💰 Supply: ${tokenSupply}
🌐 Network: ${network}

🚀 Your token is ready to be created!

Note: This is a simplified demo. In the full version, I would:
• Deploy the smart contract
• Set up liquidity pools
• Configure trading parameters
• Provide deployment links

Use /createToken to create another token!`;
        
        ctx.reply(summary);
        ctx.session = { ...ctx.session, creatingToken: false, step: null };
        break;
    }
  } else {
    // Default response for non-command text
    ctx.reply('💬 I heard you say: "' + ctx.message.text + '"\n\nUse /help to see available commands!');
  }
});

// Error handling
bot.catch((err, ctx) => {
  logger.error('Bot error:', err);
  ctx.reply('❌ An error occurred. Please try again later.');
});

// Start the bot with explicit polling (the working method)
console.log('📡 Starting Launch Goblin Bot with polling...');

bot.launch({ polling: true })
  .then(() => {
    console.log('✅ Launch Goblin Bot started successfully!');
    console.log('🔄 Polling for messages...');
    console.log('🚀 Go to Telegram and test with /start');
    console.log('🎯 Available commands: /start, /createToken, /listTokens, /tokenStats, /help');
  })
  .catch((error) => {
    console.error('❌ Bot failed to start:', error.message);
  });

// Handle shutdown
process.once('SIGINT', () => {
  console.log('🛑 Stopping Launch Goblin Bot...');
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  console.log('🛑 Stopping Launch Goblin Bot...');
  bot.stop('SIGTERM');
});
