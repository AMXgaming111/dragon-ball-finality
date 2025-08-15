require('dotenv').config();

const CLIENT_ID = process.env.CLIENT_ID;

if (!CLIENT_ID) {
    console.error('❌ CLIENT_ID not found in .env file!');
    console.log('Please add your bot\'s Client ID to the .env file:');
    console.log('CLIENT_ID=your_client_id_here');
    process.exit(1);
}

const permissions = '414537956416'; // Required permissions for the bot (includes Manage Messages)
const inviteURL = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=${permissions}&scope=bot`;

console.log('🤖 Dragon Ball Finality Bot Invitation');
console.log('=====================================');
console.log('Copy and paste this URL into your browser to invite the bot:');
console.log('');
console.log(inviteURL);
console.log('');
console.log('Required Permissions:');
console.log('✅ Send Messages');
console.log('✅ Embed Links');
console.log('✅ Read Message History');
console.log('✅ Use External Emojis');
console.log('✅ Add Reactions');
console.log('✅ Manage Messages');
console.log('');
console.log('After inviting the bot, make sure to:');
console.log('1. Create a "Staff" role for admin commands');
console.log('2. Start the bot with: npm start');
console.log('3. Test with: !cc TestChar Saiyan');
