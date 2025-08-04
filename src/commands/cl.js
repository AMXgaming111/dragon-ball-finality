const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { staffRoleName } = require('../utils/config');
const { hasStaffRole } = require('../utils/calculations');

module.exports = {
    name: 'cl',
    description: 'List characters',
    async execute(message, args, database) {
        let targetUserId = message.author.id;
        let targetUser = message.author;

        // Check if staff member is querying another user
        if (args.length > 0) {
            const member = message.guild.members.cache.get(message.author.id);
            if (!hasStaffRole(member, staffRoleName)) {
                return message.reply('You need the Staff role to view other users\' characters.');
            }

            // Parse user mention
            const userMention = args[0];
            const userId = userMention.replace(/[<@!>]/g, '');
            
            targetUser = await message.client.users.fetch(userId).catch(() => null);
            if (!targetUser) {
                return message.reply('User not found!');
            }
            targetUserId = targetUser.id;
        }

        try {
            // Get all characters for the target user
            const characters = await database.all(
                'SELECT * FROM characters WHERE owner_id = ? ORDER BY created_at ASC',
                [targetUserId]
            );

            if (characters.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0x95a5a6)
                    .setTitle('No Characters')
                    .setDescription(`${targetUser.username} has no characters.`)
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            // Get active character
            const user = await database.getUser(targetUserId);
            const activeCharacterId = user?.active_character_id;

            // Pagination setup
            const charactersPerPage = 5;
            const totalPages = Math.ceil(characters.length / charactersPerPage);
            let currentPage = 0;

            const generateEmbed = (page) => {
                const start = page * charactersPerPage;
                const end = start + charactersPerPage;
                const pageCharacters = characters.slice(start, end);

                const embed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle(`${targetUser.username}'s Characters`)
                    .setFooter({ text: `Page ${page + 1} of ${totalPages} • ${characters.length} total characters` })
                    .setTimestamp();

                let description = '';
                pageCharacters.forEach((char, index) => {
                    const isActive = char.id === activeCharacterId ? '⭐ ' : '';
                    const globalIndex = start + index + 1;
                    
                    description += `**${globalIndex}.** ${isActive}**${char.name}** (${char.race})\n`;
                    description += `└ Base PL: ${char.base_pl} • Created: <t:${Math.floor(new Date(char.created_at).getTime() / 1000)}:R>\n\n`;
                });

                embed.setDescription(description);
                return embed;
            };

            const generateButtons = (page) => {
                const row = new ActionRowBuilder();

                if (totalPages > 1) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId('first_page')
                            .setLabel('⏮️')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId('prev_page')
                            .setLabel('⬅️')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId('next_page')
                            .setLabel('➡️')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page === totalPages - 1),
                        new ButtonBuilder()
                            .setCustomId('last_page')
                            .setLabel('⏭️')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page === totalPages - 1)
                    );
                }

                return row.components.length > 0 ? [row] : [];
            };

            const response = await message.reply({
                embeds: [generateEmbed(currentPage)],
                components: generateButtons(currentPage)
            });

            if (totalPages <= 1) return;

            // Handle pagination
            const collector = response.createMessageComponentCollector({ 
                time: 300000 // 5 minutes
            });

            collector.on('collect', async (interaction) => {
                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({ 
                        content: 'Only the person who initiated this command can navigate pages.', 
                        ephemeral: true 
                    });
                }

                switch (interaction.customId) {
                    case 'first_page':
                        currentPage = 0;
                        break;
                    case 'prev_page':
                        if (currentPage > 0) currentPage--;
                        break;
                    case 'next_page':
                        if (currentPage < totalPages - 1) currentPage++;
                        break;
                    case 'last_page':
                        currentPage = totalPages - 1;
                        break;
                }

                await interaction.update({
                    embeds: [generateEmbed(currentPage)],
                    components: generateButtons(currentPage)
                });
            });

            collector.on('end', async () => {
                try {
                    await response.edit({ components: [] });
                } catch (error) {
                    // Message might have been deleted
                }
            });

        } catch (error) {
            console.error('Error listing characters:', error);
            await message.reply('An error occurred while retrieving characters.');
        }
    }
};
