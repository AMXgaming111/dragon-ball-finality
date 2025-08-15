@echo off
title Dragon Ball Finality Bot - Control Panel

:menu
cls
echo 🐉 Dragon Ball Finality Bot - Control Panel
echo ==========================================
echo.
echo 📊 Current Status:
pm2 status
echo.
echo 🎮 Choose an option:
echo.
echo [1] View Bot Logs
echo [2] Restart Bot
echo [3] Stop Bot
echo [4] Start Bot
echo [5] Health Check
echo [6] Monitor Dashboard
echo [7] View Error Logs
echo [8] View Output Logs
echo [9] Bot Statistics
echo [0] Exit
echo.
set /p choice="Enter your choice (0-9): "

if "%choice%"=="1" goto logs
if "%choice%"=="2" goto restart
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto start
if "%choice%"=="5" goto health
if "%choice%"=="6" goto monitor
if "%choice%"=="7" goto errorlogs
if "%choice%"=="8" goto outputlogs
if "%choice%"=="9" goto stats
if "%choice%"=="0" goto exit
goto menu

:logs
cls
echo 📋 Bot Logs (Press Ctrl+C to return to menu)
echo ===========================================
pm2 logs dragonball-finality-bot
pause
goto menu

:restart
cls
echo 🔄 Restarting bot...
pm2 restart dragonball-finality-bot
echo ✅ Bot restarted!
pause
goto menu

:stop
cls
echo ⏹️ Stopping bot...
pm2 stop dragonball-finality-bot
echo ✅ Bot stopped!
pause
goto menu

:start
cls
echo ▶️ Starting bot...
pm2 start ecosystem.config.json
echo ✅ Bot started!
pause
goto menu

:health
cls
echo 🏥 Running health check...
echo ========================
node health-check.js
pause
goto menu

:monitor
cls
echo 📊 Opening PM2 monitoring dashboard...
echo ====================================
echo Press Ctrl+C to return to menu
pm2 monit
goto menu

:errorlogs
cls
echo ❌ Error Logs
echo ============
if exist "logs\err.log" (
    type logs\err.log
) else (
    echo No error logs found
)
pause
goto menu

:outputlogs
cls
echo 📝 Output Logs
echo =============
if exist "logs\out.log" (
    type logs\out.log
) else (
    echo No output logs found
)
pause
goto menu

:stats
cls
echo 📈 Bot Statistics
echo ================
pm2 describe dragonball-finality-bot
pause
goto menu

:exit
echo 👋 Goodbye!
exit
