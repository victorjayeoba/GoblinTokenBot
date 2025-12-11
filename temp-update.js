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
      
      // Create web app URL for wallet connection
      const webAppUrl = `${process.env.WEB_APP_URL || 'http://localhost:3000'}/wallet-connect.html?session=${sessionId}`;
      
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
