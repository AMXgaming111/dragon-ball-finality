require('dotenv').config();

const CLIENT_ID = process.env.CLIENT_ID;

if (!CLIENT_ID) {
    console.error('❌ CLIENT_ID not found in .env file!');
    console.log('Please add your bot\'s Client ID to the .env file:');
    console.log('CLIENT_ID=your_client_id_here');
    process.exit(1);
}

const permissions = '414537956416'; // Required permissions for the bot (includes Manage Messages)

// Standard invite URL (bot will auto-leave unauthorized servers)
const inviteURL = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=${permissions}&scope=bot`;

// Alternative: Application commands only (no bot scope - more restrictive)
const restrictiveURL = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&scope=applications.commands`;

console.log('🤖 Dragon Ball Finality Bot Invitation');
console.log('=====================================');
console.log('⚠️  IMPORTANT: This bot includes server security features!');
console.log('The bot will automatically leave unauthorized servers.');
console.log('');
console.log('🔗 Standard Invite URL (Recommended):');
console.log(inviteURL);
console.log('');
console.log('🔒 Restrictive Invite URL (Commands Only):');
console.log(restrictiveURL);
console.log('');
console.log('Required Permissions:');
console.log('✅ Send Messages');
console.log('✅ Embed Links');
console.log('✅ Read Message History');
console.log('✅ Use External Emojis');
console.log('✅ Add Reactions');
console.log('✅ Manage Messages');
console.log('');
console.log('🛡️  Security Features:');
console.log('• Bot automatically leaves unauthorized servers');
console.log('• Server whitelist management via !serverauth commands');
console.log('• Owner notifications for unauthorized invites');
console.log('');
console.log('📋 Setup Steps:');
console.log('1. Invite bot to your server using the URL above');
console.log('2. Create a "Staff" role for admin commands');
console.log('3. Use !serverauth add <server_id> to authorize your server');
console.log('4. Start the bot with: npm start');
console.log('5. Test with: !cc TestChar Saiyan');
console.log('');
console.log('📖 For detailed security setup, see: SERVER_SECURITY_SETUP.md');
