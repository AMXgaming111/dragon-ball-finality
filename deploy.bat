@echo off
echo 🐉 Dragon Ball Finality Bot - Windows Deployment Setup
echo =======================================================

REM Check if PM2 is installed
pm2 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PM2 not found. Installing PM2...
    npm install -g pm2
    if %errorlevel% neq 0 (
        echo ❌ Failed to install PM2. Please check your Node.js installation.
        pause
        exit /b 1
    )
    echo ✅ PM2 installed successfully!
) else (
    echo ✅ PM2 is already installed
)

REM Create logs directory
if not exist "logs" (
    mkdir logs
    echo ✅ Created logs directory
)

REM Install dependencies
echo 📦 Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  .env file not found!
    echo Please create a .env file with your bot configuration before starting.
    echo Example:
    echo DISCORD_TOKEN=your_bot_token_here
    echo CLIENT_ID=your_client_id_here
    echo STAFF_ROLE_NAME=Staff
    echo OWNER_USER_ID=your_discord_user_id
    pause
    exit /b 1
) else (
    echo ✅ .env file found
)

REM Start the bot with PM2
echo 🚀 Starting bot with PM2...
pm2 start ecosystem.config.json
if %errorlevel% neq 0 (
    echo ❌ Failed to start bot
    pause
    exit /b 1
)

REM Save PM2 process list
pm2 save

REM Show status
echo 📊 Bot Status:
pm2 status

echo.
echo 🎉 Deployment complete!
echo.
echo 📋 Useful PM2 Commands:
echo   pm2 status                    - Check bot status
echo   pm2 logs dragonball-finality-bot - View bot logs
echo   pm2 restart dragonball-finality-bot - Restart bot
echo   pm2 stop dragonball-finality-bot - Stop bot
echo   pm2 delete dragonball-finality-bot - Remove bot from PM2
echo.
echo 🔧 To set up automatic startup after system reboot:
echo   pm2 startup
echo   Then run the command it provides as Administrator
echo.
echo 🎯 Your bot should now be running 24/7!
pause
