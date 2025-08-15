const { EmbedBuilder } = require('discord.js');
const { hasStaffRole } = require('../utils/calculations');

module.exports = {
    name: 'say',
    description: 'Create embedded messages (Staff only)',
    async execute(message, args, database) {
        // Check staff permission
        if (!hasStaffRole(message.member)) {
            return message.reply('This command is only available to staff members.');
        }

        if (args.length === 0) {
            return message.reply('Usage: `!say <message>`');
        }

        const content = args.join(' ');

        try {
            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setDescription(content)
                .setThumbnail('https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/6796fe47-907a-4f6f-8075-8722ea4708d1/ddpvgse-30622ade-c990-4351-a216-47beb771d52b.png?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiJcL2ZcLzY3OTZmZTQ3LTkwN2EtNGY2Zi04MDc1LTg3MjJlYTQ3MDhkMVwvZGRwdmdzZS0zMDYyMmFkZS1jOTkwLTQzNTEtYTIxNi00N2JlYjc3MWQ1MmIucG5nIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.eX1xXIQHaHlKd7vrReTDjyRDJkHa-rr6s9VUr7-PmKg');

            // Try to delete the original command message first
            let messageDeleted = false;
            try {
                await message.delete();
                messageDeleted = true;
            } catch (deleteError) {
                console.log('Could not delete original message - bot needs "Manage Messages" permission');
                // Continue anyway - we'll send as a reply if we can't delete
            }

            // Send the embed - use channel.send if we deleted the original, reply if we couldn't
            if (messageDeleted) {
                await message.channel.send({ embeds: [embed] });
            } else {
                await message.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in say command:', error);
            await message.reply('An error occurred while creating the message.');
        }
    }
};
