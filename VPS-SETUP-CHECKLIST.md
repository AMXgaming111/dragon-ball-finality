# ✅ DigitalOcean VPS Setup Checklist

## 🎯 Pre-Setup Preparation
- [ ] Have your Discord bot token ready
- [ ] Have your Discord client ID ready  
- [ ] Have your Discord guild ID ready
- [ ] Have your Discord user ID ready (for owner notifications)
- [ ] Credit card ready for DigitalOcean

## 🌊 DigitalOcean Account Setup
- [ ] Create DigitalOcean account at https://digitalocean.com
- [ ] Verify email address
- [ ] Add payment method
- [ ] Apply promo code "DO10" if available

## 💻 Droplet Creation
- [ ] Click "Create" → "Droplets"
- [ ] Choose Ubuntu 22.04 LTS x64
- [ ] Select $4/month Basic plan (512MB RAM)
- [ ] Choose region closest to you
- [ ] Set authentication (SSH key recommended)
- [ ] Name it "dragonball-finality-bot"
- [ ] Create droplet
- [ ] Note down the IP address: `___________________`

## 🔐 Initial Connection
- [ ] Connect via SSH: `ssh root@YOUR_DROPLET_IP`
- [ ] Update system: `apt update && apt upgrade -y`
- [ ] Install Node.js: `curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -`
- [ ] Install Node.js: `apt-get install -y nodejs`
- [ ] Install PM2: `npm install -g pm2`
- [ ] Install Git: `apt install git -y`

## 👤 User Setup
- [ ] Create bot user: `adduser dragonball`
- [ ] Add to sudo group: `usermod -aG sudo dragonball`
- [ ] Switch to bot user: `su - dragonball`

## 📁 Bot Deployment
- [ ] Clone repository: `git clone https://github.com/AMXgaming111/dragon-ball-finality.git`
- [ ] Enter directory: `cd dragon-ball-finality`
- [ ] Install dependencies: `npm install`
- [ ] Create logs directory: `mkdir -p logs`
- [ ] Create .env file: `nano .env`
- [ ] Add your environment variables:
  ```
  DISCORD_TOKEN=your_bot_token_here
  CLIENT_ID=your_client_id_here
  GUILD_ID=your_guild_id_here
  OWNER_USER_ID=your_discord_user_id_here
  ```

## 🚀 Bot Startup
- [ ] Start bot: `pm2 start ecosystem.config.json`
- [ ] Check status: `pm2 status`
- [ ] Check logs: `pm2 logs dragonball-finality-bot --lines 10`
- [ ] Save PM2 config: `pm2 save`
- [ ] Setup boot startup: `pm2 startup` (follow instructions)

## 🔒 Security Setup
- [ ] Exit to root: `exit`
- [ ] Setup firewall: `ufw allow ssh && ufw allow 22 && ufw --force enable`

## ✅ Final Verification
- [ ] Bot shows "Ready! Logged in as [BotName]" in logs
- [ ] Bot responds to commands in Discord
- [ ] PM2 shows bot as "online"
- [ ] Server security features working (`!serverauth` commands)

## 📊 Performance Check
- [ ] Monitor with: `pm2 monit`
- [ ] Check memory: `free -h`
- [ ] Check disk space: `df -h`

## 📋 Information to Save
```
DigitalOcean Droplet IP: ___________________
SSH Connection: ssh dragonball@YOUR_IP
Bot Status Check: pm2 status
Logs Command: pm2 logs dragonball-finality-bot
Restart Command: pm2 restart dragonball-finality-bot
```

## 🎉 Success Criteria
- [ ] Bot is online 24/7
- [ ] No dependency on your local computer
- [ ] PM2 auto-restarts bot if it crashes
- [ ] Server security system is active
- [ ] You can manage the bot via SSH

---

**Estimated Setup Time: 15-30 minutes**
**Monthly Cost: $4 USD**
**Uptime: 99.9%+ (DigitalOcean SLA)**
