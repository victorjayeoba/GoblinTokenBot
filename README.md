# Launch Goblin Bot

Telegram bot that deploys ERC-20 tokens on Base using the Clanker SDK, with built-in fee tracking and simple web helpers (WalletConnect / MetaMask) for end users.

## Features
- • Deploy ERC-20 tokens on Base via bot commands.
- • Fee routing aligned with Clanker v4 (creator, team, protocol shares).
- • Optional IPFS upload for token assets.
- • Web front-end helpers for WalletConnect / MetaMask signing flows.
- • SQLite persistence for minimal state.

## Prerequisites
- • Node.js 18+
- • A Base RPC URL
- • Telegram bot token
- • WalletConnect project ID
- • Clanker API key

## Setup
- • Install deps: `npm install`
- • Copy env template: `cp env.example .env`
- • Fill required values in `.env` (see below).
- • Run dev bot: `npm run dev`
- • Run simple bot: `npm run simple`
- • Run enhanced bot: `npm run enhanced`
- • Start web helper server (if used): `npm run dev` then visit `WEB_APP_URL`.

## Environment variables
Copy from `env.example` and set:
- • `BOT_TOKEN` – Telegram bot token.
- • `RPC_URL`, `CHAIN_ID` – Base network RPC + chain ID.
- • `TREASURY_PRIVATE_KEY` – used only for fee collection (users pay their own gas).
- • `CLANKER_API_KEY` – Clanker SDK key.
- • `WEB_SERVER_PORT`, `WEB_APP_URL` – for the web helper.
- • `WALLETCONNECT_PROJECT_ID` – WalletConnect v2 project ID (also update `public/wallet-connect.html`).
- • `DB_PATH` – SQLite path.
- • `IPFS_PROJECT_ID`, `IPFS_PROJECT_SECRET` – optional; enable IPFS uploads.
- • Fee splits: `CREATOR_REWARD_PERCENTAGE`, `TEAM_REWARD_PERCENTAGE`, `CLANKER_REWARD_PERCENTAGE`.
- • `TEAM_WALLET_ADDRESS`, `CAT_TOKEN_ADDRESS` – addresses for fee routing / buyback logic.

## Running
- • `npm run dev` – nodemon on `index.js` (default bot).
- • `npm run simple` / `npm run enhanced` – alternate entry points.
- • Web helper: serves WalletConnect / MetaMask pages from `public/`.

## Security notes
- • Do not commit real secrets; keep `.env` local (already gitignored).
- • Replace the placeholder WalletConnect project ID in `public/wallet-connect.html` before use.
- • Review `src/config/constants.js` for any default addresses you need to change.

## Tests
Test files were removed for sharing. Package scripts may reference them; skip or update as needed.

## Deployment
- • Set production `.env` on your host.
- • `npm install --production`
- • `npm run start` (or your preferred process manager).

## Repo hygiene
- • MD/test/sample artifacts were removed before publishing.
- • Add any future sensitive files to `.gitignore`.

