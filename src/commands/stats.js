const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { staffRoleName, racials, magicAffinityDisplayNames } = require('../utils/config');
const { hasStaffRole } = require('../utils/calculations');

module.exports = {
    name: 'stats',
    description: 'Display character stats',
    async execute(message, args, database) {
        let targetUserId = message.author.id;
        let targetUser = message.author;

        // Check if querying another user
        if (args.length > 0) {
            const member = message.guild.members.cache.get(message.author.id);
            if (!hasStaffRole(member, staffRoleName)) {
                return message.reply('You need the Staff role to view other users\' stats.');
            }

            const userMention = args[0];
            const userId = userMention.replace(/[<@!>]/g, '');
            
            targetUser = await message.client.users.fetch(userId).catch(() => null);
            if (!targetUser) {
                return message.reply('User not found!');
            }
            targetUserId = targetUser.id;
        }

        try {
            // Get user's active character with racials
            const userData = await database.getUserWithActiveCharacter(targetUserId);
            if (!userData || !userData.active_character_id) {
                const pronoun = targetUserId === message.author.id ? 'You don\'t' : `${targetUser.username} doesn't`;
                return message.reply(`${pronoun} have an active character.`);
            }

            const characterData = await database.getCharacterWithRacials(userData.active_character_id);
            const characterRacials = characterData.racials ? characterData.racials.split(',') : [];

            // Generate main stats embed
            const generateStatsEmbed = () => {
                const embed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle(`${userData.name}'s Stats`)
                    .setThumbnail(userData.image_url || require('../utils/config').defaultCharacterImage)
                    .addFields(
                        { name: 'Base PL', value: userData.base_pl.toString(), inline: false },
                        { name: 'Strength', value: userData.strength.toString(), inline: true },
                        { name: 'Defense', value: userData.defense.toString(), inline: true },
                        { name: 'Agility', value: userData.agility.toString(), inline: true },
                        { name: 'Endurance', value: userData.endurance.toString(), inline: true },
                        { name: 'Control', value: userData.control.toString(), inline: true },
                        { name: 'Race', value: userData.race, inline: true }
                    )
                    .setFooter({ text: `Owner: ${targetUser.username}` })
                    .setTimestamp();

                return embed;
            };

            // Generate skills embed
            const generateSkillsEmbed = () => {
                const kiControlLevels = ['None', 'Basic', 'Advanced'];
                const magicMasteryLevels = ['None', 'Basic', 'Specialized', 'Veteran', 'Archmage'];

                const kiControlLevel = kiControlLevels[userData.ki_control] || 'None';
                const magicMasteryLevel = magicMasteryLevels[userData.magic_mastery] || 'None';

                const embed = new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle(`${userData.name}'s Skills`)
                    .addFields(
                        { name: 'Ki Control Mastery', value: kiControlLevel, inline: true },
                        { name: 'Magic Mastery', value: magicMasteryLevel, inline: true },
                        { name: '\u200b', value: '\u200b', inline: true } // Empty field for spacing
                    );

                // Add magic affinities if any
                if (userData.primary_affinity) {
                    const displayName = magicAffinityDisplayNames[userData.primary_affinity] || userData.primary_affinity;
                    embed.addFields({ name: 'Primary Affinity', value: displayName, inline: true });
                }

                if (userData.secondary_affinities) {
                    const secondaryAffinities = userData.secondary_affinities.split(',')
                        .map(affinity => magicAffinityDisplayNames[affinity] || affinity)
                        .join(', ');
                    embed.addFields({ name: 'Secondary Affinities', value: secondaryAffinities, inline: true });
                }

                // Add racials
                if (characterRacials.length > 0) {
                    const racialNames = characterRacials.map(tag => racials[tag]?.name || tag).join(', ');
                    embed.addFields({ name: 'Racial', value: racialNames, inline: false });
                }

                embed.setTimestamp();
                return embed;
            };

            // Generate forms embed
            const generateFormsEmbed = async () => {
                const characterForms = await database.all(`
                    SELECT f.* FROM character_forms cf 
                    JOIN forms f ON cf.form_key = f.form_key 
                    WHERE cf.character_id = ?
                `, [userData.active_character_id]);

                const embed = new EmbedBuilder()
                    .setColor(0xf39c12)
                    .setTitle(`${userData.name}'s Forms`)
                    .setTimestamp();

                if (characterForms.length === 0) {
                    embed.setDescription('No forms available.');
                } else {
                    let description = '';
                    characterForms.forEach(form => {
                        description += `**${form.name}**\n`;
                        
                        const modifiers = [];
                        if (form.strength_modifier) modifiers.push(`STR: ${form.strength_modifier}`);
                        if (form.defense_modifier) modifiers.push(`DEF: ${form.defense_modifier}`);
                        if (form.agility_modifier) modifiers.push(`AGI: ${form.agility_modifier}`);
                        if (form.endurance_modifier) modifiers.push(`END: ${form.endurance_modifier}`);
                        if (form.control_modifier) modifiers.push(`CON: ${form.control_modifier}`);
                        if (form.pl_modifier) modifiers.push(`PL: ${form.pl_modifier}`);
                        
                        if (modifiers.length > 0) {
                            description += `└ ${modifiers.join(', ')}\n`;
                        }
                        description += '\n';
                    });
                    embed.setDescription(description);
                }

                return embed;
            };

            // Create buttons
            const createButtons = (currentView) => {
                const row = new ActionRowBuilder();
                
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('view_stats')
                        .setLabel('Stats')
                        .setStyle(currentView === 'stats' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('view_skills')
                        .setLabel('Skills')
                        .setStyle(currentView === 'skills' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('view_forms')
                        .setLabel('Forms')
                        .setStyle(currentView === 'forms' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                );

                return row;
            };

            // Send initial message
            const response = await message.reply({
                embeds: [generateStatsEmbed()],
                components: [createButtons('stats')]
            });

            // Handle button interactions
            const collector = response.createMessageComponentCollector({ 
                time: 300000 // 5 minutes
            });

            collector.on('collect', async (interaction) => {
                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({ 
                        content: 'Only the person who initiated this command can use these buttons.', 
                        ephemeral: true 
                    });
                }

                let embed;
                let currentView;

                switch (interaction.customId) {
                    case 'view_stats':
                        embed = generateStatsEmbed();
                        currentView = 'stats';
                        break;
                    case 'view_skills':
                        embed = generateSkillsEmbed();
                        currentView = 'skills';
                        break;
                    case 'view_forms':
                        embed = await generateFormsEmbed();
                        currentView = 'forms';
                        break;
                }

                await interaction.update({
                    embeds: [embed],
                    components: [createButtons(currentView)]
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
            console.error('Error displaying stats:', error);
            await message.reply('An error occurred while retrieving character stats.');
        }
    }
};
