#!/bin/bash

# 🚀 Deploy Working Launch Goblin Bot to VPS
# Run this from your local machine

echo "🚀 Deploying working Launch Goblin Bot to VPS..."

# Get VPS IP from user
read -p "Enter your VPS IP address: " VPS_IP
read -p "Enter your VPS username (usually 'root'): " VPS_USER

echo "📡 Connecting to VPS at $VPS_IP..."

# Upload working files
echo "📤 Uploading working bot files..."
scp launch-goblin-enhanced.js $VPS_USER@$VPS_IP:/opt/launch-goblin-bot/
scp -r ./src $VPS_USER@$VPS_IP:/opt/launch-goblin-bot/
scp package.json $VPS_USER@$VPS_IP:/opt/launch-goblin-bot/

# Check if .env exists and upload it
if [ -f ".env" ]; then
    echo "📤 Uploading .env file..."
    scp .env $VPS_USER@$VPS_IP:/opt/launch-goblin-bot/
else
    echo "⚠️  No .env file found. You'll need to create one on the VPS."
fi

echo "✅ Files uploaded successfully!"
echo ""
echo "🔧 Now SSH into your VPS and run these commands:"
echo ""
echo "ssh $VPS_USER@$VPS_IP"
echo "cd /opt/launch-goblin-bot"
echo "pm2 stop launch-goblin-bot"
echo "pm2 delete launch-goblin-bot"
echo "npm install"
echo "pm2 start launch-goblin-enhanced.js --name 'launch-goblin-bot'"
echo "pm2 save"
echo "pm2 status"
echo ""
echo "🎯 Your working bot will be running in no time!"
