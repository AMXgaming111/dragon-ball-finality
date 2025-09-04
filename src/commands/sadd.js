const { EmbedBuilder } = require('discord.js');
const { staffRoleName } = require('../utils/config');
const { hasStaffRole, parseModifier, applyModifier } = require('../utils/calculations');

module.exports = {
    name: 'sadd',
    description: 'Modify character attributes (Staff only)',
    async execute(message, args, database) {
        // Check staff permissions
        const member = message.guild.members.cache.get(message.author.id);
        if (!hasStaffRole(member, staffRoleName)) {
            return message.reply('This command requires the Staff role.');
        }

        if (args.length < 4) {
            return message.reply('Usage: `!sadd <@user> <stat> <+/-/*/set> <value>`\nStats: str, def, agi, end, cont, ap\nExamples: `!sadd @user str + 10`, `!sadd @user def set 20`, `!sadd @user ap + 5`');
        }

        // Parse arguments
        const userMention = args[0];
        const statAbbr = args[1].toLowerCase();
        const operation = args[2];
        const value = parseFloat(args[3]);

        if (isNaN(value)) {
            return message.reply('Value must be a number.');
        }

        // Validate stat abbreviation
        const statMap = {
            'str': 'strength',
            'def': 'defense',
            'agi': 'agility',
            'end': 'endurance',
            'cont': 'control',
            'ap': 'ap'
        };

        if (!statMap[statAbbr]) {
            return message.reply('Invalid stat! Use: str, def, agi, end, cont, ap');
        }

        const statName = statMap[statAbbr];

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
            const currentValue = userData[statName];

            // Parse and apply modifier
            const modifier = parseModifier(operation + value);
            if (!modifier) {
                return message.reply('Invalid operation! Use +, -, *, /, or set');
            }

            const newValue = Math.max(1, Math.floor(applyModifier(currentValue, modifier)));

            // Update the character's stat
            const updateQuery = `UPDATE characters SET ${statName} = ? WHERE id = ?`;
            await database.run(updateQuery, [newValue, characterId]);

            // If endurance was modified, may need to update health/ki
            if (statName === 'endurance') {
                // Recalculate max health and ki based on new endurance
                const newMaxHealth = userData.base_pl * newValue;
                const newMaxKi = newValue;
                
                // If current health/ki are null, set them to new maximums
                if (userData.current_health === null) {
                    await database.run(
                        'UPDATE characters SET current_health = ? WHERE id = ?',
                        [newMaxHealth, characterId]
                    );
                }
                if (userData.current_ki === null) {
                    await database.run(
                        'UPDATE characters SET current_ki = ? WHERE id = ?',
                        [newMaxKi, characterId]
                    );
                }
            }

            // Create result embed
            const embed = new EmbedBuilder()
                .setColor(0x8e44ad)
                .setTitle('Attribute Modified')
                .setDescription(`Updated **${characterName}**'s ${statName}`)
                .addFields(
                    { name: 'Character', value: characterName, inline: true },
                    { name: 'Owner', value: `<@${userId}>`, inline: true },
                    { name: 'Stat', value: statName.charAt(0).toUpperCase() + statName.slice(1), inline: true },
                    { name: 'Operation', value: `${operation}${value}`, inline: true },
                    { name: 'Previous Value', value: currentValue.toString(), inline: true },
                    { name: 'New Value', value: newValue.toString(), inline: true }
                )
                .setTimestamp();

            // Add special note for endurance changes
            if (statName === 'endurance') {
                embed.addFields({
                    name: 'Note',
                    value: 'Endurance affects maximum Health and Ki pools',
                    inline: false
                });
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error modifying attribute:', error);
            await message.reply('An error occurred while modifying the attribute.');
        }
    }
};
