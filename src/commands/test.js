const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('Enhanced test command to verify bot functionality and debug persistence'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            // Get database info
            const db = interaction.client.database;
            let dbInfo = 'Database not initialized';
            let characterCount = 0;
            
            if (db && db.dbPath) {
                dbInfo = `Path: ${db.dbPath}`;
                try {
                    const characters = await db.all('SELECT COUNT(*) as count FROM characters');
                    characterCount = characters[0]?.count || 0;
                } catch (error) {
                    dbInfo += `\nError: ${error.message}`;
                }
            }

            const testEmbed = new EmbedBuilder()
                .setTitle('🧪 Enhanced Test Command')
                .setDescription('Bot functionality and persistence test results:')
                .addFields(
                    { name: '🤖 Bot Status', value: 'Online and functional ✅', inline: true },
                    { name: '🌐 Environment', value: process.env.RAILWAY_ENVIRONMENT ? 'Railway 🚂' : 'Local 💻', inline: true },
                    { name: '📅 Timestamp', value: new Date().toISOString(), inline: true },
                    { name: '🗄️ Database Info', value: dbInfo, inline: false },
                    { name: '👥 Character Count', value: characterCount.toString(), inline: true },
                    { name: '🔧 Volume Path', value: process.env.RAILWAY_VOLUME_MOUNT_PATH || 'Not set', inline: true },
                    { name: '🆔 Test ID', value: `TEST-${Date.now()}`, inline: true }
                )
                .setColor(0x00ff00)
                .setTimestamp()
                .setFooter({ text: 'Persistence Test - Check if this survives redeployment!' });

            await interaction.editReply({ embeds: [testEmbed] });

            // Log detailed info to console for debugging
            console.log('🧪 TEST COMMAND EXECUTED:');
            console.log('📍 Database Path:', db?.dbPath);
            console.log('👥 Character Count:', characterCount);
            console.log('🌐 Environment Variables:');
            console.log('  - RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
            console.log('  - RAILWAY_VOLUME_MOUNT_PATH:', process.env.RAILWAY_VOLUME_MOUNT_PATH);
            console.log('  - NODE_ENV:', process.env.NODE_ENV);

        } catch (error) {
            console.error('❌ Test command error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Test Command Error')
                .setDescription(`Error occurred: ${error.message}`)
                .setColor(0xff0000)
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
