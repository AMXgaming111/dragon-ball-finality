const { EmbedBuilder } = require('discord.js');
const { staffRoleName } = require('../utils/config');
const { hasStaffRole, parseModifier, applyModifier, calculateMaxHealthForCharacter } = require('../utils/calculations');

module.exports = {
    name: 'saddall',
    description: 'Modify all character attributes (Staff only)',
    async execute(message, args, database) {
        // Check staff permissions
        const member = message.guild.members.cache.get(message.author.id);
        if (!hasStaffRole(member, staffRoleName)) {
            return message.reply('This command requires the Staff role.');
        }

        if (args.length < 3) {
            return message.reply('Usage: `!saddall <@user> <+/-/*/set> <value>`\nExamples: `!saddall @user + 10`, `!saddall @user set 20`');
        }

        // Parse arguments
        const userMention = args[0];
        const operation = args[1];
        const value = parseFloat(args[2]);

        if (isNaN(value)) {
            return message.reply('Value must be a number.');
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

            // Define all stats to modify
            const stats = ['strength', 'defense', 'agility', 'endurance', 'control'];
            const oldValues = {};
            const newValues = {};

            // Parse and apply modifier
            const modifier = parseModifier(operation + value);
            if (!modifier) {
                return message.reply('Invalid operation! Use +, -, *, /, or set');
            }

            // Calculate new values for all stats
            for (const stat of stats) {
                const currentValue = userData[stat];
                oldValues[stat] = currentValue;
                newValues[stat] = Math.max(1, Math.floor(applyModifier(currentValue, modifier)));
            }

            // Update all stats in the database
            const updateQuery = `
                UPDATE characters 
                SET strength = ?, defense = ?, agility = ?, endurance = ?, control = ? 
                WHERE id = ?
            `;
            await database.run(updateQuery, [
                newValues.strength,
                newValues.defense,
                newValues.agility,
                newValues.endurance,
                newValues.control,
                characterId
            ]);

            // If endurance was modified, may need to update health/ki
            if (newValues.endurance !== oldValues.endurance) {
                // Recalculate max health and ki based on new endurance
                const newMaxHealth = await calculateMaxHealthForCharacter(characterId);
                const newMaxKi = newValues.endurance;
                
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
                .setTitle('All Attributes Modified')
                .setDescription(`Updated all stats for **${characterName}**`)
                .addFields(
                    { name: 'Character', value: characterName, inline: true },
                    { name: 'Owner', value: `<@${userId}>`, inline: true },
                    { name: 'Operation', value: `${operation}${value}`, inline: true }
                );

            // Add before/after fields for each stat
            const statDisplayNames = {
                'strength': 'Strength',
                'defense': 'Defense',
                'agility': 'Agility',
                'endurance': 'Endurance',
                'control': 'Control'
            };

            for (const stat of stats) {
                embed.addFields({
                    name: statDisplayNames[stat],
                    value: `${oldValues[stat]} → ${newValues[stat]}`,
                    inline: true
                });
            }

            embed.setTimestamp();

            // Add special note for endurance changes
            if (newValues.endurance !== oldValues.endurance) {
                embed.addFields({
                    name: 'Note',
                    value: 'Endurance affects maximum Health and Ki pools',
                    inline: false
                });
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error modifying all attributes:', error);
            await message.reply('An error occurred while modifying the attributes.');
        }
    }
};
