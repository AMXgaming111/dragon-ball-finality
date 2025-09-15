const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ngiant',
    description: '[DEPRECATED] Use !state ngiant instead - Toggle Namekian Giant Form',
    async execute(message, args, database) {
        // Deprecation notice - redirect to state system
        const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setTitle('⚠️ Command Deprecated')
            .setDescription('The `!ngiant` command has been replaced by the new States system!')
            .addFields(
                { name: 'New Command', value: '`!state ngiant` - Activate Giant Form\n`!state ngiant` - Deactivate if already active', inline: false },
                { name: 'Giant Form Benefits', value: '• x1.4 Strength and Defense\n• 3 Ki cost per turn (affected by Control)\n• Advanced Ki Control allows harnessing power without size change', inline: false },
                { name: 'Other Useful Commands', value: '`!currentstate` - View your active state\n`!stats` - View your character stats (shows transformed stats)', inline: false }
            )
            .setFooter({ text: 'This old command will be removed in a future update. Please use !state ngiant instead.' })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
