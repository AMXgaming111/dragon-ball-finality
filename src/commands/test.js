const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'test',
    description: 'Enhanced test command to verify bot functionality and debug persistence',
    async execute(message, args, database) {
        try {
            // Get database info
            let dbInfo = 'Database not initialized';
            let characterCount = 0;
            let dbError = null;
            
            if (database && database.dbPath) {
                dbInfo = `Path: ${database.dbPath}`;
                try {
                    // Test database connection
                    const result = await database.all('SELECT COUNT(*) as count FROM characters');
                    characterCount = result[0]?.count || 0;
                } catch (error) {
                    dbError = error.message;
                    dbInfo += `\nDB Error: ${error.message}`;
                }
            }

            const testEmbed = new EmbedBuilder()
                .setTitle('🧪 Enhanced Test Command')
                .setDescription('Bot functionality and persistence test results:')
                .addFields(
                    { name: '🤖 Bot Status', value: 'Online and functional ✅', inline: true },
                    { name: '🌐 Environment', value: process.env.RAILWAY_ENVIRONMENT ? 'Railway 🚂' : 'Local 💻', inline: true },
                    { name: '📅 Timestamp', value: new Date().toISOString(), inline: true },
                    { name: '🗄️ Database Info', value: dbInfo.substring(0, 1000), inline: false },
                    { name: '👥 Character Count', value: characterCount.toString(), inline: true },
                    { name: '🔧 Volume Path', value: process.env.RAILWAY_VOLUME_MOUNT_PATH || 'Not set', inline: true },
                    { name: '🆔 Test ID', value: `TEST-${Date.now()}`, inline: true }
                )
                .setColor(dbError ? 0xff0000 : 0x00ff00)
                .setTimestamp()
                .setFooter({ text: 'Persistence Test - Use !test to check bot status' });

            await message.reply({ embeds: [testEmbed] });

            // Log detailed info to console for debugging
            console.log('🧪 TEST COMMAND EXECUTED:');
            console.log('📍 Database Path:', database?.dbPath);
            console.log('👥 Character Count:', characterCount);
            console.log('❌ Database Error:', dbError);
            console.log('🌐 Environment Variables:');
            console.log('  - RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
            console.log('  - RAILWAY_VOLUME_MOUNT_PATH:', process.env.RAILWAY_VOLUME_MOUNT_PATH);
            console.log('  - NODE_ENV:', process.env.NODE_ENV);

        } catch (error) {
            console.error('❌ Test command error:', error);
            
            try {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Test Command Error')
                    .setDescription(`Error occurred: ${error.message}`)
                    .setColor(0xff0000)
                    .setTimestamp();

                await message.reply({ embeds: [errorEmbed] });
            } catch (replyError) {
                console.error('❌ Failed to send error message:', replyError);
                await message.reply('❌ Test command failed with an error.');
            }
        }
    },
};
