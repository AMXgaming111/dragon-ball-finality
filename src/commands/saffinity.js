const { EmbedBuilder } = require('discord.js');
const { staffRoleName, magicAffinities } = require('../utils/config');
const { hasStaffRole } = require('../utils/calculations');

module.exports = {
    name: 'saffinity',
    description: 'Manage character magic affinities (Staff only)',
    async execute(message, args, database) {
        // Check staff permissions
        const member = message.guild.members.cache.get(message.author.id);
        if (!hasStaffRole(member, staffRoleName)) {
            return message.reply('This command requires the Staff role.');
        }

        if (args.length < 3) {
            const availableAffinities = magicAffinities.join(', ');
            return message.reply(`Usage: \`!saffinity <@user> <affinity> <1/2/0>\`\n1 = Primary, 2 = Secondary, 0 = Remove\nAvailable affinities: ${availableAffinities}`);
        }

        // Parse arguments
        const userMention = args[0];
        const affinityName = args[1];
        const action = args[2];

        // Validate affinity
        const validAffinity = magicAffinities.find(affinity => affinity.toLowerCase() === affinityName.toLowerCase());
        if (!validAffinity) {
            const availableAffinities = magicAffinities.join(', ');
            return message.reply(`Invalid affinity! Available affinities: ${availableAffinities}`);
        }

        // Validate action
        if (!['1', '2', '0'].includes(action)) {
            return message.reply('Action must be 1 (Primary), 2 (Secondary), or 0 (Remove).');
        }

        // Parse user ID
        const userId = userMention.replace(/[<@!>]/g, '');
        const targetUser = await message.client.users.fetch(userId).catch(() => null);
        if (!targetUser) {
            return message.reply('User not found!');
        }

        try {
            // Get user's active character
            const userData = await database.getUserWithActiveCharacter(userId);
            if (!userData || !userData.active_character_id) {
                return message.reply(`${targetUser.username} doesn't have an active character.`);
            }

            const characterId = userData.active_character_id;
            const characterName = userData.name;

            if (action === '1') {
                // Set as primary affinity
                await database.run(
                    'UPDATE characters SET primary_affinity = ? WHERE id = ?',
                    [validAffinity, characterId]
                );

                const embed = new EmbedBuilder()
                    .setColor(0x9b59b6)
                    .setTitle('🔮 Primary Affinity Set')
                    .setDescription(`**${characterName}**'s primary affinity has been set to **${validAffinity}**.`)
                    .addFields(
                        { name: 'Character', value: characterName, inline: true },
                        { name: 'Owner', value: `<@${userId}>`, inline: true },
                        { name: 'Primary Affinity', value: validAffinity, inline: true }
                    )
                    .setTimestamp();

                await message.reply({ embeds: [embed] });

            } else if (action === '2') {
                // Add to secondary affinities
                let secondaryAffinities = userData.secondary_affinities ? userData.secondary_affinities.split(',') : [];
                
                if (!secondaryAffinities.includes(validAffinity)) {
                    secondaryAffinities.push(validAffinity);
                    
                    await database.run(
                        'UPDATE characters SET secondary_affinities = ? WHERE id = ?',
                        [secondaryAffinities.join(','), characterId]
                    );

                    const embed = new EmbedBuilder()
                        .setColor(0x8e44ad)
                        .setTitle('🔮 Secondary Affinity Added')
                        .setDescription(`**${validAffinity}** has been added to **${characterName}**'s secondary affinities.`)
                        .addFields(
                            { name: 'Character', value: characterName, inline: true },
                            { name: 'Owner', value: `<@${userId}>`, inline: true },
                            { name: 'Secondary Affinities', value: secondaryAffinities.join(', '), inline: false }
                        )
                        .setTimestamp();

                    await message.reply({ embeds: [embed] });
                } else {
                    return message.reply(`${characterName} already has ${validAffinity} as a secondary affinity.`);
                }

            } else if (action === '0') {
                // Remove affinity
                let updated = false;
                
                // Check if it's the primary affinity
                if (userData.primary_affinity === validAffinity) {
                    await database.run(
                        'UPDATE characters SET primary_affinity = NULL WHERE id = ?',
                        [characterId]
                    );
                    updated = true;
                }

                // Check if it's in secondary affinities
                let secondaryAffinities = userData.secondary_affinities ? userData.secondary_affinities.split(',') : [];
                if (secondaryAffinities.includes(validAffinity)) {
                    secondaryAffinities = secondaryAffinities.filter(affinity => affinity !== validAffinity);
                    
                    await database.run(
                        'UPDATE characters SET secondary_affinities = ? WHERE id = ?',
                        [secondaryAffinities.length > 0 ? secondaryAffinities.join(',') : null, characterId]
                    );
                    updated = true;
                }

                if (updated) {
                    const embed = new EmbedBuilder()
                        .setColor(0x95a5a6)
                        .setTitle('🔮 Affinity Removed')
                        .setDescription(`**${validAffinity}** has been removed from **${characterName}**'s affinities.`)
                        .addFields(
                            { name: 'Character', value: characterName, inline: true },
                            { name: 'Owner', value: `<@${userId}>`, inline: true }
                        )
                        .setTimestamp();

                    await message.reply({ embeds: [embed] });
                } else {
                    return message.reply(`${characterName} doesn't have ${validAffinity} as an affinity.`);
                }
            }

        } catch (error) {
            console.error('Error managing affinity:', error);
            await message.reply('An error occurred while managing the magic affinity.');
        }
    }
};
