#!/bin/bash

# Create the public directory if it doesn't exist
mkdir -p /root/Goblinbot/public

# Create the wallet-connect.html file
cat > /root/Goblinbot/public/wallet-connect.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Launch Goblin - Connect Wallet</title>
    <!-- WalletConnect SDK -->
    <script src="https://unpkg.com/@walletconnect/client@1.8.0/dist/index.umd.js"></script>
    <!-- QR Code Library -->
    <script src="https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 500px;
            width: 100%;
            text-align: center;
        }
        
        .logo {
            margin-bottom: 20px;
            display: flex;
            justify-content: center;
        }
        
        .project-logo {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid #667eea;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 1.8rem;
        }
        
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 1rem;
        }
        
        .wallet-options {
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin-bottom: 30px;
        }
        
        .wallet-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            padding: 15px 20px;
            border: 2px solid #e1e5e9;
            border-radius: 12px;
            background: white;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            color: #333;
            font-size: 1rem;
            font-weight: 500;
        }
        
        .wallet-btn:hover {
            border-color: #667eea;
            background: #f8f9ff;
            transform: translateY(-2px);
        }
        
        .wallet-btn.metamask {
            border-color: #f6851b;
        }
        
        .wallet-btn.metamask:hover {
            background: #fff8f0;
        }
        
        .wallet-btn.walletconnect {
            border-color: #3b99fc;
        }
        
        .wallet-btn.walletconnect:hover {
            background: #f0f8ff;
        }
        
        .wallet-icon {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            position: relative;
        }
        
        .wallet-icon img {
            width: 100%;
            height: 100%;
            border-radius: 8px;
        }
        
        .wallet-icon span {
            font-size: 20px;
        }
        
        .metamask-icon {
            background: #f6851b;
            color: white;
        }
        
        .walletconnect-icon {
            background: #3b99fc;
            color: white;
        }
        
        .status {
            padding: 15px;
            border-radius: 12px;
            margin-bottom: 20px;
            font-weight: 500;
        }
        
        .status.connecting {
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
        }
        
        .status.connected {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .status.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .wallet-info {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            text-align: left;
        }
        
        .wallet-info h3 {
            margin-bottom: 10px;
            color: #333;
        }
        
        .wallet-address {
            font-family: monospace;
            background: white;
            padding: 10px;
            border-radius: 8px;
            border: 1px solid #e1e5e9;
            word-break: break-all;
            font-size: 0.9rem;
        }
        
        .action-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            width: 100%;
        }
        
        .action-btn:hover {
            background: #5a6fd8;
            transform: translateY(-2px);
        }
        
        .action-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
        }
        
        .back-btn {
            background: transparent;
            color: #667eea;
            border: 2px solid #667eea;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 15px;
        }
        
        .back-btn:hover {
            background: #667eea;
            color: white;
        }
        
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <img src="https://i.postimg.cc/dtnzkhK5/goblin.jpg" alt="Launch Goblin" class="project-logo">
        </div>
        <h1>Launch Goblin</h1>
        <p class="subtitle">Connect your wallet to deploy tokens</p>
        
        <div id="wallet-selection" class="wallet-options">
            <button class="wallet-btn metamask" onclick="connectMetaMask()">
                <div class="wallet-icon metamask-icon">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <span style="display:none;">🦊</span>
                </div>
                Connect MetaMask
            </button>
            
            <button class="wallet-btn walletconnect" onclick="connectWalletConnect()">
                <div class="wallet-icon walletconnect-icon">
                    <img src="https://avatars.githubusercontent.com/u/37784886?s=200&v=4" alt="WalletConnect" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <span style="display:none;">🔗</span>
                </div>
                Connect WalletConnect
            </button>
        </div>
        
        <div id="connection-status" class="status hidden">
            <span id="status-text"></span>
        </div>
        
        <div id="wallet-connected" class="hidden">
            <div class="wallet-info">
                <h3>Wallet Connected</h3>
                <p>Address: <span id="wallet-address" class="wallet-address"></span></p>
                <p>Network: <span id="wallet-network">Base</span></p>
            </div>
            
            <button id="confirm-connection" class="action-btn" onclick="confirmConnection()">
                Confirm & Return to Bot
            </button>
        </div>
        
        <button class="back-btn" onclick="goBack()">← Back to Bot</button>
    </div>

    <script>
        let connectedWallet = null;
        let walletAddress = null;
        
        // Check if we're in Telegram WebApp
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
        }
        
        async function connectMetaMask() {
            if (typeof window.ethereum === 'undefined') {
                showStatus('MetaMask not detected. Please install MetaMask first.', 'error');
                return;
            }
            
            showStatus('Connecting to MetaMask...', 'connecting');
            
            try {
                // Request account access
                const accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts'
                });
                
                if (accounts.length === 0) {
                    showStatus('No accounts found. Please unlock MetaMask.', 'error');
                    return;
                }
                
                // Check if we're on Base network
                const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                const baseChainId = '0x2105'; // Base mainnet
                
                if (chainId !== baseChainId) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_switchEthereumChain',
                            params: [{ chainId: baseChainId }],
                        });
                    } catch (switchError) {
                        // If the network doesn't exist, add it
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: baseChainId,
                                chainName: 'Base',
                                nativeCurrency: {
                                    name: 'Ethereum',
                                    symbol: 'ETH',
                                    decimals: 18,
                                },
                                rpcUrls: ['https://mainnet.base.org'],
                                blockExplorerUrls: ['https://basescan.org'],
                            }],
                        });
                    }
                }
                
                walletAddress = accounts[0];
                connectedWallet = 'MetaMask';
                showWalletConnected();
                
            } catch (error) {
                console.error('MetaMask connection error:', error);
                showStatus('Failed to connect MetaMask: ' + error.message, 'error');
            }
        }
        
        async function connectWalletConnect() {
            showStatus('WalletConnect integration coming soon!', 'error');
            // TODO: Implement WalletConnect integration
        }
        
        function showStatus(message, type) {
            const statusDiv = document.getElementById('connection-status');
            const statusText = document.getElementById('status-text');
            
            statusDiv.className = `status ${type}`;
            statusText.textContent = message;
            statusDiv.classList.remove('hidden');
        }
        
        function showWalletConnected() {
            document.getElementById('wallet-selection').classList.add('hidden');
            document.getElementById('connection-status').classList.add('hidden');
            document.getElementById('wallet-connected').classList.remove('hidden');
            
            document.getElementById('wallet-address').textContent = walletAddress;
            showStatus('Wallet connected successfully!', 'connected');
        }
        
        function confirmConnection() {
            // Send wallet address back to Telegram bot
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.sendData(JSON.stringify({
                    type: 'wallet_connected',
                    address: walletAddress,
                    wallet: connectedWallet
                }));
                window.Telegram.WebApp.close();
            } else {
                // Fallback for testing
                alert(`Wallet connected: ${walletAddress}`);
            }
        }
        
        function goBack() {
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.close();
            } else {
                // Fallback for testing
                window.history.back();
            }
        }
        
        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    // User disconnected
                    location.reload();
                } else if (accounts[0] !== walletAddress) {
                    // User switched accounts
                    walletAddress = accounts[0];
                    document.getElementById('wallet-address').textContent = walletAddress;
                }
            });
            
            window.ethereum.on('chainChanged', () => {
                location.reload();
            });
        }
    </script>
</body>
</html>
EOF

echo "✅ Created /root/Goblinbot/public/wallet-connect.html"
echo "✅ Directory structure:"
ls -la /root/Goblinbot/public/
