import constants from '../../config/constants.js';
import TokenDeploymentService from '../../blockchain/deployToken.js';
import Validator from '../../utils/validator.js';
import IPFSService from '../../services/ipfsService.js';

// Shared session management across all handlers
const userSessions = new Map();

export default (bot, dbService, walletService) => {
  const deploymentService = new TokenDeploymentService(walletService);
  const ipfsService = new IPFSService();

  // Derive environment/network labels and explorer host based on CHAIN_ID
  function getNetworkContext() {
    const chainId = Number(constants.CHAIN_ID);
    const isMainnet = chainId === 8453;
    const isBaseSepolia = chainId === 84532;
    const modeBadge = isMainnet ? '🟢 MAINNET MODE' : '🧪 TESTNET MODE';
    const ethLabel = isMainnet
      ? 'ETH on Base mainnet'
      : (isBaseSepolia ? 'testnet ETH on Base Sepolia' : 'testnet ETH on current network');
    const scanHost = isMainnet ? 'basescan.org' : (isBaseSepolia ? 'sepolia.basescan.org' : 'basescan.org');
    return { modeBadge, ethLabel, scanHost };
  }

  // Generate appropriate buttons based on network
  function getSuccessButtons(contractAddress) {
    const { scanHost } = getNetworkContext();
    const isTestnet = constants.CHAIN_ID === 84532;
    
    const buttons = [
      [
        { text: '🔍 View Contract', url: `https://${scanHost}/address/${contractAddress}` }
      ]
    ];
    
    if (isTestnet) {
      // Testnet buttons - show token view instead of DexScreener
      buttons[0].push({ text: '🪙 View Token', url: `https://${scanHost}/token/${contractAddress}` });
      buttons.push([
        { text: '📊 View on Clanker.World', url: `https://clanker.world/clanker/${contractAddress}` }
      ]);
    } else {
      // Mainnet buttons - show DexScreener (may not show until first trade)
      buttons[0].push({ text: '📊 View on DexScreener', url: `https://dexscreener.com/base/${contractAddress}` });
      buttons.push([
        { text: '📊 View on Clanker.World', url: `https://clanker.world/clanker/${contractAddress}` }
      ]);
    }
    
    return buttons;
  }

  bot.hears(/^\/createtoken$/i, async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const username = ctx.from.username || ctx.from.first_name;

      // If in group/supergroup, post security notice and move to DM
      if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        await ctx.reply(`🔒 <a href="tg://user?id=${telegramId}">${username}</a> for security, please continue in DM. I've sent you a message privately.`, { parse_mode: 'HTML' });

        try {
          userSessions.set(telegramId, { step: 'name', data: { username, firstName: ctx.from.first_name, lastName: ctx.from.last_name, isFromGroup: true, userId: telegramId, groupId: ctx.chat.id, groupTitle: ctx.chat.title || 'Group' } });
          await dbService.createDeploymentSession(telegramId, 'name', { username, firstName: ctx.from.first_name, lastName: ctx.from.last_name });
          await dbService.upsertTokenDraft(telegramId, { step: 'name', tokenName: null, tokenSymbol: null, imageUrl: null, imageFileId: null, imageCid: null, description: null, creatorBuyInEth: null });
          await ctx.telegram.sendMessage(telegramId, constants.MESSAGES.TOKEN_CREATION_START);
          await sendCurrentStepPrompt(ctx, userSessions.get(telegramId), telegramId);
        } catch (e) {
          console.log('Could not start DM for /createtoken from group:', e.message);
        }
        return;
      }

      // Private chat flow
      userSessions.set(telegramId, { step: 'name', data: { username, firstName: ctx.from.first_name, lastName: ctx.from.last_name } });
      await dbService.createDeploymentSession(telegramId, 'name', { username, firstName: ctx.from.first_name, lastName: ctx.from.last_name });
      await dbService.upsertTokenDraft(telegramId, { step: 'name', tokenName: null, tokenSymbol: null, imageUrl: null, imageFileId: null, imageCid: null, description: null, creatorBuyInEth: null });
      await ctx.reply(constants.MESSAGES.TOKEN_CREATION_START);
      await ctx.reply(constants.MESSAGES.TOKEN_CREATION_NAME);
      
    } catch (error) {
      console.error('Error in createToken command:', error);
      await ctx.reply('❌ An error occurred. Please try again.');
    }
  });

  // Handle text messages for token creation flow
  bot.on('text', async (ctx, next) => {
    try {
      const telegramId = ctx.from.id;
      const session = userSessions.get(telegramId);
      
      console.log('📝 Text message received from user:', telegramId);
      console.log('📝 Session exists:', !!session);
      console.log('📝 Current step:', session?.step);
      console.log('📝 Message text:', ctx.text);
      
      if (!session) return; // Not in token creation flow

      // CRITICAL: Redirect to DM if user is in a group during token creation
      if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        // Allow safe, read-only commands to run in groups without redirect
        const safeCmdPattern = /^\/(listtokens|tokenstats|help)(@\w+)?\b/i;
        if (safeCmdPattern.test(ctx.text || '')) {
          return next();
        }
        
        const username = ctx.from.username || ctx.from.first_name;
        await ctx.reply(`🔒 <a href="tg://user?id=${telegramId}">${username}</a> For security, please continue token creation in DM. I've sent you a message privately.`, {
          parse_mode: 'HTML'
        });
        
        // Send DM redirect message
        try {
          await ctx.telegram.sendMessage(telegramId, 
            `🔒 <b>Security Notice</b>\n\n` +
            `You're currently creating a token. For security reasons, all token creation must happen in private messages.\n\n` +
            `Please continue here in DM. Your session is saved and you can continue where you left off.\n\n` +
            `Current step: ${session.step}`,
            { parse_mode: 'HTML' }
          );

          // Immediately send the appropriate prompt for the current step
          await sendCurrentStepPrompt(ctx, session, telegramId);
        } catch (error) {
          console.log('Could not send DM redirect:', error.message);
        }
        return;
      }

      const text = ctx.text.trim();
      
      // Allow /cancel to pass through to its command handler
      if (/^\/cancel$/i.test(text)) {
        return next();
      }
      
      // Ignore other commands when user is in an active session
      if (text.startsWith('/')) {
        await ctx.reply('⚠️ You\'re currently in the middle of creating a token. Please complete the current step or use /cancel to start over.');
        return;
      }
      
      
      switch (session.step) {
        case 'name':
          await handleTokenName(ctx, session, text, telegramId);
          break;
        case 'symbol':
          await handleTokenSymbol(ctx, session, text, telegramId);
          break;
        case 'image':
          await handleImageSkipOrInvalid(ctx, session, text, telegramId);
          break;
        case 'description':
          await handleDescription(ctx, session, text, telegramId);
          break;
        case 'buyin':
          await handleBuyIn(ctx, session, text, telegramId);
          break;
        case 'wallet_address':
          await handleWalletAddress(ctx, session, text, telegramId);
          break;
        
        default:
          break;
      }
      
    } catch (error) {
      console.error('Error handling text message:', error);
      await ctx.reply('❌ An error occurred. Please try again.');
    }
  });

  // Handle photo messages for image
  bot.on('photo', async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const session = userSessions.get(telegramId);
      
      if (!session || session.step !== 'image') return;

      const photo = ctx.message.photo[ctx.message.photo.length - 1]; // Get highest quality
      const file = await ctx.telegram.getFile(photo.file_id);
      
      // Validate image file
      const validation = Validator.validateImageFile(file);
      if (!validation.isValid) {
        await ctx.reply(`❌ ${validation.error}`);
        return;
      }

      await ctx.reply('🖼️ Processing your image... This may take a moment.');
      
      // Process image: Telegram → IPFS
      const result = await ipfsService.processTelegramImage(photo.file_id, process.env.BOT_TOKEN);
      
      if (!result.success) {
        await ctx.reply('❌ Failed to process image. Please try again.');
        console.error('IPFS processing failed:', result.error);
        return;
      }

      // Store all image data
      session.data.imageUrl = result.ipfsUrl; // ipfs://CID format for Clanker
      session.data.imageFileId = photo.file_id;
      session.data.imageCid = result.cid;
      
      await ctx.reply(`✅ Image uploaded successfully!\n`);
      
      // Send preview of the uploaded image
      const previewUrl = `https://ipfs.io/ipfs/${result.cid}`;
      await ctx.reply(`🖼️ <b>Image Preview:</b>\n<a href="${previewUrl}">View Image</a>`, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '👀 View Image', url: previewUrl }]
          ]
        }
      });
      
      // Move to description step
      session.step = 'description';
      await dbService.upsertTokenDraft(telegramId, { 
        step: 'description', 
        tokenName: session.data.tokenName, 
        tokenSymbol: session.data.tokenSymbol, 
        imageUrl: session.data.imageUrl,
        imageFileId: session.data.imageFileId,
        imageCid: session.data.imageCid
      });
      await ctx.reply(constants.MESSAGES.TOKEN_CREATION_DESCRIPTION, { parse_mode: 'HTML' });
      
    } catch (error) {
      console.error('Error handling photo:', error);
      await ctx.reply('❌ Failed to process logo. Please try again.');
    }
  });

  async function handleTokenName(ctx, session, text, telegramId) {
    console.log('🔍 Token name validation - Original text:', text);
    const name = Validator.sanitizeInput(text);
    console.log('🔍 Token name validation - Sanitized name:', name);
    const v = Validator.validateTokenName(name);
    console.log('🔍 Token name validation - Validation result:', v);
    if (!v.isValid) { 
      console.log('❌ Token name validation failed:', v.error);
      await ctx.reply(constants.ERRORS.INVALID_TOKEN_NAME); 
      return; 
    }
    console.log('✅ Token name validation passed:', name);
    session.data.tokenName = name;
    session.step = 'symbol';
    await dbService.createDeploymentSession(telegramId, 'symbol', session.data);
    await dbService.upsertTokenDraft(telegramId, { step: 'symbol', tokenName: session.data.tokenName });
    await ctx.reply(constants.MESSAGES.TOKEN_CREATION_SYMBOL);
  }

  // Helper: send the prompt for the user's current step in DM
  async function sendCurrentStepPrompt(ctx, session, telegramId) {
    try {
      switch (session.step) {
        case 'name':
          await ctx.telegram.sendMessage(telegramId, constants.MESSAGES.TOKEN_CREATION_NAME);
          break;
        case 'symbol':
          await ctx.telegram.sendMessage(telegramId, constants.MESSAGES.TOKEN_CREATION_SYMBOL);
          break;
        case 'image':
          await ctx.telegram.sendMessage(telegramId, constants.MESSAGES.TOKEN_CREATION_IMAGE);
          break;
        case 'description':
          await ctx.telegram.sendMessage(telegramId, constants.MESSAGES.TOKEN_CREATION_DESCRIPTION, { parse_mode: 'HTML' });
          break;
        case 'buyin':
          await ctx.telegram.sendMessage(telegramId, constants.MESSAGES.TOKEN_CREATION_BUYIN);
          break;
        case 'wallet_choice':
        case 'wallet_generated':
        case 'waiting_for_wallet_connection':
        case 'preview':
          // For later steps, send a gentle nudge
          await ctx.telegram.sendMessage(telegramId, 'Please continue from your last step. If you want to start over, send /cancel.');
          break;
        default:
          await ctx.telegram.sendMessage(telegramId, 'Let’s continue. If you want to start fresh, send /cancel and then /createtoken.');
      }
    } catch (e) {
      console.log('Failed to send current step prompt:', e.message);
    }
  }

  async function handleTokenSymbol(ctx, session, text, telegramId) {
    const sym = Validator.sanitizeInput(text).toUpperCase();
    const isValid = /^[A-Z]{2,10}$/.test(sym);
    if (!isValid) { await ctx.reply(constants.ERRORS.INVALID_SYMBOL); return; }
    session.data.tokenSymbol = sym;
    session.step = 'image';
    await dbService.createDeploymentSession(telegramId, 'image', session.data);
    await dbService.upsertTokenDraft(telegramId, { step: 'image', tokenName: session.data.tokenName, tokenSymbol: session.data.tokenSymbol });
    await ctx.reply(constants.MESSAGES.TOKEN_CREATION_IMAGE);
  }

  async function handleImageSkipOrInvalid(ctx, session, text, telegramId) {
    if (text.toLowerCase() === 'skip') {
      session.data.imageUrl = null;
      session.data.imageFileId = null;
      session.data.imageCid = null;
      await ctx.reply('✅ Image skipped.');
      session.step = 'description';
      await dbService.createDeploymentSession(telegramId, 'description', session.data);
      await dbService.upsertTokenDraft(telegramId, { 
        step: 'description', 
        tokenName: session.data.tokenName, 
        tokenSymbol: session.data.tokenSymbol, 
        imageUrl: null,
        imageFileId: null,
        imageCid: null
      });
      const descriptionMessage = constants.MESSAGES.TOKEN_CREATION_DESCRIPTION;
      await ctx.reply(descriptionMessage, { parse_mode: 'HTML' });
    } else {
      await ctx.reply(constants.ERRORS.INVALID_IMAGE);
    }
  }

  async function handleDescription(ctx, session, text, telegramId) {
    if (text.toLowerCase() === 'skip') {
      session.data.description = null;
      await ctx.reply('✅ Description skipped.');
    } else {
      const desc = Validator.sanitizeInput(text);
      if (desc.length > 500) { 
        const remaining = 500 - desc.length;
        await ctx.reply(`❌ Description too long! You used ${desc.length} characters (${Math.abs(remaining)} over the limit).\n\nPlease shorten your description to 500 characters or less.`); 
        return; 
      }
      session.data.description = desc;
      await ctx.reply('✅ Description saved!');
    }
    session.step = 'buyin';
    await dbService.upsertTokenDraft(telegramId, { step: 'buyin', tokenName: session.data.tokenName, tokenSymbol: session.data.tokenSymbol, imageUrl: session.data.imageUrl || null, imageFileId: session.data.imageFileId || null, imageCid: session.data.imageCid || null, description: session.data.description || null });
    await ctx.reply(constants.MESSAGES.TOKEN_CREATION_BUYIN);
  }

  async function handleBuyIn(ctx, session, text, telegramId) {
    if (text.toLowerCase() === 'skip') {
      session.data.creatorBuyInEth = null;
    } else {
      const amount = parseFloat(text);
      const minBuyIn = constants.MIN_CONTRACT_DEV_BUY_ETH || 0.01;
      if (isNaN(amount) || amount < minBuyIn || amount > 1) { 
        await ctx.reply(`Invalid amount. Enter ${minBuyIn}–1 ETH or type skip.`); 
        return; 
      }
      session.data.creatorBuyInEth = amount;
    }
    session.step = 'wallet_choice';
    await dbService.upsertTokenDraft(telegramId, { step: 'wallet_choice', tokenName: session.data.tokenName, tokenSymbol: session.data.tokenSymbol, imageUrl: session.data.imageUrl || null, imageFileId: session.data.imageFileId || null, imageCid: session.data.imageCid || null, description: session.data.description || null, creatorBuyInEth: session.data.creatorBuyInEth != null ? session.data.creatorBuyInEth : null });
    await showWalletChoice(ctx, session, telegramId);
  }

  async function showWalletChoice(ctx, session, telegramId) {
    const preview = `👀 Token Preview\n\n📝 Name: ${session.data.tokenName}\n💎 Ticker: ${session.data.tokenSymbol}\n📄 Description: ${session.data.description || '—'}\n🖼️ Image: ${session.data.imageUrl ? 'Provided' : 'None'}\n💰 Fees: 1% total (0.2% Clanker + 0.3% Team + 0.5% Creator)\n🎁 Creator rewards: ${constants.CREATOR_REWARD_PERCENTAGE}% to deployer\n💳 Buy-in: ${session.data.creatorBuyInEth != null ? session.data.creatorBuyInEth + ' ETH' : 'None'}\n\nLet's generate a smart wallet to use for deployment costs, creator buy-in, & as a fee receiver.`;
    
    await ctx.reply(preview, { parse_mode: 'HTML' });
    
    // Automatically proceed to wallet generation
    await generateWallet(ctx, session, telegramId);
  }

  async function generateWallet(ctx, session, telegramId) {
    // Update session step and proceed to deployment
    session.step = 'wallet_generated';
    await dbService.createDeploymentSession(telegramId, 'wallet_generated', session.data);
    await deployViaSdk(ctx, session, telegramId);
  }

  async function handleWalletAddress(ctx, session, text, telegramId) {
    const address = text.trim();
    
    // Validate wallet address
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      await ctx.reply('❌ Invalid wallet address format. Please enter a valid Ethereum address (0x...).');
      return;
    }

    session.data.userWalletAddress = address;
    // Note: We don't store the private key for security reasons
    // Users will need to connect their wallet through a different method
    session.step = 'preview';
    await dbService.upsertTokenDraft(telegramId, { step: 'preview', tokenName: session.data.tokenName, tokenSymbol: session.data.tokenSymbol, imageUrl: session.data.imageUrl || null, imageFileId: session.data.imageFileId || null, imageCid: session.data.imageCid || null, description: session.data.description || null, creatorBuyInEth: session.data.creatorBuyInEth != null ? session.data.creatorBuyInEth : null, userWalletAddress: address });
    await showPreview(ctx, session, telegramId);
  }

  async function showPreview(ctx, session, telegramId) {
    const walletInfo = session.data.userWalletAddress ? 
      `🔗 <b>Wallet:</b> <code>${session.data.userWalletAddress}</code>` : 
      '🔗 <b>Wallet:</b> Will be generated';
    
    const preview = `👀 <b>Token Preview</b>\n\n` +
      `📝 <b>Name:</b> ${session.data.tokenName}\n` +
      `💎 <b>Ticker:</b> ${session.data.tokenSymbol}\n` +
      `📄 <b>Description:</b> ${session.data.description || '—'}\n` +
      `🖼️ <b>Image:</b> ${session.data.imageUrl ? 'Provided' : 'None'}\n` +
      `💰 <b>Fees:</b> 1% total (0.2% Clanker + 0.3% Team + 0.5% Creator)\n` +
      `🎁 <b>Creator rewards:</b> ${constants.CREATOR_REWARD_PERCENTAGE}% to deployer\n` +
      `💳 <b>Buy-in:</b> ${session.data.creatorBuyInEth != null ? session.data.creatorBuyInEth + ' ETH' : 'None'}\n` +
      `${walletInfo}\n\n` +
      `Ready to deploy your token?`;
    
    await ctx.reply(preview, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [ { text: '🚀 Sign & Deploy', callback_data: 'sign_deploy' } ],
          [ { text: '❌ Cancel', callback_data: 'cancel_deployment' } ]
        ]
      }
    });
    session.step = 'preview';
  }

  async function proceedToWalletGeneration(ctx, session, telegramId) {
    try {
      // Generate user wallet
      const wallet = walletService.generateUserWallet(telegramId);
      session.data.walletAddress = wallet.address;
      
      // Update database session
      await dbService.createDeploymentSession(telegramId, 'wallet_generated', session.data);

      // Send wallet information
      const { modeBadge, ethLabel, scanHost } = getNetworkContext();
      const userBuyIn = session.data.creatorBuyInEth !== null ? session.data.creatorBuyInEth : 0;
      const requiredEth = (parseFloat(userBuyIn) + parseFloat(constants.GAS_RESERVE_ETH)).toFixed(6);
      const walletMessage = `${constants.MESSAGES.WALLET_GENERATED}\n\n` +
        `${modeBadge}\n\n` +
        `\`${wallet.address}\`\n\n` +
        `💰 <b>Required:</b> ${requiredEth} ${ethLabel}\n` +
        `⏳ <b>Status:</b> Waiting for funds...\n\n` +
        `Send ${ethLabel} to this address to deploy your token!`;

      await ctx.reply(walletMessage, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔍 View on BaseScan', url: `https://${scanHost}/address/${wallet.address}` },
              { text: '📊 Check Balance', callback_data: `check_balance_${wallet.address}` }
            ],
            [
              { text: '❌ Cancel', callback_data: 'cancel_deployment' }
            ]
          ]
        }
      });

      // Start monitoring wallet for funds
      startWalletMonitoring(ctx, session, telegramId, wallet.address);
      
    } catch (error) {
      console.error('Error generating wallet:', error);
      await ctx.reply('❌ Failed to generate wallet. Please try again.');
    }
  }

  async function startWalletMonitoring(ctx, session, telegramId, walletAddress) {
    const checkInterval = setInterval(async () => {
      try {
        const hasFunds = await walletService.hasSufficientFunds(walletAddress, session.data.creatorBuyInEth);
        
        if (hasFunds) {
          clearInterval(checkInterval);
          await deployToken(ctx, session, telegramId, walletAddress);
        }
      } catch (error) {
        console.error('Error checking wallet balance:', error);
      }
    }, 30000); // Check every 30 seconds

    // Store interval reference for cleanup
    session.checkInterval = checkInterval;
  }

  async function deployToken(ctx, session, telegramId, walletAddress) {
    try {
      await ctx.reply(constants.MESSAGES.DEPLOYMENT_IN_PROGRESS);

      // Deploy token with telegram context
      const deploymentData = {
        ...session.data,
        telegramId: telegramId,
        messageId: ctx.message?.message_id?.toString() || '',
        userWalletAddress: walletAddress, // Add wallet address to deployment data
      };
      
      const deploymentResult = await deploymentService.deployConditionalToken(
        deploymentData,
        session.data.userPrivateKey || null
      );

      if (deploymentResult.success) {
        // Save token to database
        const user = await dbService.getUser(telegramId);
        await dbService.saveToken({
          userId: user.id,
          username: session.data.username,
          tokenName: session.data.tokenName,
          tokenSymbol: session.data.tokenSymbol,
          tokenAddress: deploymentResult.contractAddress,
          tradingFee: session.data.tradingFee,
          logoUrl: session.data.logoUrl,
          walletAddress: walletAddress,
          deploymentTxHash: deploymentResult.txHash,
          initialMarketCap: 5
        });

        // Send success message
        const { scanHost } = getNetworkContext();
        const successMessage = `${constants.MESSAGES.DEPLOYMENT_SUCCESS}\n\n` +
          `🎯 <b>Token Details:</b>\n` +
          `📝 Name: ${session.data.tokenName}\n` +
          `💎 Symbol: ${session.data.tokenSymbol}\n` +
          `💰 Trading Fee: ${session.data.tradingFee}%\n` +
          `📄 Contract: <code>${deploymentResult.contractAddress}</code>\n` +
          `🔗 Transaction: <code>${deploymentResult.txHash}</code>\n\n` +
          `🌐 <b>Links:</b>\n` +
          `• <a href="https://${scanHost}/tx/${deploymentResult.txHash}">BaseScan</a>`;

        await ctx.reply(successMessage, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: getSuccessButtons(deploymentResult.contractAddress)
          }
        });

        // Clean up session
        userSessions.delete(telegramId);
        
      } else {
        throw new Error('Deployment failed');
      }
      
    } catch (error) {
      console.error('Error deploying token:', error);
      await ctx.reply(constants.MESSAGES.DEPLOYMENT_FAILED);
      
      // Clean up session
      userSessions.delete(telegramId);
    }
  }

  // Handle callback queries
  bot.action(/check_balance_(.+)/, async (ctx) => {
    try {
      const walletAddress = ctx.match[1];
      const balance = await walletService.getEthBalance(walletAddress);
      
      await ctx.answerCbQuery();
      await ctx.reply(`💰 Wallet Balance: ${balance} ETH`);
      
    } catch (error) {
      console.error('Error checking balance:', error);
      await ctx.answerCbQuery();
      await ctx.reply('❌ Failed to check balance');
    }
  });

  bot.action('use_existing_wallet', async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const session = userSessions.get(telegramId);
      if (!session || session.step !== 'wallet_choice') return;
      
      // Update session to wait for web app data
      session.step = 'waiting_for_wallet_connection';
      console.log('🔄 Updated session step to:', session.step);
      console.log('💾 Saving session to database...');
      await dbService.upsertTokenDraft(telegramId, { 
        step: 'waiting_for_wallet_connection', 
        tokenName: session.data.tokenName, 
        tokenSymbol: session.data.tokenSymbol, 
        imageUrl: session.data.imageUrl || null, 
        imageFileId: session.data.imageFileId || null,
        imageCid: session.data.imageCid || null,
        description: session.data.description || null, 
        creatorBuyInEth: session.data.creatorBuyInEth != null ? session.data.creatorBuyInEth : null 
      });
      console.log('✅ Session saved to database');
      
      // Start polling for wallet connection data
      startWalletConnectionPolling(ctx, session, telegramId);
      
      await ctx.answerCbQuery();
      
      // Create web app URL with session data
      const webAppUrl = `${process.env.WEB_APP_URL || 'http://localhost:3000'}/wallet-connect?` +
        `telegramId=${telegramId}&` +
        `tokenName=${encodeURIComponent(session.data.tokenName)}&` +
        `tokenSymbol=${encodeURIComponent(session.data.tokenSymbol)}&` +
        `description=${encodeURIComponent(session.data.description || '')}&` +
        `buyIn=${session.data.creatorBuyInEth || 0}`;
      
      console.log('🌐 Generated web app URL:', webAppUrl);
      
      await ctx.reply('🔗 <b>Connect Your Wallet</b>\n\n' +
        'Click the button below to open the wallet connection interface in your browser.\n\n' +
        '⚠️ <b>Important:</b>\n' +
        '• Make sure you have MetaMask or another Web3 wallet installed\n' +
        '• Connect to Base network\n' +
        '• Ensure your wallet has ETH for gas fees\n\n' +
        'After connecting, you\'ll be redirected back to complete the deployment.', {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔗 Open Wallet Connect', web_app: { url: webAppUrl } }],
            [{ text: '❌ Cancel', callback_data: 'cancel_deployment' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error in use_existing_wallet:', error);
      await ctx.answerCbQuery();
      await ctx.reply('❌ Error opening wallet connection. Please try again.');
    }
  });

  bot.action('generate_new_wallet', async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const session = userSessions.get(telegramId);
      if (!session || session.step !== 'wallet_choice') return;
      
      await ctx.answerCbQuery();
      await deployViaSdk(ctx, session, telegramId);
    } catch (error) {
      await ctx.answerCbQuery();
    }
  });

  bot.action('confirm_description', async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const session = userSessions.get(telegramId);
      if (!session || !session.tempDescription) return;
      
      session.data.description = session.tempDescription;
      delete session.tempDescription;
      session.step = 'buyin';
      
      await dbService.upsertTokenDraft(telegramId, { step: 'buyin', tokenName: session.data.tokenName, tokenSymbol: session.data.tokenSymbol, imageUrl: session.data.imageUrl || null, imageFileId: session.data.imageFileId || null, imageCid: session.data.imageCid || null, description: session.data.description });
      
      await ctx.answerCbQuery();
      await ctx.reply('✅ Description saved!');
      await ctx.reply(constants.MESSAGES.TOKEN_CREATION_BUYIN);
    } catch (error) {
      await ctx.answerCbQuery();
    }
  });

  bot.action('edit_description', async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const session = userSessions.get(telegramId);
      if (!session) return;
      
      delete session.tempDescription;
      
      await ctx.answerCbQuery();
      await ctx.reply('✏️ Please enter your description again:');
    } catch (error) {
      await ctx.answerCbQuery();
    }
  });

  bot.action('skip_description', async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const session = userSessions.get(telegramId);
      if (!session) return;
      
      session.data.description = null;
      delete session.tempDescription;
      session.step = 'buyin';
      
      await dbService.upsertTokenDraft(telegramId, { step: 'buyin', tokenName: session.data.tokenName, tokenSymbol: session.data.tokenSymbol, imageUrl: session.data.imageUrl || null, imageFileId: session.data.imageFileId || null, imageCid: session.data.imageCid || null, description: null });
      
      await ctx.answerCbQuery();
      await ctx.reply('✅ Description skipped.');
      await ctx.reply(constants.MESSAGES.TOKEN_CREATION_BUYIN);
    } catch (error) {
      await ctx.answerCbQuery();
    }
  });

  bot.action('sign_deploy', async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const session = userSessions.get(telegramId);
      if (!session || session.step !== 'preview') return;
      // Auto-set backend config context
      session.data.context = { interface: 'Telegram Bot' };
      session.data.tradingFee = 1;
      await ctx.answerCbQuery();
      await deployViaSdk(ctx, session, telegramId);
    } catch (error) {
      await ctx.answerCbQuery();
    }
  });

  async function deployViaSdk(ctx, session, telegramId) {
    try {
      // CRITICAL: Never show wallet details in groups
      if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        await ctx.reply('🔒 For security, please continue in DM. I\'ve sent you a message privately.');
        
        // Send DM redirect with current step
        try {
          await ctx.telegram.sendMessage(telegramId, 
            `🔒 <b>Security Notice</b>\n\n` +
            `You're about to see sensitive wallet information. For security, this must happen in private messages.\n\n` +
            `Please continue here in DM. Your session is saved.`,
            { parse_mode: 'HTML' }
          );
        } catch (error) {
          console.log('Could not send DM redirect:', error.message);
        }
        return;
      }

      let walletAddress;
      let isGeneratedWallet = false;

      if (session.data.userWalletAddress) {
        // User provided their own wallet
        walletAddress = session.data.userWalletAddress;
        await ctx.reply(`💳 <b>Using your wallet:</b> <code>${walletAddress}</code>\n\n⏳ <b>Status:</b> Ready to deploy...`, { parse_mode: 'HTML' });
      } else {
        // Generate new wallet for user
        const wallet = walletService.generateUserWallet(telegramId);
        walletAddress = wallet.address;
        session.data.userPrivateKey = wallet.privateKey; // Store for gas payments
        isGeneratedWallet = true;
        
        // Send wallet information with private key
        const { modeBadge, ethLabel, scanHost } = getNetworkContext();
        const userBuyIn = session.data.creatorBuyInEth !== null ? session.data.creatorBuyInEth : 0;
        const requiredEth2 = (parseFloat(userBuyIn) + parseFloat(constants.GAS_RESERVE_ETH)).toFixed(6);
        const walletMessage = `🔑 <b>Here's Your New Wallet!</b>\n\n` +
          `${modeBadge}\n\n` +
          `<b>Address:</b> <code>${wallet.address}</code>\n` +
          `<b>Private Key:</b> <code>${wallet.privateKey}</code>\n\n` +
          `⚠️ <b>SAVE THESE DETAILS!</b>\n` +
          `• Import into MetaMask using private key\n` +
          `• You own this wallet and any remaining funds\n` +
          `• Send ${ethLabel} to the address above to deploy your token\n\n` +
          `💰 <b>Required:</b> ${requiredEth2} ${ethLabel} (for gas fees + buy-in)\n` +
          `⏳ <b>Status:</b> Waiting for funds...`;

        const walletMsg = await ctx.reply(walletMessage, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📋 Copy Details & Continue', callback_data: 'copy_wallet_details' }
              ],
              [
                { text: '🔍 View on BaseScan', url: `https://${scanHost}/address/${wallet.address}` },
                { text: '📊 Check Balance', callback_data: `check_balance_${wallet.address}` }
              ],
              [
                { text: '❌ Cancel', callback_data: 'cancel_deployment' }
              ]
            ]
          }
        });
        
        // Store message ID for deletion
        session.data.walletMessageId = walletMsg.message_id;
      }

      session.data.walletAddress = walletAddress;
      
      // Update database sessions
      await dbService.createDeploymentSession(telegramId, 'wallet_ready', session.data);

      if (isGeneratedWallet) {
        // Start monitoring generated wallet for funds
        startWalletMonitoring(ctx, session, telegramId, walletAddress);
      } else {
        // Deploy immediately with user's wallet
        await deployToken(ctx, session, telegramId, walletAddress);
      }
      
    } catch (error) {
      console.error('Error in deployment setup:', error);
      await ctx.reply('❌ Failed to setup deployment. Please try again.');
    }
  }

  async function startWalletMonitoring(ctx, session, telegramId, walletAddress) {
    const checkInterval = setInterval(async () => {
      try {
        const hasFunds = await walletService.hasSufficientFunds(walletAddress, session.data.creatorBuyInEth);
        
        if (hasFunds) {
          clearInterval(checkInterval);
          await deployToken(ctx, session, telegramId, walletAddress);
        }
      } catch (error) {
        console.error('Error checking wallet balance:', error);
      }
    }, 30000); // Check every 30 seconds

    // Store interval reference for cleanup
    session.checkInterval = checkInterval;
  }

  async function deployToken(ctx, session, telegramId, walletAddress) {
    try {
      await ctx.reply(constants.MESSAGES.DEPLOYMENT_IN_PROGRESS);

      // Deploy token with telegram context
      const deploymentData = {
        ...session.data,
        telegramId: telegramId,
        messageId: ctx.message?.message_id?.toString() || '',
        userWalletAddress: walletAddress, // Add wallet address to deployment data
      };
      
      const deploymentResult = await deploymentService.deployConditionalToken(
        deploymentData,
        session.data.userPrivateKey || null
      );

      if (deploymentResult.success) {
        // Save token to database
        const user = await dbService.getUser(telegramId);
        await dbService.saveToken({
          userId: user.id,
          username: session.data.username,
          tokenName: session.data.tokenName,
          tokenSymbol: session.data.tokenSymbol,
          tokenAddress: deploymentResult.contractAddress,
          tradingFee: 1,
          logoUrl: session.data.imageUrl || null,
          walletAddress: walletAddress,
          deploymentTxHash: deploymentResult.txHash,
          initialMarketCap: 10
        });

        await dbService.deleteTokenDraft(telegramId);

        // Send success message
        const { scanHost } = getNetworkContext();
        const successMessage = `🎉 <b>Token Deployed Successfully!</b>\n\n` +
          `<b>Transaction:</b> <code>${deploymentResult.txHash}</code>\n` +
          `<b>Contract:</b> <code>${deploymentResult.contractAddress}</code>\n\n` +
          `💰 <b>Remaining ETH:</b> You can withdraw any remaining ETH from your wallet using the private key you saved earlier.`;

        await ctx.reply(successMessage, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: getSuccessButtons(deploymentResult.contractAddress)
          }
        });

        // Clean up session
        userSessions.delete(telegramId);
        
      } else {
        throw new Error('Deployment failed');
      }
      
    } catch (error) {
      console.error('Error deploying token:', error);
      await ctx.reply(constants.MESSAGES.DEPLOYMENT_FAILED);
      
      // Clean up session
      userSessions.delete(telegramId);
    }
  }

  bot.action('copy_wallet_details', async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const session = userSessions.get(telegramId);
      
      if (!session) return;

      // CRITICAL: Never show wallet details in groups
      if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        await ctx.answerCbQuery('🔒 Please continue in DM for security');
        
        // Send DM redirect
        try {
          await ctx.telegram.sendMessage(telegramId, 
            `🔒 <b>Security Notice</b>\n\n` +
            `You clicked a button to copy wallet details. For security, this must happen in private messages.\n\n` +
            `Please continue here in DM. Your session is saved.`,
            { parse_mode: 'HTML' }
          );
        } catch (error) {
          console.log('Could not send DM redirect:', error.message);
        }
        return;
      }
      
      // Get the wallet details from session
      const walletAddress = session.data.walletAddress;
      const privateKey = session.data.userPrivateKey;
      
      if (!walletAddress || !privateKey) {
        await ctx.answerCbQuery('❌ Wallet details not found');
        return;
      }
      
      await ctx.answerCbQuery('📋 Sending wallet details for easy copying...');
      
      // Send wallet details in a separate message for easy copying
      const copyableDetails = `🔑 <b>Your Wallet Details - Copy These:</b>\n\n` +
        `<b>Address:</b>\n<code>${walletAddress}</code>\n\n` +
        `<b>Private Key:</b>\n<code>${privateKey}</code>\n\n` +
        `⚠️ <b>IMPORTANT:</b>\n` +
        `• Long press and select the text above to copy\n` +
        `• Import into MetaMask using the private key\n` +
        `• Keep these details safe and secure`;
      
      const copyableMsg = await ctx.reply(copyableDetails, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ I\'ve Saved the Details', callback_data: 'details_saved' }
            ],
            [
              { text: '❌ Cancel', callback_data: 'cancel_deployment' }
            ]
          ]
        }
      });
      
      // Store the copyable details message ID for potential deletion
      session.data.copyableDetailsMessageId = copyableMsg.message_id;
      
    } catch (error) {
      console.error('Error handling copy wallet details:', error);
      await ctx.answerCbQuery('❌ Error occurred');
    }
  });

  bot.action('details_saved', async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const session = userSessions.get(telegramId);
      
      if (!session) return;

      // CRITICAL: Never process sensitive actions in groups
      if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        await ctx.answerCbQuery('🔒 Please continue in DM for security');
        
        // Send DM redirect
        try {
          await ctx.telegram.sendMessage(telegramId, 
            `🔒 <b>Security Notice</b>\n\n` +
            `You clicked a button to continue deployment. For security, this must happen in private messages.\n\n` +
            `Please continue here in DM. Your session is saved.`,
            { parse_mode: 'HTML' }
          );
        } catch (error) {
          console.log('Could not send DM redirect:', error.message);
        }
        return;
      }
      
      await ctx.answerCbQuery('✅ Great! Proceeding to deployment...');
      
      // Delete the wallet message with sensitive details
      if (session.data.walletMessageId) {
        try {
          await ctx.deleteMessage(session.data.walletMessageId);
        } catch (error) {
          console.log('Could not delete wallet message:', error.message);
        }
      }
      
      // Delete the copyable details message (current message)
      try {
        await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
      } catch (error) {
        console.log('Could not delete copyable details message:', error.message);
      }
      
      // Send confirmation and proceed
      const { ethLabel } = getNetworkContext();
      const userBuyIn = session.data.creatorBuyInEth !== null ? session.data.creatorBuyInEth : 0;
      const requiredEth2 = (parseFloat(userBuyIn) + parseFloat(constants.GAS_RESERVE_ETH)).toFixed(6);
      
      await ctx.reply('✅ <b>Wallet details saved!</b>\n\n' +
        'Your wallet is ready for deployment. The bot will monitor for incoming ETH and automatically deploy your token when funds are received.\n\n' +
        `💰 <b>Required:</b> ${requiredEth2} ${ethLabel} (for gas fees + buy-in)\n` +
        '⏳ <b>Status:</b> Waiting for funds...', {
        parse_mode: 'HTML'
      });
      
    } catch (error) {
      console.error('Error handling details saved:', error);
      await ctx.answerCbQuery('❌ Error occurred');
    }
  });

  bot.action('cancel_deployment', async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const session = userSessions.get(telegramId);

      // CRITICAL: Never process sensitive actions in groups
      if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        await ctx.answerCbQuery('🔒 Please continue in DM for security');
        
        // Send DM redirect
        try {
          await ctx.telegram.sendMessage(telegramId, 
            `🔒 <b>Security Notice</b>\n\n` +
            `You clicked a button to cancel deployment. For security, this must happen in private messages.\n\n` +
            `Please continue here in DM. Your session is saved.`,
            { parse_mode: 'HTML' }
          );
        } catch (error) {
          console.log('Could not send DM redirect:', error.message);
        }
        return;
      }
      
      if (session && session.checkInterval) {
        clearInterval(session.checkInterval);
      }
      
      // Delete wallet message with sensitive details
      if (session && session.data.walletMessageId) {
        try {
          await ctx.deleteMessage(session.data.walletMessageId);
        } catch (error) {
          console.log('Could not delete wallet message:', error.message);
        }
      }
      
      // Delete copyable details message if it exists
      if (session && session.data.copyableDetailsMessageId) {
        try {
          await ctx.deleteMessage(session.data.copyableDetailsMessageId);
        } catch (error) {
          console.log('Could not delete copyable details message:', error.message);
        }
      }
      
      if (session) {
        userSessions.delete(telegramId);
      }
      
      await ctx.answerCbQuery();
      await ctx.reply('❌ Token deployment cancelled. Use /createToken to start over.');
      
    } catch (error) {
      console.error('Error cancelling deployment:', error);
      await ctx.answerCbQuery();
      await ctx.reply('❌ Error cancelling deployment');
    }
  });

  // Handle web app data from wallet connection
  bot.on('web_app_data', async (ctx) => {
    try {
      console.log('🔗 Web app data received:', ctx.webAppData.data);
      const telegramId = ctx.from.id;
      const session = userSessions.get(telegramId);
      
      console.log('👤 Session found:', !!session);
      console.log('📋 Current step:', session?.step);
      console.log('⏳ Expected step: waiting_for_wallet_connection');
      
      if (!session || session.step !== 'waiting_for_wallet_connection') {
        console.log('❌ Session validation failed');
        await ctx.reply('❌ No active wallet connection session found.');
        return;
      }

      // Parse web app data
      const webAppData = JSON.parse(ctx.webAppData.data);
      
      if (!webAppData.walletAddress || !webAppData.walletConnected) {
        await ctx.reply('❌ Wallet connection failed. Please try again.');
        return;
      }

      // Validate wallet address
      if (!/^0x[a-fA-F0-9]{40}$/.test(webAppData.walletAddress)) {
        await ctx.reply('❌ Invalid wallet address received. Please try again.');
        return;
      }

      // Update session with wallet data
      session.data.userWalletAddress = webAppData.walletAddress;
      session.data.walletConnected = true;
      session.step = 'preview';
      
      // Update database
      await dbService.upsertTokenDraft(telegramId, { 
        step: 'preview', 
        tokenName: session.data.tokenName, 
        tokenSymbol: session.data.tokenSymbol, 
        imageUrl: session.data.imageUrl || null, 
        description: session.data.description || null, 
        creatorBuyInEth: session.data.creatorBuyInEth != null ? session.data.creatorBuyInEth : null,
        userWalletAddress: webAppData.walletAddress
      });

      // Show preview with connected wallet
      await ctx.reply('✅ <b>Wallet Connected Successfully!</b>\n\n' +
        `🔗 <b>Connected Wallet:</b> <code>${webAppData.walletAddress}</code>\n\n` +
        'Your wallet is now connected and ready for deployment.', { parse_mode: 'HTML' });
      
      await showPreview(ctx, session, telegramId);
      
    } catch (error) {
      console.error('Error handling web app data:', error);
      await ctx.reply('❌ Error processing wallet connection. Please try again.');
    }
  });
  
  // Function to poll for wallet connection data
  function startWalletConnectionPolling(ctx, session, telegramId) {
    console.log('🔄 Starting wallet connection polling for telegramId:', telegramId);
    
    const pollInterval = setInterval(async () => {
      try {
        // Check if session still exists and is in the right state
        const currentSession = userSessions.get(telegramId);
        if (!currentSession || currentSession.step !== 'waiting_for_wallet_connection') {
          console.log('🛑 Stopping wallet polling - session no longer valid');
          clearInterval(pollInterval);
          return;
        }
        
        // Check for wallet connection data via HTTP request
        const response = await fetch(`https://launchgoblin.bot/wallet-status/${telegramId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          console.log('✅ Wallet connection data found:', result.data);
          clearInterval(pollInterval);
          
          // Process the wallet connection data
          await processWalletConnectionData(ctx, session, telegramId, result.data);
        }
      } catch (error) {
        console.error('❌ Error polling for wallet connection:', error);
      }
    }, 2000); // Poll every 2 seconds
    
    // Store the interval reference for cleanup
    session.pollInterval = pollInterval;
    
    // Set a timeout to stop polling after 5 minutes
    setTimeout(() => {
      if (session.pollInterval) {
        console.log('⏰ Wallet connection polling timeout');
        clearInterval(session.pollInterval);
        session.pollInterval = null;
      }
    }, 5 * 60 * 1000); // 5 minutes
  }
  
  // Function to process wallet connection data
  async function processWalletConnectionData(ctx, session, telegramId, walletData) {
    try {
      console.log('🔄 Processing wallet connection data:', walletData);
      
      // Validate wallet address
      if (!/^0x[a-fA-F0-9]{40}$/.test(walletData.walletAddress)) {
        await ctx.reply('❌ Invalid wallet address received. Please try again.');
        return;
      }

      // Update session with wallet data
      session.data.userWalletAddress = walletData.walletAddress;
      session.data.walletConnected = true;
      session.step = 'preview';
      
      // Update database
      await dbService.upsertTokenDraft(telegramId, { 
        step: 'preview', 
        tokenName: session.data.tokenName, 
        tokenSymbol: session.data.tokenSymbol, 
        imageUrl: session.data.imageUrl || null, 
        description: session.data.description || null, 
        creatorBuyInEth: session.data.creatorBuyInEth != null ? session.data.creatorBuyInEth : null,
        userWalletAddress: walletData.walletAddress
      });

      // Show preview with connected wallet
      await ctx.reply('✅ <b>Wallet Connected Successfully!</b>\n\n' +
        `🔗 <b>Connected Wallet:</b> <code>${walletData.walletAddress}</code>\n\n` +
        'Your wallet is now connected and ready for deployment.', { parse_mode: 'HTML' });
      
      await showPreview(ctx, session, telegramId);
      
    } catch (error) {
      console.error('Error processing wallet connection data:', error);
      await ctx.reply('❌ Error processing wallet connection. Please try again.');
    }
  }

  // ========================================
  // COMMAND HANDLERS
  // ========================================

  // Handle /cancel command
  bot.hears(/^\/cancel$/i, async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const session = userSessions.get(telegramId);
      
      if (session && session.checkInterval) {
        clearInterval(session.checkInterval);
      }
      
      userSessions.delete(telegramId);
      
      await ctx.reply('❌ Token deployment cancelled. Use /start to begin again.');
      
    } catch (error) {
      console.error('Error cancelling deployment:', error);
      await ctx.reply('❌ Error cancelling deployment');
    }
  });

  // ========================================
  // GROUP FUNCTIONALITY - VIRAL MARKETING
  // ========================================

  // Handle bot mentions in groups and communities without auto-starting sessions
  bot.on('message', async (ctx) => {
    try {
      // Only process messages in groups/supergroups
      if (!ctx.chat || (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup')) {
        return;
      }

      // Skip if user is in a token creation session (let the text handler deal with it)
      const tgIdForSessionCheck = ctx.from.id;
      const session = userSessions.get(tgIdForSessionCheck);
      if (session && (session.step === 'name' || session.step === 'symbol' || session.step === 'image' || session.step === 'description' || session.step === 'buyin')) {
        return;
      }

      // Check if bot is mentioned
      const botUsername = process.env.BOT_USERNAME || 'launchgoblinbot';
      const messageText = ctx.message?.text || '';
      const isMentioned = messageText.includes(`@${botUsername}`) ||
        ctx.message?.entities?.some(entity => {
          if (entity.type !== 'mention') return false;
          const segment = messageText.substring(entity.offset, entity.offset + entity.length);
          return segment.toLowerCase() === `@${botUsername.toLowerCase()}`;
        });

      // Only react if a supported bot command is present, otherwise ignore
      const botCommandEntity = ctx.message?.entities?.find(e => e.type === 'bot_command');
      const commandText = botCommandEntity ? messageText.substring(botCommandEntity.offset, botCommandEntity.offset + botCommandEntity.length).toLowerCase() : '';
      const hasSupportedCommand = commandText === '/start' || commandText === '/createtoken' || /(^|\s)(\/start|\/createtoken)(\b|$)/i.test(messageText);

      if (!isMentioned || !hasSupportedCommand) return;

      const username = ctx.from.username || ctx.from.first_name;
      const telegramId = ctx.from.id;

      // Do NOT auto-start sessions from group mentions. Provide deep link to DM instead.
      const deepLink = `https://t.me/${botUsername}?start=group_deploy`;
      await ctx.reply(
        `🔒 <a href="tg://user?id=${telegramId}">${username}</a> for security, please continue in DM. Tap <a href="${deepLink}">this link</a> to start.`,
        { parse_mode: 'HTML' }
      );

    } catch (error) {
      console.error('Error handling group mention:', error);
    }
  });

  // Deprecate /deploy: guide users to /start or /createtoken without starting session
  bot.hears(/^\/deploy$/i, async (ctx) => {
    try {
      await ctx.reply('ℹ️ The /deploy command is deprecated. Please use /start or /createtoken instead.');

    } catch (error) {
      console.error('Error handling /deploy command:', error);
    }
  });

  // Handle start command with group_deploy parameter
  bot.start(async (ctx) => {
    try {
      // Only handle /start in private chats to avoid prompting in groups
      if (ctx.chat.type !== 'private') {
        return;
      }
      const startParam = ctx.startPayload;
      const telegramId = ctx.from.id;
      const username = ctx.from.username || ctx.from.first_name;

      // Initialize user session
      userSessions.set(telegramId, { 
        step: 'name', 
        data: { 
          username, 
          firstName: ctx.from.first_name, 
          lastName: ctx.from.last_name,
          isFromGroup: startParam === 'group_deploy'
        } 
      });

      // Save initial session to database
      await dbService.createDeploymentSession(telegramId, 'name', { username, firstName: ctx.from.first_name, lastName: ctx.from.last_name });
      await dbService.upsertTokenDraft(telegramId, { step: 'name', tokenName: null, tokenSymbol: null, imageUrl: null, imageFileId: null, imageCid: null, description: null, creatorBuyInEth: null });

      if (startParam === 'group_deploy') {
        await ctx.reply(`🎯 <b>Welcome to Launch Goblin!</b>

I see you came from a group! Let's create your token securely in this private chat.

${constants.MESSAGES.TOKEN_CREATION_START}`, { parse_mode: 'HTML' });
      } else {
        await ctx.reply(constants.MESSAGES.TOKEN_CREATION_START);
      }
      
      await ctx.reply(constants.MESSAGES.TOKEN_CREATION_NAME);
      
    } catch (error) {
      console.error('Error in start command:', error);
      await ctx.reply('❌ An error occurred. Please try again.');
    }
  });

  // Enhanced deployToken function to handle group announcements
  async function deployTokenWithGroupAnnouncement(ctx, session, telegramId, walletAddress) {
    try {
      await ctx.reply(constants.MESSAGES.DEPLOYMENT_IN_PROGRESS);

      // Deploy token with telegram context
      const deploymentData = {
        ...session.data,
        telegramId: telegramId,
        messageId: ctx.message?.message_id?.toString() || '',
        userWalletAddress: walletAddress,
      };
      
      const deploymentResult = await deploymentService.deployConditionalToken(
        deploymentData,
        session.data.userPrivateKey || null
      );

      if (deploymentResult.success) {
        // Save token to database
        const user = await dbService.getUser(telegramId);
        await dbService.saveToken({
          userId: user.id,
          username: session.data.username,
          tokenName: session.data.tokenName,
          tokenSymbol: session.data.tokenSymbol,
          tokenAddress: deploymentResult.contractAddress,
          tradingFee: 1,
          logoUrl: session.data.imageUrl || null,
          walletAddress: walletAddress,
          deploymentTxHash: deploymentResult.txHash,
          initialMarketCap: 10
        });

        await dbService.deleteTokenDraft(telegramId);

        // Send success message to DM
        const { scanHost } = getNetworkContext();
        const successMessage = `🎉 <b>Token Deployed Successfully!</b>\n\n` +
          `<b>Transaction:</b> <code>${deploymentResult.txHash}</code>\n` +
          `<b>Contract:</b> <code>${deploymentResult.contractAddress}</code>\n\n` +
          `💰 <b>Remaining ETH:</b> You can withdraw any remaining ETH from your wallet using the private key you saved earlier.`;

        await ctx.reply(successMessage, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: getSuccessButtons(deploymentResult.contractAddress)
          }
        });

        // Announce to group if user came from a group
        if (session.data.isFromGroup && session.data.groupId) {
          await announceDeploymentToGroup(session, deploymentResult);
        }

        // Clean up session
        userSessions.delete(telegramId);
        
      } else {
        throw new Error('Deployment failed');
      }
      
    } catch (error) {
      console.error('Error deploying token:', error);
      await ctx.reply(constants.MESSAGES.DEPLOYMENT_FAILED);
      
      // Clean up session
      userSessions.delete(telegramId);
    }
  }

  // Function to announce successful deployment to the original group
  async function announceDeploymentToGroup(session, deploymentResult) {
    try {
      if (!session.data.groupId) return;

      const { scanHost } = getNetworkContext();
      const username = session.data.username;
      const tokenName = session.data.tokenName;
      const tokenSymbol = session.data.tokenSymbol;
      const contractAddress = deploymentResult.contractAddress;

      const userId = session.data.userId;
      const taggedUser = userId ? `<a href="tg://user?id=${userId}">@${username}</a>` : `@${username}`;

      const announcementMessage = `🎉 <b>${taggedUser} successfully deployed ${tokenName} (${tokenSymbol}) with Launch Goblin!</b>

🚀 <b>Token Details:</b>
📝 <b>Name:</b> ${tokenName}
💎 <b>Symbol:</b> ${tokenSymbol}
📄 <b>Contract:</b> <code>${contractAddress}</code>

🔥 <b>Want to deploy your own token?</b>
Type <code>/createtoken</code> or mention me to get started!

<b>Launch Goblin</b> - Deploy tokens on Base with Clanker v4 🚀`;

      await bot.telegram.sendMessage(session.data.groupId, announcementMessage, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🚀 Deploy My Token', url: `https://t.me/${process.env.BOT_USERNAME || 'launchgoblinbot'}?start=group_deploy` },
              { text: '🔍 View Contract', url: `https://${scanHost}/address/${contractAddress}` }
            ],
            [
              { text: '📊 View on DexScreener', url: `https://dexscreener.com/base/${contractAddress}` }
            ]
          ]
        }
      });

    } catch (error) {
      console.error('Error announcing deployment to group:', error);
    }
  }

  // Override the original deployToken function to use the enhanced version
  const originalDeployToken = deployToken;
  deployToken = deployTokenWithGroupAnnouncement;
};

// Export the userSessions for use in other modules
export { userSessions }; 