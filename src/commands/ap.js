const { EmbedBuilder } = require('discord.js');
const { calculateStatCaps } = require('../utils/calculations');

module.exports = {
    name: 'ap',
    description: 'Spend Attribute Points to increase stats',
    async execute(message, args, database) {
        if (args.length !== 2) {
            return message.reply('Usage: `!ap <stat> <amount>`\nStats: str, def, agi, end, cont\nExample: `!ap str 5`');
        }

        const statAbbr = args[0].toLowerCase();
        const amount = parseInt(args[1]);

        if (isNaN(amount) || amount <= 0) {
            return message.reply('Amount must be a positive number.');
        }

        // Validate stat abbreviation
        const statMap = {
            'str': 'strength',
            'def': 'defense',
            'agi': 'agility',
            'end': 'endurance',
            'cont': 'control'
        };

        if (!statMap[statAbbr]) {
            return message.reply('Invalid stat! Use: str, def, agi, end, cont');
        }

        const statName = statMap[statAbbr];

        try {
            // Get user's active character
            const userData = await database.getUserWithActiveCharacter(message.author.id);
            if (!userData || !userData.active_character_id) {
                return message.reply("You don't have an active character.");
            }

            const characterId = userData.active_character_id;
            const characterName = userData.name;
            const currentAP = userData.ap || 0;
            const currentStatValue = userData[statName];

            // Check if user has enough AP
            if (currentAP < amount) {
                return message.reply(`You only have ${currentAP} AP available. You need ${amount} AP for this upgrade.`);
            }

            // Calculate stat caps for this character
            const caps = calculateStatCaps(userData);
            const maxAllowed = caps[statName];

            // Check if the upgrade would exceed the cap
            const newStatValue = currentStatValue + amount;
            if (newStatValue > maxAllowed) {
                const availablePoints = maxAllowed - currentStatValue;
                if (availablePoints <= 0) {
                    return message.reply(`Your ${statName} is already at the maximum cap of ${maxAllowed} for your race and specializations.`);
                } else {
                    return message.reply(`This would exceed your ${statName} cap of ${maxAllowed}. You can only add ${availablePoints} more points to ${statName}.`);
                }
            }

            // Perform the upgrade
            const newAP = currentAP - amount;
            
            await database.run(
                `UPDATE characters SET ${statName} = ?, ap = ? WHERE id = ?`,
                [newStatValue, newAP, characterId]
            );

            // If endurance was modified, may need to update health/ki
            if (statName === 'endurance') {
                // Recalculate max health and ki based on new endurance
                const { calculateMaxHealthForCharacter } = require('../utils/calculations');
                const newMaxHealth = await calculateMaxHealthForCharacter(database, characterId, userData.base_pl, newStatValue);
                const newMaxKi = newStatValue;
                
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
                .setColor(0x2ecc71)
                .setTitle('Attribute Points Spent')
                .setDescription(`**${characterName}** spent ${amount} AP on ${statName}`)
                .addFields(
                    { name: 'Previous Value', value: currentStatValue.toString(), inline: true },
                    { name: 'New Value', value: newStatValue.toString(), inline: true },
                    { name: 'Remaining AP', value: newAP.toString(), inline: true },
                    { name: 'Cap for this stat', value: `${newStatValue}/${maxAllowed}`, inline: false }
                )
                .setFooter({ text: `Use !stats to see your updated character sheet` })
                .setTimestamp();

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in ap command:', error);
            await message.reply('There was an error processing your request. Please try again.');
        }
    }
};