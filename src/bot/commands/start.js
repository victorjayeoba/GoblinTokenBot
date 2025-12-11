import constants from '../../config/constants.js';

export default (bot, dbService, walletService) => {
  bot.start(async (ctx) => {
    try {
      const welcomeMessage = constants.MESSAGES.WELCOME;
      
      await ctx.reply(welcomeMessage, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🚀 Create Token', callback_data: 'create_token' },
              { text: '📊 View Stats', callback_data: 'view_stats' }
            ],
            [
              { text: '📋 List Tokens', callback_data: 'list_tokens' },
              { text: '❓ Help', callback_data: 'help' }
            ]
          ]
        }
      });
      
    } catch (error) {
      console.error('Error in start command:', error);
      await ctx.reply('❌ An error occurred. Please try again.');
    }
  });

  // Handle callback queries from inline keyboard
  bot.action('create_token', async (ctx) => {
    await ctx.answerCbQuery();
    // Directly start createToken flow
    try {
      const telegramId = ctx.from.id;
      const username = ctx.from.username || ctx.from.first_name;
      
      // In groups, don't prompt; redirect to DM and start there
      if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        try {
          await ctx.reply(`🔒 <a href="tg://user?id=${telegramId}">${username}</a> for security, please continue token creation in DM. I've sent you a message privately.`, { parse_mode: 'HTML' });

          // Initialize session in DM
          const createTokenModule = await import('./createToken.js');
          const { userSessions } = createTokenModule;
          if (!userSessions) throw new Error('userSessions not available from createToken module');

          userSessions.set(telegramId, { 
            step: 'name', 
            data: { 
              username, 
              firstName: ctx.from.first_name, 
              lastName: ctx.from.last_name,
              isFromGroup: true,
              userId: telegramId,
              groupId: ctx.chat.id,
              groupTitle: ctx.chat.title || 'Group'
            } 
          });

          await dbService.createDeploymentSession(telegramId, 'name', { username, firstName: ctx.from.first_name, lastName: ctx.from.last_name });
          await dbService.upsertTokenDraft(telegramId, { step: 'name', tokenName: null, tokenSymbol: null, imageUrl: null, imageFileId: null, imageCid: null, description: null, creatorBuyInEth: null });

          await ctx.telegram.sendMessage(telegramId, constants.MESSAGES.TOKEN_CREATION_START);
          await ctx.telegram.sendMessage(telegramId, constants.MESSAGES.TOKEN_CREATION_NAME);
        } catch (e) {
          console.error('Failed to start DM session from group create_token:', e);
        }
        return;
      }
      
      // Use shared session management from createToken module
      const createTokenModule = await import('./createToken.js');
      const { userSessions } = createTokenModule;
      
      if (!userSessions) {
        throw new Error('userSessions not available from createToken module');
      }
      
      userSessions.set(telegramId, { step: 'name', data: { username, firstName: ctx.from.first_name, lastName: ctx.from.last_name } });

      // Save initial session to database
      await dbService.createDeploymentSession(telegramId, 'name', {
        username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name
      });
      await dbService.upsertTokenDraft(telegramId, { step: 'name', tokenName: null, tokenSymbol: null, imageUrl: null, imageFileId: null, imageCid: null, description: null, creatorBuyInEth: null });

      // Private chat: proceed with prompts
      await ctx.reply(constants.MESSAGES.TOKEN_CREATION_START);
      await ctx.reply(constants.MESSAGES.TOKEN_CREATION_NAME);
      
    } catch (error) {
      console.error('Error in createToken command:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      await ctx.reply(`❌ An error occurred: ${error.message}`);
    }
  });

  bot.action('view_stats', async (ctx) => {
    await ctx.answerCbQuery();
    // Directly show token stats
    try {
      const telegramId = ctx.from.id;
      
      // Get user's tokens
      const userTokens = await dbService.getTokensByUser(telegramId);
      
      // Get overall platform stats
      const overallStats = await dbService.getTokenStats();
      
      if (userTokens.length === 0) {
        await ctx.reply('📊 <b>Your Token Statistics</b>\n\n' +
          '❌ You haven\'t deployed any tokens yet.\n\n' +
          'Use /createToken to deploy your first token!', {
          parse_mode: 'HTML'
        });
        return;
      }

      // Build user stats message
      let userStatsMessage = '📊 <b>Your Token Statistics</b>\n\n';
      
      userTokens.forEach((token, index) => {
        userStatsMessage += `${index + 1}. <b>${token.token_name} (${token.token_symbol})</b>\n` +
          `   📄 Contract: <code>${token.token_address}</code>\n` +
          `   💰 Trading Fee: ${token.trading_fee}%\n` +
          `   📈 Total Volume: ${token.total_volume || 0} ETH\n` +
          `   💸 Total Fees: ${token.total_fees || 0} ETH\n` +
          `   🕒 Deployed: ${new Date(token.deployment_time).toLocaleDateString()}\n\n`;
      });

      // Add overall platform stats
      if (overallStats) {
        userStatsMessage += '🌐 <b>Platform Statistics</b>\n\n' +
          `📊 Total Tokens: ${overallStats.total_tokens}\n` +
          `📈 Total Volume: ${overallStats.total_volume || 0} ETH\n` +
          `💸 Total Fees: ${overallStats.total_fees || 0} ETH\n` +
          `💰 Average Trading Fee: ${overallStats.avg_trading_fee || 0}%\n\n`;
      }

      userStatsMessage += '💡 <b>Quick Actions</b>\n' +
        '• Use /createToken to deploy more tokens\n' +
        '• Use /listTokens to see all platform tokens\n' +
        '• Use /help for more commands';

      await ctx.reply(userStatsMessage, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🚀 Deploy New Token', callback_data: 'create_token' },
              { text: '📋 View All Tokens', callback_data: 'list_tokens' }
            ],
            [
              { text: '🔄 Refresh Stats', callback_data: 'refresh_stats' }
            ]
          ]
        }
      });

    } catch (error) {
      console.error('Error in tokenStats command:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      await ctx.reply(`❌ Failed to load token statistics: ${error.message}`);
    }
  });

  bot.action('list_tokens', async (ctx) => {
    await ctx.answerCbQuery();
    // Directly show token list
    try {
      // Get all tokens from the platform
      const allTokens = await dbService.getAllTokens();
      
      if (allTokens.length === 0) {
        await ctx.reply('📋 <b>All Platform Tokens</b>\n\n' +
          '❌ No tokens have been deployed yet.\n\n' +
          'Be the first to deploy a token using /createToken!', {
          parse_mode: 'HTML'
        });
        return;
      }

      // Build tokens list message with alternating background colors
      let tokensMessage = '📋 <b>All Platform Tokens</b>\n\n';
      
      allTokens.forEach((token, index) => {
        // Add alternating background colors for better readability
        const bgColor = index % 2 === 0 ? '🟦' : '🟨';
        
        tokensMessage += `${bgColor} <b>${token.token_name} (${token.token_symbol})</b>\n` +
          `   👤 Creator: @${token.username || 'Unknown'}\n` +
          `   📄 Contract: <code>${token.token_address}</code>\n` +
          `   💰 Trading Fee: ${token.trading_fee}%\n` +
          `   📈 Total Volume: ${token.total_volume || 0} ETH\n` +
          `   💸 Total Fees: ${token.total_fees || 0} ETH\n` +
          `   🕒 Deployed: ${new Date(token.deployment_time).toLocaleDateString()}\n\n`;
      });

      // Add summary statistics
      const totalTokens = allTokens.length;
      const totalVolume = allTokens.reduce((sum, token) => sum + (token.total_volume || 0), 0);
      const totalFees = allTokens.reduce((sum, token) => sum + (token.total_fees || 0), 0);
      const avgFee = allTokens.reduce((sum, token) => sum + token.trading_fee, 0) / totalTokens;

      tokensMessage += '📊 <b>Platform Summary</b>\n\n' +
        `📈 Total Tokens: ${totalTokens}\n` +
        `💰 Total Volume: ${totalVolume.toFixed(4)} ETH\n` +
        `💸 Total Fees: ${totalFees.toFixed(4)} ETH\n` +
        `📊 Average Trading Fee: ${avgFee.toFixed(2)}%\n\n` +
        '💡 <b>Quick Actions</b>\n' +
        '• Use /createToken to deploy your own token\n' +
        '• Use /tokenStats to view your statistics\n' +
        '• Use /help for more commands';

      await ctx.reply(tokensMessage, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🚀 Deploy Token', callback_data: 'create_token' },
              { text: '📊 View Stats', callback_data: 'view_stats' }
            ],
            [
              { text: '🔄 Refresh List', callback_data: 'refresh_list' }
            ]
          ]
        }
      });

    } catch (error) {
      console.error('Error in listTokens command:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      await ctx.reply(`❌ Failed to load token list: ${error.message}`);
    }
  });

  bot.action('help', async (ctx) => {
    await ctx.answerCbQuery();
    // Directly show help
    try {
      const helpMessage = constants.MESSAGES.HELP;
      
      await ctx.reply(helpMessage, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🚀 Create Token', callback_data: 'help_create_token' },
              { text: '📊 View Stats', callback_data: 'help_view_stats' }
            ],
            [
              { text: '📋 List Tokens', callback_data: 'help_list_tokens' },
              { text: '❓ More Help', callback_data: 'help_more' }
            ]
          ]
        }
      });
      
    } catch (error) {
      console.error('Error in help command:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      await ctx.reply(`❌ An error occurred: ${error.message}`);
    }
  });
}; 