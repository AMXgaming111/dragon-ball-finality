const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { staffRoleName } = require('../utils/config');
const { hasStaffRole } = require('../utils/calculations');

module.exports = {
    name: 'dc',
    description: 'Delete a character',
    async execute(message, args, database) {
        if (args.length < 1) {
            return message.reply('Usage: `!dc <character_name>`');
        }

        const characterName = args.join(' ');

        try {
            // Find the character (case-insensitive)
            const character = await database.getCharacterByName(characterName);
            if (!character) {
                return message.reply('Character not found!');
            }

            // Check permissions: owner or staff
            const member = message.guild.members.cache.get(message.author.id);
            const isOwner = character.owner_id === message.author.id;
            const isStaff = hasStaffRole(member, staffRoleName);

            if (!isOwner && !isStaff) {
                return message.reply('You can only delete your own characters, or you need the Staff role to delete any character.');
            }

            // Create confirmation embed
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setTitle('⚠️ Confirm Character Deletion')
                .setDescription(`Are you sure you want to delete **${character.name}** (${character.race})?`)
                .addFields(
                    { name: 'Owner', value: `<@${character.owner_id}>`, inline: true },
                    { name: 'Base PL', value: character.base_pl.toString(), inline: true },
                    { name: 'Race', value: character.race, inline: true }
                )
                .setFooter({ text: 'This action cannot be undone!' })
                .setTimestamp();

            const confirmButton = new ButtonBuilder()
                .setCustomId(`delete_character_${character.id}`)
                .setLabel('Delete Character')
                .setStyle(ButtonStyle.Danger);

            const cancelButton = new ButtonBuilder()
                .setCustomId('cancel_delete')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder()
                .addComponents(confirmButton, cancelButton);

            const response = await message.reply({ 
                embeds: [embed], 
                components: [row] 
            });

            // Handle button interactions
            const collector = response.createMessageComponentCollector({ 
                time: 30000 // 30 seconds
            });

            collector.on('collect', async (interaction) => {
                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({ 
                        content: 'Only the person who initiated this command can respond.', 
                        ephemeral: true 
                    });
                }

                if (interaction.customId === `delete_character_${character.id}`) {
                    try {
                        // Delete character and related data
                        await database.run('DELETE FROM character_racials WHERE character_id = ?', [character.id]);
                        await database.run('DELETE FROM character_forms WHERE character_id = ?', [character.id]);
                        await database.run('DELETE FROM character_current_form WHERE character_id = ?', [character.id]);
                        await database.run('DELETE FROM combat_state WHERE character_id = ?', [character.id]);
                        
                        // Update users who had this as active character
                        await database.run('UPDATE users SET active_character_id = NULL WHERE active_character_id = ?', [character.id]);
                        
                        // Delete the character
                        await database.run('DELETE FROM characters WHERE id = ?', [character.id]);

                        const successEmbed = new EmbedBuilder()
                            .setColor(0x00ff00)
                            .setTitle('Character Deleted')
                            .setDescription(`**${character.name}** has been successfully deleted.`)
                            .setTimestamp();

                        await interaction.update({ 
                            embeds: [successEmbed], 
                            components: [] 
                        });

                    } catch (error) {
                        console.error('Error deleting character:', error);
                        await interaction.update({ 
                            content: 'An error occurred while deleting the character.', 
                            embeds: [], 
                            components: [] 
                        });
                    }
                } else if (interaction.customId === 'cancel_delete') {
                    const cancelEmbed = new EmbedBuilder()
                        .setColor(0x95a5a6)
                        .setTitle('Deletion Cancelled')
                        .setDescription('Character deletion has been cancelled.')
                        .setTimestamp();

                    await interaction.update({ 
                        embeds: [cancelEmbed], 
                        components: [] 
                    });
                }
            });

            collector.on('end', async (collected) => {
                if (collected.size === 0) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor(0x95a5a6)
                        .setTitle('Deletion Cancelled')
                        .setDescription('Deletion timed out - character was not deleted.')
                        .setTimestamp();

                    await response.edit({ 
                        embeds: [timeoutEmbed], 
                        components: [] 
                    });
                }
            });

        } catch (error) {
            console.error('Error in delete character command:', error);
            await message.reply('An error occurred while processing the delete request.');
        }
    }
};
