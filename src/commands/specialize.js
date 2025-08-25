const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'specialize',
    description: 'Set, view, or clear your character\'s attribute specializations for bookkeeping',
    async execute(message, args, database) {
        try {
            // Get user's active character
            const userData = await database.getUserWithActiveCharacter(message.author.id);
            if (!userData || !userData.active_character_id) {
                return message.reply('You don\'t have an active character.');
            }

            // Handle different argument patterns
            if (args.length === 0) {
                // View current specializations
                const embed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle(`${userData.name}'s Specializations`)
                    .setDescription('Current character focus areas:');

                if (userData.primary_specialization || userData.secondary_specialization) {
                    if (userData.primary_specialization) {
                        embed.addFields({ 
                            name: 'Primary Specialization', 
                            value: userData.primary_specialization.charAt(0).toUpperCase() + userData.primary_specialization.slice(1), 
                            inline: true 
                        });
                    }
                    if (userData.secondary_specialization) {
                        embed.addFields({ 
                            name: 'Secondary Specialization', 
                            value: userData.secondary_specialization.charAt(0).toUpperCase() + userData.secondary_specialization.slice(1), 
                            inline: true 
                        });
                    }
                } else {
                    embed.setDescription('No specializations set.');
                }

                embed.setFooter({ text: 'Use !specialize <primary> <secondary> to set, or !specialize clear to remove' });
                return message.reply({ embeds: [embed] });
            }

            if (args.length === 1 && args[0].toLowerCase() === 'clear') {
                // Clear specializations
                await database.run(
                    'UPDATE characters SET primary_specialization = NULL, secondary_specialization = NULL WHERE id = ?',
                    [userData.active_character_id]
                );

                const embed = new EmbedBuilder()
                    .setColor(0xff9900)
                    .setTitle('Specializations Cleared')
                    .setDescription(`${userData.name} no longer has any specializations set.`)
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            if (args.length < 2) {
                return message.reply('Usage: `!specialize <primary> <secondary>`\n\nValid attributes: strength, defense, agility, endurance, control\n\nExample: `!specialize agility endurance`\n\nOther commands:\n• `!specialize` - View current specializations\n• `!specialize clear` - Remove specializations\n\n*Note: This is for character bookkeeping and roleplay purposes.*');
            }

            const primarySpec = args[0].toLowerCase();
            const secondarySpec = args[1].toLowerCase();

            // Valid attribute names
            const validAttributes = ['strength', 'defense', 'agility', 'endurance', 'control'];

            // Validate input
            if (!validAttributes.includes(primarySpec)) {
                return message.reply(`Invalid primary specialization "${primarySpec}". Valid attributes: ${validAttributes.join(', ')}`);
            }

            if (!validAttributes.includes(secondarySpec)) {
                return message.reply(`Invalid secondary specialization "${secondarySpec}". Valid attributes: ${validAttributes.join(', ')}`);
            }

            if (primarySpec === secondarySpec) {
                return message.reply('Primary and secondary specializations must be different attributes!');
            }

            // Update specializations
            await database.run(
                'UPDATE characters SET primary_specialization = ?, secondary_specialization = ? WHERE id = ?',
                [primarySpec, secondarySpec, userData.active_character_id]
            );

            // Create success embed
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('Specializations Set!')
                .setDescription(`${userData.name} has specialized in:`)
                .addFields(
                    { 
                        name: 'Primary Specialization', 
                        value: `**${primarySpec.charAt(0).toUpperCase() + primarySpec.slice(1)}**\nCharacter Focus`, 
                        inline: true 
                    },
                    { 
                        name: 'Secondary Specialization', 
                        value: `**${secondarySpec.charAt(0).toUpperCase() + secondarySpec.slice(1)}**\nSecondary Focus`, 
                        inline: true 
                    }
                )
                .setFooter({ text: 'These specializations are for character bookkeeping and roleplay purposes!' })
                .setTimestamp();

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error handling specializations:', error);
            return message.reply('An error occurred while handling your specializations. Please try again.');
        }
    }
};
