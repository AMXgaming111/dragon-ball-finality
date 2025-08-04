const { EmbedBuilder } = require('discord.js');
const { staffRoleName } = require('../utils/config');
const { parseModifier, applyModifier, hasStaffRole } = require('../utils/calculations');

module.exports = {
    name: 'spl',
    description: 'Modify a character\'s base power level (Staff only)',
    async execute(message, args, database) {
        // Check staff permissions
        const member = message.guild.members.cache.get(message.author.id);
        if (!hasStaffRole(member, staffRoleName)) {
            return message.reply('This command requires the Staff role.');
        }

        if (args.length < 3) {
            return message.reply('Usage: `!spl <@user> <+/-/*/set> <value>`\nExamples: `!spl @user + 10`, `!spl @user set 50`, `!spl @user * 2`');
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
            const currentBPL = userData.base_pl;

            // Parse and apply modifier
            const modifier = parseModifier(operation + value);
            if (!modifier) {
                return message.reply('Invalid operation! Use +, -, *, /, or set');
            }

            const newBPL = Math.max(1, Math.floor(applyModifier(currentBPL, modifier)));

            // Update the character's base PL
            await database.run(
                'UPDATE characters SET base_pl = ? WHERE id = ?',
                [newBPL, characterId]
            );

            // Create result embed
            const embed = new EmbedBuilder()
                .setColor(0x9b59b6)
                .setTitle('Base Power Level Modified')
                .setDescription(`Updated **${characterName}**'s Base PL`)
                .addFields(
                    { name: 'Character', value: characterName, inline: true },
                    { name: 'Owner', value: `<@${userId}>`, inline: true },
                    { name: 'Operation', value: `${operation}${value}`, inline: true },
                    { name: 'Previous BPL', value: currentBPL.toString(), inline: true },
                    { name: 'New BPL', value: newBPL.toString(), inline: true },
                    { name: 'Change', value: `${newBPL > currentBPL ? '+' : ''}${newBPL - currentBPL}`, inline: true }
                )
                .setTimestamp();

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error modifying base PL:', error);
            await message.reply('An error occurred while modifying the base power level.');
        }
    }
};
