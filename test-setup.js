// Simple test script to verify bot dependencies and configuration
const fs = require('fs');
const path = require('path');

console.log('🔍 Dragon Ball Finality Bot - Setup Verification\n');

// Check Node.js version
const nodeVersion = process.version;
const major = parseInt(nodeVersion.slice(1).split('.')[0]);
console.log(`✅ Node.js version: ${nodeVersion} ${major >= 16 ? '(Compatible)' : '(⚠️  Requires 16+)'}`);

// Check if .env exists
const envExists = fs.existsSync('.env');
console.log(`${envExists ? '✅' : '⚠️ '} Environment file: ${envExists ? 'Found' : 'Missing - copy .env.example to .env'}`);

// Check if required packages are installed
const packageJson = require('./package.json');
const requiredPackages = ['discord.js', 'sqlite3', 'dotenv'];
let packagesOk = true;

console.log('\n📦 Checking dependencies:');
requiredPackages.forEach(pkg => {
    try {
        require(pkg);
        console.log(`✅ ${pkg}: Installed`);
    } catch (error) {
        console.log(`❌ ${pkg}: Missing - run 'npm install'`);
        packagesOk = false;
    }
});

// Check command files
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.existsSync(commandsPath) ? fs.readdirSync(commandsPath).filter(file => file.endsWith('.js')) : [];
console.log(`\n🤖 Command files found: ${commandFiles.length}`);
commandFiles.slice(0, 5).forEach(file => {
    console.log(`   - ${file}`);
});
if (commandFiles.length > 5) {
    console.log(`   ... and ${commandFiles.length - 5} more`);
}

// Environment variable check
if (envExists) {
    require('dotenv').config();
    console.log('\n🔧 Environment variables:');
    console.log(`   DISCORD_TOKEN: ${process.env.DISCORD_TOKEN ? 'Set' : 'Missing'}`);
    console.log(`   CLIENT_ID: ${process.env.CLIENT_ID ? 'Set' : 'Missing'}`);
    console.log(`   PREFIX: ${process.env.PREFIX || '!'}`);
    console.log(`   STAFF_ROLE_NAME: ${process.env.STAFF_ROLE_NAME || 'Staff'}`);
}

console.log('\n' + '='.repeat(50));
if (envExists && packagesOk && commandFiles.length > 0) {
    console.log('🎉 Setup appears complete! Run "npm start" to launch the bot.');
} else {
    console.log('⚠️  Setup incomplete. Please address the issues above.');
}
console.log('📖 See SETUP.md for detailed instructions.');
console.log('='.repeat(50));
