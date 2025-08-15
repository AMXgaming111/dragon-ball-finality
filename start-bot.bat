@echo off
REM Dragon Ball Finality Bot - Windows Startup Script
REM Place this file in your Windows Startup folder or create a scheduled task

echo 🐉 Starting Dragon Ball Finality Bot...

REM Navigate to bot directory
cd /d "D:\Tarik\Documents\Dragon Ball Finality"

REM Check if PM2 is running
pm2 status >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting PM2 daemon...
    pm2 ping
)

REM Start the bot if it's not already running
pm2 describe dragonball-finality-bot >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting bot...
    pm2 start ecosystem.config.json
) else (
    echo Bot is already running
    pm2 restart dragonball-finality-bot
)

echo ✅ Bot startup complete!
timeout /t 3 >nul
