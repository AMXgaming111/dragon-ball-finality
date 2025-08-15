# 🚀 Dragon Ball Finality Bot - 24/7 Management Guide

## ✅ Current Status: Bot is RUNNING 24/7!

Your bot is successfully running with PM2 process manager. Here's everything you need to know:

## 📊 Quick Status Check
```bash
pm2 status
```

## 🔧 Essential PM2 Commands

### Starting & Stopping
```bash
# Start the bot
npm run start

# Stop the bot
pm2 stop dragonball-finality

# Restart the bot
pm2 restart dragonball-finality

# Reload the bot (zero-downtime restart)
pm2 reload dragonball-finality

# Delete the process
pm2 delete dragonball-finality
```

### Monitoring & Logs
```bash
# View real-time logs
pm2 logs dragonball-finality

# View logs with timestamps
pm2 logs dragonball-finality --timestamp

# Clear all logs
pm2 flush

# Monitor CPU and memory usage
pm2 monit

# Show detailed process info
pm2 show dragonball-finality
```

### Advanced Management
```bash
# Save current PM2 processes
pm2 save

# Resurrect saved processes
pm2 resurrect

# Update PM2 to latest version
npm install pm2@latest -g

# Reset restart counter
pm2 reset dragonball-finality
```

## 📁 Quick Access Scripts

### Windows Batch Files Created:
- `bot-control.bat` - Main control panel
- `start-bot.bat` - Quick start
- `stop-bot.bat` - Quick stop
- `logs.bat` - View logs
- `status.bat` - Check status

### NPM Scripts Added:
```bash
npm run start       # Start with PM2
npm run stop        # Stop the bot
npm run restart     # Restart the bot
npm run logs        # View logs
npm run status      # Check status
npm run health      # Health check
npm run monitor     # Open monitoring dashboard
```

## 🔄 Auto-Restart Features

Your bot will automatically:
- ✅ Restart if it crashes
- ✅ Restart on file changes (if watch mode enabled)
- ✅ Save logs with rotation
- ✅ Monitor memory usage
- ✅ Handle graceful shutdowns

## 📈 Monitoring Dashboard

Access the monitoring dashboard anytime:
```bash
npm run monitor
# or
pm2 monit
```

## 🛠️ Troubleshooting

### Bot Not Starting?
1. Check logs: `npm run logs`
2. Verify environment: `node health-check.js`
3. Check database: Ensure `database.db` exists
4. Verify token: Check `.env` file

### High Memory Usage?
1. Restart bot: `npm run restart`
2. Check for memory leaks in logs
3. Consider upgrading server resources

### Connection Issues?
1. Check Discord token validity
2. Verify bot permissions in Discord Developer Portal
3. Check network connectivity

## 🔐 Security Reminders

1. **Server Authorization**: Use `!serverauth` commands to manage authorized servers
2. **Owner Notifications**: Ensure `OWNER_USER_ID` is set in `.env`
3. **Token Security**: Never share your Discord bot token
4. **Regular Updates**: Keep dependencies updated

## 📱 Mobile Management

You can manage your bot remotely:
1. Install PM2+ mobile app
2. Connect via PM2+ web dashboard
3. Monitor and control from anywhere

## 🎯 Performance Tips

1. **Monitor Regularly**: Check `npm run status` daily
2. **Log Rotation**: Logs auto-rotate to prevent disk issues
3. **Health Checks**: Run `npm run health` weekly
4. **Updates**: Keep bot code and dependencies updated

## 🆘 Emergency Commands

If something goes wrong:
```bash
# Nuclear option - restart everything
pm2 kill
npm run start

# Check if PM2 daemon is running
pm2 ping

# Restart PM2 daemon
pm2 kill && pm2 ping
```

## 📞 Support

- Check logs first: `npm run logs`
- Review this guide
- Check Discord.js documentation
- GitHub repository: https://github.com/AMXgaming111/dragon-ball-finality

---

**Your bot is now running 24/7! 🎉**

Use `npm run status` anytime to check if everything is running smoothly.
