import constants from '../../config/constants.js';

export default (bot, dbService, walletService) => {
  bot.hears(/^\/help$/i, async (ctx) => {
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
              { text: '🏠 Back to Start', callback_data: 'back_to_start' }
            ]
          ]
        }
      });
      
    } catch (error) {
      console.error('Error in help command:', error);
      await ctx.reply('❌ An error occurred. Please try again.');
    }
  });

  // Handle help callback queries
  bot.action('help_create_token', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      
      const createTokenHelp = `🚀 <b>Create Token Command</b>\n\n` +
        `<b>Usage:</b> <code>/createToken</code>\n\n` +
        `<b>What it does:</b>\n` +
        `• Guides you through token creation step by step\n` +
        `• Collects token name, symbol, and trading fee\n` +
        `• Generates a smart wallet for you\n` +
        `• Deploys your token on Base network\n\n` +
        `<b>Steps:</b>\n` +
        `1. Token name (3-50 characters)\n` +
        `2. Token symbol (2-10 characters)\n` +
        `3. Trading fee (1-20%)\n` +
        `4. Logo (optional)\n` +
        `5. Send ETH to generated wallet\n` +
        `6. Automatic deployment\n\n` +
        `<b>Requirements:</b>\n` +
        `• Minimum ${(parseFloat(constants.MIN_CONTRACT_DEV_BUY_ETH || '0.01') + parseFloat(constants.GAS_RESERVE_ETH || '0.015')).toFixed(6)} ETH for deployment\n` +
        `• Valid token name and symbol\n` +
        `• Reasonable trading fee\n\n` +
        `💡 <b>Tip:</b> Choose a memorable name and symbol for your token!`;
      
      await ctx.reply(createTokenHelp, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🚀 Start Creating', callback_data: 'start_create_token' },
              { text: '🔙 Back to Help', callback_data: 'back_to_help' }
            ]
          ]
        }
      });
      
    } catch (error) {
      console.error('Error in create token help:', error);
      await ctx.answerCbQuery('❌ Error displaying help');
    }
  });

  bot.action('help_view_stats', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      
      const statsHelp = `📊 <b>View Stats Command</b>\n\n` +
        `<b>Usage:</b> <code>/tokenStats</code>\n\n` +
        `<b>What it shows:</b>\n` +
        `• Your deployed tokens list\n` +
        `• Individual token statistics\n` +
        `• Platform-wide statistics\n` +
        `• Volume and fee data\n\n` +
        `<b>Token Stats Include:</b>\n` +
        `• Token name and symbol\n` +
        `• Contract address\n` +
        `• Trading fee percentage\n` +
        `• Total trading volume\n` +
        `• Total fees collected\n` +
        `• Deployment date\n\n` +
        `<b>Platform Stats Include:</b>\n` +
        `• Total tokens deployed\n` +
        `• Combined volume\n` +
        `• Combined fees\n` +
        `• Average trading fee\n\n` +
        `💡 <b>Tip:</b> Use this to track your token's performance!`;
      
      await ctx.reply(statsHelp, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📊 View Your Stats', callback_data: 'view_stats_now' },
              { text: '🔙 Back to Help', callback_data: 'back_to_help' }
            ]
          ]
        }
      });
      
    } catch (error) {
      console.error('Error in stats help:', error);
      await ctx.answerCbQuery('❌ Error displaying help');
    }
  });

  bot.action('help_list_tokens', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      
      const listTokensHelp = `📋 <b>List Tokens Command</b>\n\n` +
        `<b>Usage:</b> <code>/listTokens</code>\n\n` +
        `<b>What it shows:</b>\n` +
        `• All tokens deployed via Launch Goblin\n` +
        `• Creator information\n` +
        `• Token details and statistics\n` +
        `• Platform summary\n\n` +
        `<b>Token Information:</b>\n` +
        `• Token name and symbol\n` +
        `• Creator username\n` +
        `• Contract address\n` +
        `• Trading fee\n` +
        `• Volume and fees\n` +
        `• Deployment date\n\n` +
        `<b>Features:</b>\n` +
        `• Alternating row colors for readability\n` +
        `• Auto-split for long lists\n` +
        `• Refresh functionality\n` +
        `• Quick action buttons\n\n` +
        `💡 <b>Tip:</b> Discover other creators' tokens and get inspired!`;
      
      await ctx.reply(listTokensHelp, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📋 View All Tokens', callback_data: 'view_all_tokens' },
              { text: '🔙 Back to Help', callback_data: 'back_to_help' }
            ]
          ]
        }
      });
      
    } catch (error) {
      console.error('Error in list tokens help:', error);
      await ctx.answerCbQuery('❌ Error displaying help');
    }
  });

  bot.action('help_more', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      
      const moreHelp = `❓ <b>Additional Information</b>\n\n` +
        `<b>Fee Structure:</b>\n` +
        `• Creator Reward: ${constants.CREATOR_REWARD_PERCENTAGE}%\n` +
        `• Treasury: ${constants.TREASURY_REWARD_PERCENTAGE}%\n` +
        `• CAT Buyback: ${constants.BUYBACK_REWARD_PERCENTAGE}%\n\n` +
        `<b>Network:</b>\n` +
        `• Base Network (Chain ID: ${constants.CHAIN_ID})\n` +
        `• RPC: ${constants.RPC_URL}\n` +
        `• Native Token: ETH\n\n` +
        `<b>Token Requirements:</b>\n` +
        `• Name: 3-50 characters\n` +
        `• Symbol: 2-10 characters (letters/numbers only)\n` +
        `• Trading Fee: ${constants.MIN_TRADING_FEE}-${constants.MAX_TRADING_FEE}%\n` +
        `• Logo: Optional (JPG, PNG, GIF)\n\n` +
        `<b>Deployment Process:</b>\n` +
        `• Smart wallet generation\n` +
        `• ETH funding requirement\n` +
        `• Automatic deployment via Clanker SDK\n` +
        `• Liquidity seeding\n\n` +
        `💡 <b>Need more help?</b> Contact the Launch Goblin team!`;
      
      await ctx.reply(moreHelp, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔙 Back to Help', callback_data: 'back_to_help' },
              { text: '🏠 Back to Start', callback_data: 'back_to_start' }
            ]
          ]
        }
      });
      
    } catch (error) {
      console.error('Error in more help:', error);
      await ctx.answerCbQuery('❌ Error displaying help');
    }
  });

  // Navigation callback queries
  bot.action('back_to_help', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      
      const helpMessage = constants.MESSAGES.HELP;
      
      await ctx.editMessageText(helpMessage, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🚀 Create Token', callback_data: 'help_create_token' },
              { text: '📊 View Stats', callback_data: 'help_view_stats' }
            ],
            [
              { text: '📋 List Tokens', callback_data: 'help_list_tokens' },
              { text: '🏠 Back to Start', callback_data: 'back_to_start' }
            ]
          ]
        }
      });
      
    } catch (error) {
      console.error('Error going back to help:', error);
      await ctx.answerCbQuery('❌ Error navigating back');
    }
  });

  bot.action('back_to_start', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      
      const welcomeMessage = constants.MESSAGES.WELCOME;
      
      await ctx.editMessageText(welcomeMessage, {
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
      console.error('Error going back to start:', error);
      await ctx.answerCbQuery('❌ Error navigating back');
    }
  });

  // Action callback queries
  bot.action('start_create_token', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const telegramId = ctx.from.id;
      const username = ctx.from.username || ctx.from.first_name;

      // If triggered from a group, post notice and move to DM
      if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        try {
          await ctx.reply(`🔒 <a href="tg://user?id=${telegramId}">${username}</a> for security, please continue in DM. I've sent you a message privately.`, { parse_mode: 'HTML' });

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
          console.error('Failed to start DM session from help start_create_token:', e);
        }
        return;
      }

      // Private chat: start flow immediately
      const createTokenModule = await import('./createToken.js');
      const { userSessions } = createTokenModule;
      if (!userSessions) throw new Error('userSessions not available from createToken module');

      userSessions.set(telegramId, { step: 'name', data: { username, firstName: ctx.from.first_name, lastName: ctx.from.last_name } });

      await dbService.createDeploymentSession(telegramId, 'name', { username, firstName: ctx.from.first_name, lastName: ctx.from.last_name });
      await dbService.upsertTokenDraft(telegramId, { step: 'name', tokenName: null, tokenSymbol: null, imageUrl: null, imageFileId: null, imageCid: null, description: null, creatorBuyInEth: null });

      await ctx.reply(constants.MESSAGES.TOKEN_CREATION_START);
      await ctx.reply(constants.MESSAGES.TOKEN_CREATION_NAME);
    } catch (error) {
      console.error('Error handling start_create_token from help:', error);
      await ctx.reply('❌ Failed to start token creation. Please try /createtoken.');
    }
  });

  bot.action('view_stats_now', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Use /tokenStats to view your token statistics!');
  });

  bot.action('view_all_tokens', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Use /listTokens to see all platform tokens!');
  });

  bot.action('create_token', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Use /createToken to start creating your token!');
  });

  bot.action('view_stats', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Use /tokenStats to view your token statistics!');
  });

  bot.action('list_tokens', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Use /listTokens to see all platform tokens!');
  });
}; 