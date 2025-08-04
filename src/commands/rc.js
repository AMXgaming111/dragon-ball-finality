const { EmbedBuilder } = require('discord.js');
const { staffRoleName, racials } = require('../utils/config');
const { hasStaffRole } = require('../utils/calculations');

module.exports = {
    name: 'rc',
    description: 'Add or remove racials from a character (Staff only)',
    async execute(message, args, database) {
        // Check staff permissions
        const member = message.guild.members.cache.get(message.author.id);
        if (!hasStaffRole(member, staffRoleName)) {
            return message.reply('This command requires the Staff role.');
        }

        if (args.length < 3) {
            const availableRacials = Object.keys(racials).join(', ');
            return message.reply(`Usage: \`!rc <@user> <add/remove> <racial>\`\nAvailable racials: ${availableRacials}`);
        }

        // Parse arguments
        const userMention = args[0];
        const action = args[1].toLowerCase();
        const racialTag = args[2].toLowerCase();

        // Validate action
        if (!['add', 'remove'].includes(action)) {
            return message.reply('Action must be either `add` or `remove`.');
        }

        // Validate racial
        if (!racials[racialTag]) {
            const availableRacials = Object.keys(racials).join(', ');
            return message.reply(`Invalid racial! Available racials: ${availableRacials}`);
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

            if (action === 'add') {
                // Check if character already has this racial
                const existingRacial = await database.get(
                    'SELECT * FROM character_racials WHERE character_id = ? AND racial_tag = ?',
                    [characterId, racialTag]
                );

                if (existingRacial) {
                    return message.reply(`${characterName} already has the ${racials[racialTag].name} racial.`);
                }

                // Add the racial
                await database.run(
                    'INSERT INTO character_racials (character_id, racial_tag, is_active) VALUES (?, ?, ?)',
                    [characterId, racialTag, true]
                );

                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('Racial Added')
                    .setDescription(`Added **${racials[racialTag].name}** to ${characterName}`)
                    .addFields(
                        { name: 'Character', value: characterName, inline: true },
                        { name: 'Owner', value: `<@${userId}>`, inline: true },
                        { name: 'Racial', value: racials[racialTag].name, inline: true }
                    )
                    .setFooter({ text: racials[racialTag].description })
                    .setTimestamp();

                await message.reply({ embeds: [embed] });

            } else if (action === 'remove') {
                // Check if character has this racial
                const existingRacial = await database.get(
                    'SELECT * FROM character_racials WHERE character_id = ? AND racial_tag = ?',
                    [characterId, racialTag]
                );

                if (!existingRacial) {
                    return message.reply(`${characterName} doesn't have the ${racials[racialTag].name} racial.`);
                }

                // Remove the racial
                await database.run(
                    'DELETE FROM character_racials WHERE character_id = ? AND racial_tag = ?',
                    [characterId, racialTag]
                );

                const embed = new EmbedBuilder()
                    .setColor(0xff6b6b)
                    .setTitle('Racial Removed')
                    .setDescription(`Removed **${racials[racialTag].name}** from ${characterName}`)
                    .addFields(
                        { name: 'Character', value: characterName, inline: true },
                        { name: 'Owner', value: `<@${userId}>`, inline: true },
                        { name: 'Racial', value: racials[racialTag].name, inline: true }
                    )
                    .setTimestamp();

                await message.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error managing racial:', error);
            await message.reply('An error occurred while managing the racial.');
        }
    }
};
