const { EmbedBuilder } = require('discord.js');
const { staffRoleName } = require('../utils/config');
const { hasStaffRole } = require('../utils/calculations');

module.exports = {
    name: 'formset',
    description: 'Give or remove forms from characters (Staff only)',
    async execute(message, args, database) {
        // Check staff permissions
        const member = message.guild.members.cache.get(message.author.id);
        if (!hasStaffRole(member, staffRoleName)) {
            return message.reply('This command requires the Staff role.');
        }

        if (args.length < 3) {
            return message.reply('Usage: `!formset <give/remove> <@user> <form_key>`\nExamples: `!formset give @user ssj`, `!formset remove @user ssj`');
        }

        // Parse arguments
        const action = args[0].toLowerCase();
        const userMention = args[1];
        const formKey = args[2].toLowerCase();

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

            // Check if form exists
            const form = await database.get('SELECT * FROM forms WHERE form_key = ?', [formKey]);
            if (!form) {
                return message.reply(`Form with key '${formKey}' doesn't exist!`);
            }

            if (action === 'give') {
                // Check if character already has this form
                const existingForm = await database.get(
                    'SELECT * FROM character_forms WHERE character_id = ? AND form_key = ?',
                    [characterId, formKey]
                );

                if (existingForm) {
                    return message.reply(`${characterName} already has access to the ${form.name} form.`);
                }

                // Give form to character
                await database.run(
                    'INSERT INTO character_forms (character_id, form_key, is_active) VALUES (?, ?, ?)',
                    [characterId, formKey, false]
                );

                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('✨ Form Granted')
                    .setDescription(`**${form.name}** form has been granted to **${characterName}**.`)
                    .addFields(
                        { name: 'Character', value: characterName, inline: true },
                        { name: 'Owner', value: `<@${userId}>`, inline: true },
                        { name: 'Form', value: form.name, inline: true }
                    )
                    .setTimestamp();

                await message.reply({ embeds: [embed] });

            } else if (action === 'remove') {
                // Check if character has this form
                const existingForm = await database.get(
                    'SELECT * FROM character_forms WHERE character_id = ? AND form_key = ?',
                    [characterId, formKey]
                );

                if (!existingForm) {
                    return message.reply(`${characterName} doesn't have access to the ${form.name} form.`);
                }

                // If character is currently in this form, deactivate it first
                if (existingForm.is_active) {
                    await database.run(
                        'UPDATE character_forms SET is_active = 0 WHERE character_id = ? AND form_key = ?',
                        [characterId, formKey]
                    );
                }

                // Remove form from character
                await database.run(
                    'DELETE FROM character_forms WHERE character_id = ? AND form_key = ?',
                    [characterId, formKey]
                );

                const embed = new EmbedBuilder()
                    .setColor(0xff6b6b)
                    .setTitle('❌ Form Revoked')
                    .setDescription(`**${form.name}** form has been removed from **${characterName}**.`)
                    .addFields(
                        { name: 'Character', value: characterName, inline: true },
                        { name: 'Owner', value: `<@${userId}>`, inline: true },
                        { name: 'Form', value: form.name, inline: true }
                    )
                    .setTimestamp();

                await message.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error managing form access:', error);
            await message.reply('An error occurred while managing form access.');
        }
    }
};
