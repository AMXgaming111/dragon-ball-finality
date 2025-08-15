#!/bin/bash

# Dragon Ball Finality Bot Deployment Script
# This script sets up the bot for 24/7 hosting

echo "🐉 Dragon Ball Finality Bot - Deployment Setup"
echo "=============================================="

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 not found. Installing PM2..."
    npm install -g pm2
    echo "✅ PM2 installed successfully!"
else
    echo "✅ PM2 is already installed"
fi

# Create logs directory
if [ ! -d "logs" ]; then
    mkdir logs
    echo "✅ Created logs directory"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "Please create a .env file with your bot configuration before starting."
    echo "Example:"
    echo "DISCORD_TOKEN=your_bot_token_here"
    echo "CLIENT_ID=your_client_id_here"
    echo "STAFF_ROLE_NAME=Staff"
    echo "OWNER_USER_ID=your_discord_user_id"
    exit 1
else
    echo "✅ .env file found"
fi

# Start the bot with PM2
echo "🚀 Starting bot with PM2..."
pm2 start ecosystem.config.json

# Save PM2 process list
pm2 save

# Show status
echo "📊 Bot Status:"
pm2 status

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Useful PM2 Commands:"
echo "  pm2 status                    - Check bot status"
echo "  pm2 logs dragonball-finality-bot - View bot logs"
echo "  pm2 restart dragonball-finality-bot - Restart bot"
echo "  pm2 stop dragonball-finality-bot - Stop bot"
echo "  pm2 delete dragonball-finality-bot - Remove bot from PM2"
echo ""
echo "🔧 To set up automatic startup after system reboot:"
echo "  pm2 startup"
echo "  Then run the command it provides (with sudo)"
echo ""
echo "🎯 Your bot should now be running 24/7!"
