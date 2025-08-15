@echo off
echo.
echo ==========================================
echo    Dragon Ball Finality Bot Status
echo ==========================================
echo.

pm2 status

echo.
echo ==========================================
echo           Recent Log Entries
echo ==========================================
echo.

pm2 logs dragonball-finality --lines 10

echo.
echo ==========================================
echo         Health Check Summary
echo ==========================================
echo.

node health-check.js

echo.
echo ==========================================
echo     Quick Commands Available:
echo ==========================================
echo   npm run start    - Start the bot
echo   npm run stop     - Stop the bot  
echo   npm run restart  - Restart the bot
echo   npm run logs     - View full logs
echo   npm run monitor  - Open monitoring
echo ==========================================
echo.
pause
