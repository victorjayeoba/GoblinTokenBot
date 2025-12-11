#!/bin/bash

echo "🔄 Updating wallet connection with WalletConnect..."

# Copy the updated wallet-connect.html to server
cp public/wallet-connect.html /root/Goblinbot/public/wallet-connect.html

echo "✅ Updated wallet-connect.html with WalletConnect integration"
echo "📱 Features added:"
echo "   - WalletConnect SDK integration"
echo "   - QR code generation"
echo "   - Mobile wallet support"
echo "   - Better Telegram compatibility"

echo ""
echo "🚀 Restart your bot to apply changes:"
echo "   npm start"
