const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { staffRoleName, racials, magicAffinityDisplayNames } = require('../utils/config');
const { hasStaffRole, getTransformedStats } = require('../utils/calculations');

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
            const generateStatsEmbed = async () => {
                // Get transformed stats
                const baseStats = {
                    strength: userData.strength,
                    defense: userData.defense,
                    agility: userData.agility,
                    endurance: userData.endurance,
                    control: userData.control
                };

                const { stats: transformedStats, form: activeForm } = await getTransformedStats(
                    database, 
                    userData.active_character_id, 
                    baseStats
                );

                const embed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle(`${userData.name}'s Stats`)
                    .setThumbnail(userData.image_url || require('../utils/config').defaultCharacterImage)
                    .addFields(
                        { name: 'Base PL', value: userData.base_pl.toString(), inline: false }
                    );

                // Add stats with transformed values in parentheses if different
                const formatStat = (baseStat, transformedStat, statName) => {
                    if (baseStat === transformedStat) {
                        return baseStat.toString();
                    } else {
                        return `${baseStat} (${transformedStat})`;
                    }
                };

                embed.addFields(
                    { name: 'Strength', value: formatStat(baseStats.strength, transformedStats.strength), inline: true },
                    { name: 'Defense', value: formatStat(baseStats.defense, transformedStats.defense), inline: true },
                    { name: 'Agility', value: formatStat(baseStats.agility, transformedStats.agility), inline: true },
                    { name: 'Endurance', value: formatStat(baseStats.endurance, transformedStats.endurance), inline: true },
                    { name: 'Control', value: formatStat(baseStats.control, transformedStats.control), inline: true },
                    { name: 'Race', value: userData.race, inline: true },
                    { name: 'Attribute Points', value: (userData.ap || 0).toString(), inline: true }
                );

                // Show current form if active
                if (activeForm) {
                    embed.addFields({
                        name: 'Current State',
                        value: `**${activeForm.name}**`,
                        inline: false
                    });
                }

                // Add specializations if any are set
                if (userData.primary_specialization || userData.secondary_specialization) {
                    let specializationText = '';
                    if (userData.primary_specialization) {
                        specializationText += `**Primary:** ${userData.primary_specialization.charAt(0).toUpperCase() + userData.primary_specialization.slice(1)}`;
                    }
                    if (userData.secondary_specialization) {
                        if (specializationText) specializationText += '\n';
                        specializationText += `**Secondary:** ${userData.secondary_specialization.charAt(0).toUpperCase() + userData.secondary_specialization.slice(1)}`;
                    }
                    embed.addFields({ name: 'Specializations', value: specializationText, inline: false });
                }

                embed.setFooter({ text: `Owner: ${targetUser.username}` })
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

            // Generate states embed
            const generateStatesEmbed = async () => {
                const characterStates = await database.all(`
                    SELECT f.* FROM character_forms cf 
                    JOIN forms f ON cf.form_key = f.form_key 
                    WHERE cf.character_id = ?
                `, [userData.active_character_id]);

                const embed = new EmbedBuilder()
                    .setColor(0xf39c12)
                    .setTitle(`${userData.name}'s States`)
                    .setTimestamp();

                if (characterStates.length === 0) {
                    embed.setDescription('No ascended states available.');
                } else {
                    let description = '';
                    characterStates.forEach(state => {
                        description += `**${state.name}**\n`;
                        
                        const modifiers = [];
                        if (state.strength_modifier) modifiers.push(`STR: ${state.strength_modifier}`);
                        if (state.defense_modifier) modifiers.push(`DEF: ${state.defense_modifier}`);
                        if (state.agility_modifier) modifiers.push(`AGI: ${state.agility_modifier}`);
                        if (state.endurance_modifier) modifiers.push(`END: ${state.endurance_modifier}`);
                        if (state.control_modifier) modifiers.push(`CON: ${state.control_modifier}`);
                        if (state.pl_modifier) modifiers.push(`PL: ${state.pl_modifier}`);
                        
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
                        .setCustomId('view_states')
                        .setLabel('States')
                        .setStyle(currentView === 'states' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                );

                return row;
            };

            // Send initial message
            const response = await message.reply({
                embeds: [await generateStatsEmbed()],
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
                        embed = await generateStatsEmbed();
                        currentView = 'stats';
                        break;
                    case 'view_skills':
                        embed = generateSkillsEmbed();
                        currentView = 'skills';
                        break;
                    case 'view_states':
                        embed = await generateStatesEmbed();
                        currentView = 'states';
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
