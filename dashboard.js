const { EmbedBuilder } = require('discord.js');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n🎯 Dragon Ball Finality Bot - System Dashboard\n');

// Get PM2 status
try {
    const pm2Status = execSync('pm2 jlist', { encoding: 'utf8' });
    const processes = JSON.parse(pm2Status);
    const botProcess = processes.find(p => p.name === 'dragonball-finality');
    
    if (botProcess) {
        console.log('📊 Bot Status:');
        console.log(`   Status: ${botProcess.pm2_env.status.toUpperCase()}`);
        console.log(`   Uptime: ${Math.floor(botProcess.pm2_env.pm_uptime ? (Date.now() - botProcess.pm2_env.pm_uptime) / 1000 / 60 : 0)} minutes`);
        console.log(`   Restarts: ${botProcess.pm2_env.restart_time}`);
        console.log(`   Memory: ${(botProcess.monit.memory / 1024 / 1024).toFixed(1)} MB`);
        console.log(`   CPU: ${botProcess.monit.cpu}%`);
        console.log(`   PID: ${botProcess.pid}`);
    } else {
        console.log('❌ Bot is not running');
    }
} catch (error) {
    console.log('❌ Could not get PM2 status');
}

// Check database
console.log('\n💾 Database Status:');
const dbPath = path.join(__dirname, 'database.db');
if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    console.log(`   ✅ Database exists (${(stats.size / 1024).toFixed(1)} KB)`);
    console.log(`   📅 Last modified: ${stats.mtime.toLocaleString()}`);
} else {
    console.log('   ❌ Database file not found');
}

// Check environment
console.log('\n🔧 Environment Status:');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    console.log('   ✅ .env file exists');
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasToken = envContent.includes('DISCORD_TOKEN=') && !envContent.includes('DISCORD_TOKEN=your_discord_bot_token');
    const hasOwner = envContent.includes('OWNER_USER_ID=') && !envContent.includes('OWNER_USER_ID=your_discord_user_id');
    
    console.log(`   ${hasToken ? '✅' : '❌'} Discord token configured`);
    console.log(`   ${hasOwner ? '✅' : '❌'} Owner user ID configured`);
} else {
    console.log('   ❌ .env file not found');
}

// Check logs
console.log('\n📝 Recent Activity:');
try {
    const logs = execSync('pm2 logs dragonball-finality --lines 5 --nostream', { encoding: 'utf8' });
    if (logs.trim()) {
        console.log(logs);
    } else {
        console.log('   No recent logs available');
    }
} catch (error) {
    console.log('   Could not retrieve logs');
}

// System info
console.log('\n💻 System Information:');
console.log(`   Node.js: ${process.version}`);
console.log(`   Platform: ${process.platform} ${process.arch}`);
console.log(`   Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB used`);
console.log(`   Working Directory: ${process.cwd()}`);

console.log('\n🎮 Management Commands:');
console.log('   npm run start    - Start the bot');
console.log('   npm run stop     - Stop the bot');
console.log('   npm run restart  - Restart the bot');
console.log('   npm run logs     - View live logs');
console.log('   npm run monitor  - Open PM2 monitor');
console.log('   npm run health   - Run health check');

console.log('\n📖 Documentation:');
console.log('   📋 Management Guide: 24-7-MANAGEMENT-GUIDE.md');
console.log('   🔐 Server Security: SERVER_SECURITY_SETUP.md');
console.log('   📚 Help Commands: Use !help in Discord');

console.log('\n✨ Your bot is running 24/7! Use the commands above to manage it.\n');
