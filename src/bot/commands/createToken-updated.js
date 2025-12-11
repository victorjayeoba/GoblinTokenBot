// Updated version of createToken.js with MetaMask + WalletConnect integration

const constants = require('../../config/constants');
const TokenDeploymentService = require('../../blockchain/deployToken');
const Validator = require('../../utils/validator');

// Shared session management across all handlers
const userSessions = new Map();

module.exports = (bot, dbService, walletService) => {
  const deploymentService = new TokenDeploymentService(walletService);

  // ... existing code ...

  bot.action('use_existing_wallet', async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const session = userSessions.get(telegramId);
      if (!session || session.step !== 'wallet_choice') return;
      
      session.step = 'wallet_connect';
      await dbService.upsertTokenDraft(telegramId, { 
        step: 'wallet_connect', 
        tokenName: session.data.tokenName, 
        tokenSymbol: session.data.tokenSymbol, 
        imageUrl: session.data.imageUrl || null, 
        description: session.data.description || null, 
        creatorBuyInEth: session.data.creatorBuyInEth != null ? session.data.creatorBuyInEth : null 
      });
      
      await ctx.answerCbQuery();
      
      // Generate unique session ID for wallet connection
      const sessionId = `wallet_${telegramId}_${Date.now()}`;
      session.data.walletSessionId = sessionId;
      
      // Create web app URL for wallet connection with WalletConnect Project ID
      const webAppUrl = `${process.env.WEB_APP_URL || 'http://localhost:3000'}/wallet-connect.html?` +
        `session=${sessionId}&` +
        `projectId=${process.env.WALLETCONNECT_PROJECT_ID || 'YOUR_WALLETCONNECT_PROJECT_ID'}`;
      
      await ctx.reply('🔗 **Connect Your Wallet Securely**\n\n' +
        'Click the button below to connect your wallet using MetaMask or WalletConnect.\n\n' +
        '✅ **Secure**: No private keys needed\n' +
        '✅ **Fast**: One-click connection\n' +
        '✅ **Safe**: Your keys stay in your wallet', {
        reply_markup: {
          inline_keyboard: [
            [ { text: '🔗 Connect Wallet', web_app: { url: webAppUrl } } ],
            [ { text: '❌ Cancel', callback_data: 'cancel_deployment' } ]
          ]
        }
      });
      
    } catch (error) {
      console.error('Error in use_existing_wallet:', error);
      await ctx.answerCbQuery();
      await ctx.reply('❌ An error occurred. Please try again.');
    }
  });

  // Handle wallet connection callback from web app
  bot.on('web_app_data', async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const session = userSessions.get(telegramId);
      
      if (!session || session.step !== 'wallet_connect') {
        await ctx.reply('❌ Invalid session. Please start over.');
        return;
      }
      
      const webAppData = JSON.parse(ctx.webAppData.data);
      
      if (webAppData.type === 'wallet_connected') {
        const { address, wallet } = webAppData;
        
        // Validate wallet address
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
          await ctx.reply('❌ Invalid wallet address received. Please try again.');
          return;
        }
        
        // Store wallet information
        session.data.userWalletAddress = address;
        session.data.connectedWallet = wallet;
        session.step = 'preview';
        
        await dbService.upsertTokenDraft(telegramId, { 
          step: 'preview', 
          tokenName: session.data.tokenName, 
          tokenSymbol: session.data.tokenSymbol, 
          imageUrl: session.data.imageUrl || null, 
          description: session.data.description || null, 
          creatorBuyInEth: session.data.creatorBuyInEth != null ? session.data.creatorBuyInEth : null, 
          userWalletAddress: address 
        });
        
        await ctx.reply(`✅ **Wallet Connected Successfully!**\n\n` +
          `🔗 **Connected via**: ${wallet}\n` +
          `📍 **Address**: \`${address}\`\n\n` +
          `Your wallet is ready for deployment!`);
        
        await showPreview(ctx, session, telegramId);
        
      } else {
        await ctx.reply('❌ Invalid wallet connection data. Please try again.');
      }
      
    } catch (error) {
      console.error('Error handling web app data:', error);
      await ctx.reply('❌ Failed to process wallet connection. Please try again.');
    }
  });

  // ... rest of existing code ...
};
