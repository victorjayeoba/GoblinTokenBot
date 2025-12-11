import constants from '../../config/constants.js';

export default (bot, dbService) => {
  bot.hears(/^\/tokenstats$/i, async (ctx) => {
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
          `   💰 Trading Fee: ${token.trading_fee}% (v4 Structure)\n` +
          `   📈 Total Volume: ${token.total_volume || 0} ETH\n` +
          `   💸 Total Fees: ${token.total_fees || 0} ETH\n` +
          `   🎁 Creator Rewards: ${((token.total_fees || 0) * 0.5).toFixed(4)} ETH (50%)\n` +
          `   🏢 Team Rewards: ${((token.total_fees || 0) * 0.3).toFixed(4)} ETH (30%)\n` +
          `   🔧 Clanker Rewards: ${((token.total_fees || 0) * 0.2).toFixed(4)} ETH (20%)\n` +
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

      userStatsMessage += '💰 <b>Fee Structure (Clanker v4)</b>\n' +
        '• 1% total trading fee per transaction\n' +
        '• 50% → Token creator rewards\n' +
        '• 30% → Team wallet (0x51b0...206Eb)\n' +
        '• 20% → Clanker protocol\n\n' +
        '💡 <b>Quick Actions</b>\n' +
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
      await ctx.reply('❌ Failed to load token statistics. Please try again.');
    }
  });

  // Handle callback queries
  bot.action('refresh_stats', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      
      // Re-run the stats command
      const telegramId = ctx.from.id;
      
      // Get user's tokens
      const userTokens = await dbService.getTokensByUser(telegramId);
      
      // Get overall platform stats
      const overallStats = await dbService.getTokenStats();
      
      if (userTokens.length === 0) {
        await ctx.editMessageText('📊 <b>Your Token Statistics</b>\n\n' +
          '❌ You haven\'t deployed any tokens yet.\n\n' +
          'Use /createToken to deploy your first token!', {
          parse_mode: 'HTML'
        });
        return;
      }

      // Build user stats message
      let userStatsMessage = '📊 <b>Your Token Statistics (Refreshed)</b>\n\n';
      
      userTokens.forEach((token, index) => {
        userStatsMessage += `${index + 1}. <b>${token.token_name} (${token.token_symbol})</b>\n` +
          `   📄 Contract: <code>${token.token_address}</code>\n` +
          `   💰 Trading Fee: ${token.trading_fee}% (v4 Structure)\n` +
          `   📈 Total Volume: ${token.total_volume || 0} ETH\n` +
          `   💸 Total Fees: ${token.total_fees || 0} ETH\n` +
          `   🎁 Creator Rewards: ${((token.total_fees || 0) * 0.5).toFixed(4)} ETH (50%)\n` +
          `   🏢 Team Rewards: ${((token.total_fees || 0) * 0.3).toFixed(4)} ETH (30%)\n` +
          `   🔧 Clanker Rewards: ${((token.total_fees || 0) * 0.2).toFixed(4)} ETH (20%)\n` +
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

      userStatsMessage += '💰 <b>Fee Structure (Clanker v4)</b>\n' +
        '• 1% total trading fee per transaction\n' +
        '• 50% → Token creator rewards\n' +
        '• 30% → Team wallet (0x51b0...206Eb)\n' +
        '• 20% → Clanker protocol\n\n' +
        '💡 <b>Quick Actions</b>\n' +
        '• Use /createToken to deploy more tokens\n' +
        '• Use /listTokens to see all platform tokens\n' +
        '• Use /help for more commands';

      await ctx.editMessageText(userStatsMessage, {
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
      console.error('Error refreshing stats:', error);
      await ctx.answerCbQuery('❌ Failed to refresh statistics');
    }
  });

  bot.action('create_token', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Use /createToken to start creating your token!');
  });

  bot.action('list_tokens', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Use /listTokens to see all platform tokens!');
  });
}; 