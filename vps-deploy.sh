#!/bin/bash

# Dragon Ball Finality Bot - VPS Deployment Script
# Run this on your DigitalOcean VPS after initial setup

echo "🐉 Dragon Ball Finality Bot - VPS Deployment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as correct user
if [ "$USER" != "dragonball" ]; then
    print_warning "Switch to dragonball user first: su - dragonball"
    exit 1
fi

# Check if in correct directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the dragon-ball-finality directory"
    exit 1
fi

print_status "Starting deployment process..."

# Pull latest changes
print_status "Pulling latest code from GitHub..."
git pull origin main

if [ $? -ne 0 ]; then
    print_error "Failed to pull from GitHub. Check your repository access."
    exit 1
fi

# Install/update dependencies
print_status "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies."
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating template..."
    cp .env.example .env
    print_warning "Please edit .env file with your bot token and other credentials:"
    print_warning "nano .env"
    read -p "Press Enter after you've configured your .env file..."
fi

# Stop existing bot if running
print_status "Stopping existing bot instance..."
pm2 stop dragonball-finality-bot 2>/dev/null || true

# Start the bot
print_status "Starting bot with PM2..."
pm2 start ecosystem.config.json

if [ $? -ne 0 ]; then
    print_error "Failed to start bot. Check the logs: pm2 logs dragonball-finality-bot"
    exit 1
fi

# Save PM2 configuration
pm2 save

# Show status
print_status "Bot deployment complete! Checking status..."
pm2 status

print_status "Recent logs:"
pm2 logs dragonball-finality-bot --lines 10

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo "Bot Status: $(pm2 jlist | jq -r '.[0].pm2_env.status' 2>/dev/null || echo 'Check with: pm2 status')"
echo ""
echo "Useful commands:"
echo "  pm2 status                     - Check bot status"
echo "  pm2 logs dragonball-finality-bot - View logs"
echo "  pm2 restart dragonball-finality-bot - Restart bot"
echo "  pm2 monit                      - Monitor resources"
echo ""
echo "To update the bot in the future, just run this script again!"
