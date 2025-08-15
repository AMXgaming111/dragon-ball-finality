# 🌊 DigitalOcean VPS Setup Guide for Dragon Ball Finality Bot

## 📋 Prerequisites
- Credit card for DigitalOcean account
- Your GitHub repository access
- Bot token and environment variables

## 🚀 Step 1: Create DigitalOcean Account

1. Go to **https://digitalocean.com**
2. Click **"Sign Up"**
3. Use code **"DO10"** for $200 credit (if available)
4. Verify your email and add payment method

## 💻 Step 2: Create a Droplet (VPS)

1. **Click "Create" → "Droplets"**
2. **Choose Image**: Ubuntu 22.04 LTS x64
3. **Choose Size**: 
   - **Basic Plan**
   - **Regular Intel** 
   - **$4/month** (512MB RAM, 1 vCPU, 10GB SSD) - Perfect for Discord bots
4. **Choose Region**: Closest to you or your users
5. **Authentication**: 
   - Select **"SSH Key"** (recommended) or **"Password"**
   - If SSH: Upload your public key or create one
6. **Hostname**: `dragonball-finality-bot`
7. **Click "Create Droplet"**

## 🔐 Step 3: Connect to Your VPS

### Option A: SSH Key (Recommended)
```bash
ssh root@YOUR_DROPLET_IP
```

### Option B: Password
Use the password DigitalOcean sent to your email

### Option C: DigitalOcean Console
Click "Console" in the droplet dashboard

## 🛠️ Step 4: Initial Server Setup

Copy and paste these commands one by one:

### Update System
```bash
apt update && apt upgrade -y
```

### Install Node.js (Latest LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
apt-get install -y nodejs
```

### Install PM2 Globally
```bash
npm install -g pm2
```

### Install Git
```bash
apt install git -y
```

### Create Bot User (Security Best Practice)
```bash
adduser dragonball
usermod -aG sudo dragonball
su - dragonball
```

## 📁 Step 5: Clone Your Bot

```bash
# Clone your repository
git clone https://github.com/AMXgaming111/dragon-ball-finality.git
cd dragon-ball-finality

# Install dependencies
npm install

# Create logs directory
mkdir -p logs
```

## 🔑 Step 6: Environment Setup

Create your .env file:
```bash
nano .env
```

Copy this content and replace with your actual values:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here
OWNER_USER_ID=your_discord_user_id_here
```

**Save and exit**: `Ctrl+X`, then `Y`, then `Enter`

## 🚀 Step 7: Start Your Bot

```bash
# Start with PM2
pm2 start ecosystem.config.json

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions it gives you
```

## 🔧 Step 8: Configure Firewall (Security)

```bash
# Switch back to root user
exit

# Configure UFW firewall
ufw allow ssh
ufw allow 22
ufw --force enable
```

## 📊 Step 9: Verify Everything Works

```bash
# Check PM2 status
su - dragonball
pm2 status

# Check logs
pm2 logs dragonball-finality-bot --lines 20

# Monitor real-time
pm2 monit
```

## 🔄 Step 10: Setup Automatic Updates

Create update script:
```bash
nano ~/update-bot.sh
```

Content:
```bash
#!/bin/bash
cd ~/dragon-ball-finality
git pull origin main
npm install
pm2 restart dragonball-finality-bot
echo "Bot updated successfully!"
```

Make executable:
```bash
chmod +x ~/update-bot.sh
```

## 📋 Daily Management Commands

### Check Status
```bash
pm2 status
```

### View Logs
```bash
pm2 logs dragonball-finality-bot
```

### Restart Bot
```bash
pm2 restart dragonball-finality-bot
```

### Update Bot
```bash
./update-bot.sh
```

### Monitor Resources
```bash
htop
pm2 monit
```

## 🆘 Troubleshooting

### Bot Won't Start
```bash
# Check logs
pm2 logs dragonball-finality-bot

# Check if Node.js is working
node --version

# Check if dependencies are installed
npm list
```

### Connection Issues
```bash
# Check if port 22 is open
netstat -tlnp | grep :22

# Check firewall status
ufw status
```

### Out of Memory
```bash
# Check memory usage
free -h

# Restart PM2
pm2 restart all
```

## 💰 Cost Optimization

### Monitor Usage
- Check DigitalOcean dashboard monthly
- Monitor bandwidth and CPU usage
- Scale down if underutilized

### Backups
- Enable automatic backups (+20% cost)
- Or create manual snapshots when needed

## 🎯 Next Steps After Setup

1. ✅ Test bot commands in Discord
2. ✅ Set up server authorization with `!serverauth`
3. ✅ Monitor performance for first week
4. ✅ Setup automated backups
5. ✅ Document your VPS login details securely

## 📞 Support

- **DigitalOcean Docs**: https://docs.digitalocean.com
- **Community Support**: https://www.digitalocean.com/community
- **PM2 Docs**: https://pm2.keymetrics.io/docs/

---

**Your bot will now run 24/7 independently of your personal computer! 🎉**
