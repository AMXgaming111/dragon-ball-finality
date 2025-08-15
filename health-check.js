const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Health check utility for Dragon Ball Finality Bot
class BotHealthChecker {
    constructor() {
        this.logFile = path.join(__dirname, 'logs', 'health-check.log');
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

    async checkBotHealth() {
        this.log('🔍 Starting bot health check...');

        try {
            // Check if .env file exists
            if (!fs.existsSync('.env')) {
                this.log('❌ .env file not found');
                return false;
            }
            this.log('✅ .env file exists');

            // Load environment variables
            require('dotenv').config();

            if (!process.env.DISCORD_TOKEN) {
                this.log('❌ DISCORD_TOKEN not found in .env');
                return false;
            }
            this.log('✅ DISCORD_TOKEN configured');

            // Check database file
            const dbPath = process.env.DATABASE_PATH || './database.db';
            if (!fs.existsSync(dbPath)) {
                this.log('❌ Database file not found');
                return false;
            }
            this.log('✅ Database file exists');

            // Test bot connection
            const client = new Client({
                intents: [
                    GatewayIntentBits.Guilds,
                    GatewayIntentBits.GuildMessages,
                    GatewayIntentBits.MessageContent
                ]
            });

            const connectionTest = await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    resolve(false);
                }, 10000); // 10 second timeout

                client.once('ready', () => {
                    clearTimeout(timeout);
                    this.log(`✅ Bot connected as ${client.user.tag}`);
                    this.log(`✅ Bot is in ${client.guilds.cache.size} servers`);
                    client.destroy();
                    resolve(true);
                });

                client.once('error', (error) => {
                    clearTimeout(timeout);
                    this.log(`❌ Bot connection error: ${error.message}`);
                    resolve(false);
                });

                client.login(process.env.DISCORD_TOKEN).catch((error) => {
                    clearTimeout(timeout);
                    this.log(`❌ Bot login failed: ${error.message}`);
                    resolve(false);
                });
            });

            if (connectionTest) {
                this.log('🎉 Bot health check passed!');
                return true;
            } else {
                this.log('❌ Bot health check failed - connection test failed');
                return false;
            }

        } catch (error) {
            this.log(`❌ Health check error: ${error.message}`);
            return false;
        }
    }

    async checkSystemResources() {
        this.log('📊 Checking system resources...');

        try {
            const used = process.memoryUsage();
            const totalMemoryMB = Math.round(used.rss / 1024 / 1024);
            const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
            
            this.log(`💾 Memory Usage: ${totalMemoryMB} MB (Heap: ${heapUsedMB} MB)`);

            // Check if memory usage is too high (over 400MB)
            if (totalMemoryMB > 400) {
                this.log('⚠️  High memory usage detected');
                return false;
            }

            // Check uptime
            const uptimeSeconds = process.uptime();
            const uptimeHours = Math.floor(uptimeSeconds / 3600);
            const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
            
            this.log(`⏱️  Process uptime: ${uptimeHours}h ${uptimeMinutes}m`);

            this.log('✅ System resources check passed');
            return true;

        } catch (error) {
            this.log(`❌ System resources check error: ${error.message}`);
            return false;
        }
    }

    async runFullHealthCheck() {
        this.log('🚀 Starting full health check...');
        
        const botHealth = await this.checkBotHealth();
        const systemHealth = await this.checkSystemResources();
        
        if (botHealth && systemHealth) {
            this.log('🎯 Full health check PASSED - Bot is healthy!');
            process.exit(0);
        } else {
            this.log('🚨 Full health check FAILED - Bot needs attention!');
            process.exit(1);
        }
    }
}

// Run health check if this script is executed directly
if (require.main === module) {
    const checker = new BotHealthChecker();
    checker.runFullHealthCheck();
}

module.exports = BotHealthChecker;
