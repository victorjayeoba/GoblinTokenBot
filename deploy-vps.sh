#!/bin/bash

# 🚀 Launch Goblin Bot VPS Deployment Script
# Run this on your VPS after connecting via SSH

echo "🚀 Starting Launch Goblin Bot VPS Deployment..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 18+ LTS
echo "📦 Installing Node.js 18+ LTS..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 globally
echo "📦 Installing PM2 Process Manager..."
npm install -g pm2

# Install Git
echo "📦 Installing Git..."
apt install git -y

# Install Nginx (optional)
echo "📦 Installing Nginx..."
apt install nginx -y

# Install UFW firewall
echo "📦 Installing UFW Firewall..."
apt install ufw -y

# Configure firewall
echo "🔥 Configuring firewall..."
ufw allow ssh
ufw allow 80
ufw allow 443
ufw --force enable

# Create bot directory
echo "📁 Creating bot directory..."
mkdir -p /opt/launch-goblin-bot
cd /opt/launch-goblin-bot

# Create environment file template
echo "📝 Creating .env template..."
cat > .env << EOF
# Launch Goblin Bot Environment Variables
BOT_TOKEN=your_telegram_bot_token_here
NODE_ENV=production
EOF

# Create PM2 ecosystem file
echo "📝 Creating PM2 ecosystem file..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'launch-goblin-bot',
    script: 'launch-goblin-enhanced.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Create startup script
echo "📝 Creating startup script..."
cat > start-bot.sh << 'EOF'
#!/bin/bash
cd /opt/launch-goblin-bot

# Check if bot is running
if pm2 list | grep -q "launch-goblin-bot"; then
    echo "🔄 Restarting bot..."
    pm2 restart launch-goblin-bot
else
    echo "🚀 Starting bot..."
    pm2 start ecosystem.config.js
fi

# Save PM2 configuration
pm2 save

echo "✅ Bot started successfully!"
echo "📊 Check status with: pm2 status"
echo "📋 View logs with: pm2 logs launch-goblin-bot"
EOF

# Make startup script executable
chmod +x start-bot.sh

# Create PM2 startup script
echo "📝 Setting up PM2 startup..."
pm2 startup

echo ""
echo "🎉 VPS Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Upload your bot files to /opt/launch-goblin-bot/"
echo "2. Edit .env file with your BOT_TOKEN"
echo "3. Run: cd /opt/launch-goblin-bot && npm install"
echo "4. Run: ./start-bot.sh"
echo ""
echo "🔧 Useful Commands:"
echo "- Check bot status: pm2 status"
echo "- View logs: pm2 logs launch-goblin-bot"
echo "- Restart bot: pm2 restart launch-goblin-bot"
echo "- Stop bot: pm2 stop launch-goblin-bot"
echo ""
echo "🌐 Nginx is installed and configured"
echo "🔥 Firewall is enabled (SSH, HTTP, HTTPS allowed)"
echo ""
echo "🚀 Your VPS is ready for the Launch Goblin Bot!"
