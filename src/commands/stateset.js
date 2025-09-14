const { EmbedBuilder } = require('discord.js');
const { staffRoleName } = require('../utils/config');
const { hasStaffRole } = require('../utils/calculations');

module.exports = {
    name: 'stateset',
    description: 'Give or remove ascended states from characters (Staff only)',
    async execute(message, args, database) {
        // Check staff permissions
        const member = message.guild.members.cache.get(message.author.id);
        if (!hasStaffRole(member, staffRoleName)) {
            return message.reply('This command requires the Staff role.');
        }

        if (args.length < 3) {
            return message.reply('Usage: `!stateset <give/remove> <@user> <state_key>`\nExamples: `!stateset give @AMX ssj`, `!stateset remove @Justine sspirit`');
        }

        // Parse arguments
        const action = args[0].toLowerCase();
        const userMention = args[1];
        const stateKey = args[2].toLowerCase();

        // Validate action
        if (!['give', 'remove'].includes(action)) {
            return message.reply('Action must be either `give` or `remove`.');
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

            // Check if state exists
            const state = await database.get('SELECT * FROM forms WHERE form_key = ?', [stateKey]);
            if (!state) {
                return message.reply(`Ascended state with key '${stateKey}' doesn't exist!`);
            }

            if (action === 'give') {
                // Check if character already has this state
                const existingState = await database.get(
                    'SELECT * FROM character_forms WHERE character_id = ? AND form_key = ?',
                    [characterId, stateKey]
                );

                if (existingState) {
                    return message.reply(`${characterName} already has access to the ${state.name} ascended state.`);
                }

                // Give state to character
                await database.run(
                    'INSERT INTO character_forms (character_id, form_key, is_active) VALUES (?, ?, ?)',
                    [characterId, stateKey, false]
                );

                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('✨ Ascended State Granted')
                    .setDescription(`**${state.name}** ascended state has been granted to **${characterName}**.`)
                    .addFields(
                        { name: 'Character', value: characterName, inline: true },
                        { name: 'Owner', value: `<@${userId}>`, inline: true },
                        { name: 'State', value: state.name, inline: true }
                    )
                    .setTimestamp();

                await message.reply({ embeds: [embed] });

            } else if (action === 'remove') {
                // Check if character has this state
                const existingState = await database.get(
                    'SELECT * FROM character_forms WHERE character_id = ? AND form_key = ?',
                    [characterId, stateKey]
                );

                if (!existingState) {
                    return message.reply(`${characterName} doesn't have access to the ${state.name} ascended state.`);
                }

                // If character is currently in this state, deactivate it first
                if (existingState.is_active) {
                    await database.run(
                        'UPDATE character_forms SET is_active = 0 WHERE character_id = ? AND form_key = ?',
                        [characterId, stateKey]
                    );
                }

                // Remove state from character
                await database.run(
                    'DELETE FROM character_forms WHERE character_id = ? AND form_key = ?',
                    [characterId, stateKey]
                );

                const embed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setTitle('❌ Ascended State Removed')
                    .setDescription(`**${state.name}** ascended state has been removed from **${characterName}**.`)
                    .addFields(
                        { name: 'Character', value: characterName, inline: true },
                        { name: 'Owner', value: `<@${userId}>`, inline: true },
                        { name: 'State', value: state.name, inline: true }
                    )
                    .setTimestamp();

                await message.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in stateset command:', error);
            await message.reply('An error occurred while managing the ascended state.');
        }
    }
};
