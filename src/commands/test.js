const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('Simple test command to verify bot functionality'),

    async execute(interaction) {
        const testEmbed = new EmbedBuilder()
            .setTitle('🧪 Test Command')
            .setDescription('Hello World! Bot is working correctly.')
            .addFields(
                { name: '🤖 Status', value: 'Online and functional', inline: true },
                { name: '🌐 Environment', value: process.env.RAILWAY_ENVIRONMENT ? 'Railway' : 'Local', inline: true },
                { name: '📅 Timestamp', value: new Date().toISOString(), inline: true }
            )
            .setColor(0x00ff00)
            .setTimestamp();

        await interaction.reply({ embeds: [testEmbed] });
    },
};
