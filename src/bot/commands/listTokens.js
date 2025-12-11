import constants from '../../config/constants.js';

export default (bot, dbService) => {
  bot.hears(/^\/listtokens$/i, async (ctx) => {
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

      // Split message if it's too long (Telegram has a 4096 character limit)
      if (tokensMessage.length > 4000) {
        const chunks = splitMessage(tokensMessage, 4000);
        
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const isLast = i === chunks.length - 1;
          
          await ctx.reply(chunk, {
            parse_mode: 'HTML',
            reply_markup: isLast ? {
              inline_keyboard: [
                [
                  { text: '🚀 Deploy Token', callback_data: 'create_token' },
                  { text: '📊 View Stats', callback_data: 'view_stats' }
                ],
                [
                  { text: '🔄 Refresh List', callback_data: 'refresh_list' }
                ]
              ]
            } : undefined
          });
        }
      } else {
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
      }

    } catch (error) {
      console.error('Error in listTokens command:', error);
      await ctx.reply('❌ Failed to load token list. Please try again.');
    }
  });

  // Handle callback queries
  bot.action('refresh_list', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      
      // Get updated token list
      const allTokens = await dbService.getAllTokens();
      
      if (allTokens.length === 0) {
        await ctx.editMessageText('📋 <b>All Platform Tokens (Refreshed)</b>\n\n' +
          '❌ No tokens have been deployed yet.\n\n' +
          'Be the first to deploy a token using /createToken!', {
          parse_mode: 'HTML'
        });
        return;
      }

      // Build updated tokens list message
      let tokensMessage = '📋 <b>All Platform Tokens (Refreshed)</b>\n\n';
      
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

      // Update the message
      await ctx.editMessageText(tokensMessage, {
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
      console.error('Error refreshing token list:', error);
      await ctx.answerCbQuery('❌ Failed to refresh token list');
    }
  });

  bot.action('create_token', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Use /createToken to start creating your token!');
  });

  bot.action('view_stats', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Use /tokenStats to view your token statistics!');
  });

  /**
   * Split a long message into chunks
   * @param {string} message - Message to split
   * @param {number} maxLength - Maximum length per chunk
   * @returns {Array} Array of message chunks
   */
  function splitMessage(message, maxLength) {
    const chunks = [];
    let currentChunk = '';
    
    const lines = message.split('\n');
    
    for (const line of lines) {
      if ((currentChunk + line + '\n').length > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        // If a single line is too long, split it
        if (line.length > maxLength) {
          const words = line.split(' ');
          let tempLine = '';
          
          for (const word of words) {
            if ((tempLine + word + ' ').length > maxLength) {
              if (tempLine) {
                chunks.push(tempLine.trim());
                tempLine = '';
              }
              tempLine = word + ' ';
            } else {
              tempLine += word + ' ';
            }
          }
          
          if (tempLine) {
            currentChunk = tempLine;
          }
        } else {
          currentChunk = line + '\n';
        }
      } else {
        currentChunk += line + '\n';
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }
}; 