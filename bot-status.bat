@echo off
echo ========================================
echo     Dragon Ball Finality Bot Status
echo ========================================
echo.

echo PM2 Process Status:
pm2 status

echo.
echo Recent Logs (Last 5 lines):
pm2 logs dragonball-finality-bot --lines 5

echo.
echo Quick Commands:
echo - Restart bot: pm2 restart dragonball-finality-bot
echo - Stop bot: pm2 stop dragonball-finality-bot
echo - View logs: pm2 logs dragonball-finality-bot
echo - Monitor: pm2 monit
echo.
pause
