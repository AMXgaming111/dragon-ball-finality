# 🔐 SSH Connection Guide for Your VPS

## Option 1: Using Windows PowerShell (Built-in)

### Connect to your VPS:
```powershell
ssh root@YOUR_DROPLET_IP
```

### Switch to bot user:
```bash
su - dragonball
cd dragon-ball-finality
```

## Option 2: Using PuTTY (If you prefer GUI)

1. Download PuTTY from https://putty.org
2. Enter your droplet IP in "Host Name"
3. Port: 22
4. Connection type: SSH
5. Click "Open"

## Option 3: Using VS Code (Recommended for Development)

1. Install "Remote - SSH" extension
2. Press `Ctrl+Shift+P`
3. Type "Remote-SSH: Connect to Host"
4. Enter: `dragonball@YOUR_DROPLET_IP`

## 📝 Quick Reference Commands

### Essential Commands:
```bash
# Check bot status
pm2 status

# View logs
pm2 logs dragonball-finality-bot

# Restart bot
pm2 restart dragonball-finality-bot

# Update bot
./vps-deploy.sh

# Monitor resources
htop
```

### File Editing:
```bash
# Edit environment variables
nano .env

# Edit bot code
nano src/commands/example.js
```

### System Management:
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check running processes
ps aux | grep node
```

## 🆘 Emergency Commands

### If Bot Stops Working:
```bash
pm2 kill
pm2 start ecosystem.config.json
```

### If System Issues:
```bash
sudo reboot
# Wait 2 minutes, then reconnect
```

### If Need to Restart Everything:
```bash
sudo systemctl restart networking
pm2 restart all
```

## 📋 Your VPS Information Template

Fill this out and keep it secure:

```
VPS Provider: DigitalOcean
Droplet IP: _______________
Username: dragonball
SSH Command: ssh dragonball@YOUR_IP
Bot Directory: ~/dragon-ball-finality
PM2 Process: dragonball-finality-bot
```

## 🔑 Security Tips

1. **Never share your SSH credentials**
2. **Use SSH keys instead of passwords**
3. **Keep your .env file private**
4. **Regular updates**: `sudo apt update && sudo apt upgrade`
5. **Monitor your DigitalOcean billing dashboard**
