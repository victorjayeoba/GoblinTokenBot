/* eslint-disable no-console */
import dotenv from 'dotenv';
dotenv.config();

import constants from '../src/config/constants.js';
import WalletService from '../src/services/walletService.js';
import TokenDeploymentService from '../src/blockchain/deployToken.js';

async function main() {
  // Force Base Sepolia for this script
  process.env.CHAIN_ID = process.env.CHAIN_ID || '84532';
  process.env.RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org';

  const PRIVATE_KEY = (process.env.PRIVATE_KEY || '').startsWith('0x')
    ? process.env.PRIVATE_KEY
    : `0x${process.env.PRIVATE_KEY || ''}`;

  if (!PRIVATE_KEY || PRIVATE_KEY.length < 64) {
    throw new Error('Set PRIVATE_KEY in .env to deploy via Clanker');
  }

  const tokenName = process.env.TOKEN_NAME || 'TestToken';
  const tokenSymbol = process.env.TOKEN_SYMBOL || 'TT';
  const description = process.env.TOKEN_DESCRIPTION || 'Token created via Launch Goblin (Clanker v4)';
  const creatorBuyInEth = process.env.CREATOR_BUYIN_ETH || process.env.MIN_CONTRACT_DEV_BUY_ETH || '0.01';

  const walletService = new WalletService();
  const deployer = new TokenDeploymentService(walletService);

  const deploymentData = {
    tokenName,
    tokenSymbol,
    description,
    imageUrl: process.env.TOKEN_IMAGE || '',
    autoDevBuy: false,
    creatorBuyInEth,
    initialMarketCap: process.env.INITIAL_MCAP_ETH || '10',
    platform: 'CLI',
  };

  console.log('Deploying via Clanker v4 to Base Sepolia with:', {
    tokenName,
    tokenSymbol,
    creatorBuyInEth,
  });

  const res = await deployer.deployConditionalToken(deploymentData, PRIVATE_KEY);
  console.log('Clanker token deployed at:', res.tokenAddress, 'tx:', res.txHash);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});


