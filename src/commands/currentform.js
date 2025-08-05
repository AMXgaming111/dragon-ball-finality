const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'currentform',
    description: 'Check your current form',
    async execute(message, args, database) {
        try {
            // Get user's active character
            const userData = await database.getUserWithActiveCharacter(message.author.id);
            if (!userData || !userData.active_character_id) {
                return message.reply('You don\'t have an active character.');
            }

            // Get current active form
            const activeForm = await database.get(`
                SELECT f.name, f.pl_modifier, f.strength_modifier, f.defense_modifier, f.agility_modifier, f.endurance_modifier, f.control_modifier
                FROM character_forms cf
                JOIN forms f ON cf.form_key = f.form_key
                WHERE cf.character_id = ? AND cf.is_active = 1
                LIMIT 1
            `, [userData.active_character_id]);

            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle('🔍 Current Form')
                .setDescription(`**${userData.name}**'s current form`);

            if (activeForm) {
                const modifiers = [];

                if (activeForm.pl_modifier) modifiers.push(`PL: ${activeForm.pl_modifier}`);
                if (activeForm.strength_modifier) modifiers.push(`STR: ${activeForm.strength_modifier}`);
                if (activeForm.defense_modifier) modifiers.push(`DEF: ${activeForm.defense_modifier}`);
                if (activeForm.agility_modifier) modifiers.push(`AGI: ${activeForm.agility_modifier}`);
                if (activeForm.endurance_modifier) modifiers.push(`END: ${activeForm.endurance_modifier}`);
                if (activeForm.control_modifier) modifiers.push(`CON: ${activeForm.control_modifier}`);

                embed.addFields(
                    { name: 'Form', value: activeForm.name, inline: false },
                    { name: 'Modifiers', value: modifiers.length > 0 ? modifiers.join('\n') : 'None', inline: false }
                );
            } else {
                embed.addFields(
                    { name: 'Form', value: 'Base', inline: false }
                );
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in currentform command:', error);
            await message.reply('An error occurred while checking your form.');
        }
    }
};
