#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class BotMonitor {
    constructor() {
        this.logFile = path.join(__dirname, 'logs', 'monitor.log');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp} - ${message}\n`;
        
        console.log(message);
        fs.appendFileSync(this.logFile, logMessage);
    }

    runCommand(command) {
        try {
            return execSync(command, { encoding: 'utf8' }).trim();
        } catch (error) {
            return `Error: ${error.message}`;
        }
    }

    displayHeader() {
        console.clear();
        console.log('🐉 Dragon Ball Finality Bot - Live Monitor');
        console.log('==========================================');
        console.log(`📅 ${new Date().toLocaleString()}`);
        console.log('');
    }

    checkPM2Status() {
        console.log('📊 PM2 Process Status:');
        console.log('─────────────────────');
        
        const status = this.runCommand('pm2 jlist');
        
        try {
            const processes = JSON.parse(status);
            const botProcess = processes.find(p => p.name === 'dragonball-finality-bot');
            
            if (botProcess) {
                const uptime = new Date(Date.now() - new Date(botProcess.pm2_env.pm_uptime).getTime());
                const uptimeStr = `${Math.floor(uptime / (1000 * 60 * 60))}h ${Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60))}m`;
                
                console.log(`Status: ${botProcess.pm2_env.status === 'online' ? '🟢 ONLINE' : '🔴 OFFLINE'}`);
                console.log(`Uptime: ${uptimeStr}`);
                console.log(`Memory: ${Math.round(botProcess.memory / 1024 / 1024)} MB`);
                console.log(`CPU: ${botProcess.cpu}%`);
                console.log(`Restarts: ${botProcess.pm2_env.restart_time}`);
                console.log(`PID: ${botProcess.pid}`);
            } else {
                console.log('🔴 Bot not found in PM2 processes');
            }
        } catch (error) {
            console.log('❌ Error reading PM2 status');
        }
        
        console.log('');
    }

    checkSystemResources() {
        console.log('💻 System Resources:');
        console.log('───────────────────');
        
        // Memory usage
        const totalMem = require('os').totalmem();
        const freeMem = require('os').freemem();
        const usedMem = totalMem - freeMem;
        const memUsagePercent = Math.round((usedMem / totalMem) * 100);
        
        console.log(`Memory: ${Math.round(usedMem / 1024 / 1024 / 1024)}GB / ${Math.round(totalMem / 1024 / 1024 / 1024)}GB (${memUsagePercent}%)`);
        
        // CPU info
        const cpus = require('os').cpus();
        console.log(`CPU Cores: ${cpus.length}`);
        
        // Load average (Unix-like systems only)
        try {
            const loadAvg = require('os').loadavg();
            console.log(`Load Average: ${loadAvg[0].toFixed(2)}, ${loadAvg[1].toFixed(2)}, ${loadAvg[2].toFixed(2)}`);
        } catch (error) {
            // Windows doesn't support load average
        }
        
        console.log('');
    }

    checkLogFiles() {
        console.log('📋 Recent Log Activity:');
        console.log('──────────────────────');
        
        const logPaths = [
            'logs/err.log',
            'logs/out.log',
            'logs/combined.log'
        ];
        
        logPaths.forEach(logPath => {
            if (fs.existsSync(logPath)) {
                const stats = fs.statSync(logPath);
                const size = Math.round(stats.size / 1024);
                const modified = stats.mtime.toLocaleString();
                console.log(`${logPath}: ${size}KB (modified: ${modified})`);
            } else {
                console.log(`${logPath}: Not found`);
            }
        });
        
        console.log('');
    }

    showCommands() {
        console.log('🎮 Available Commands:');
        console.log('─────────────────────');
        console.log('npm run status    - Check PM2 status');
        console.log('npm run logs      - View bot logs');
        console.log('npm run restart   - Restart bot');
        console.log('npm run stop      - Stop bot');
        console.log('npm run health    - Run health check');
        console.log('pm2 monit         - PM2 monitoring dashboard');
        console.log('');
        console.log('Press Ctrl+C to exit monitor');
    }

    async startMonitoring() {
        const updateInterval = 5000; // 5 seconds
        
        const update = () => {
            this.displayHeader();
            this.checkPM2Status();
            this.checkSystemResources();
            this.checkLogFiles();
            this.showCommands();
        };
        
        // Initial update
        update();
        
        // Set up interval for updates
        setInterval(update, updateInterval);
        
        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n👋 Monitor stopped');
            process.exit(0);
        });
    }
}

// Start monitoring if this script is executed directly
if (require.main === module) {
    const monitor = new BotMonitor();
    monitor.startMonitoring();
}

module.exports = BotMonitor;
