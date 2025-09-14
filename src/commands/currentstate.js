const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'currentstate',
    description: 'Check your current ascended state',
    async execute(message, args, database) {
        try {
            // Get user's active character
            const userData = await database.getUserWithActiveCharacter(message.author.id);
            if (!userData || !userData.active_character_id) {
                return message.reply('You don\'t have an active character.');
            }

            // Get current active form/state
            const activeState = await database.get(`
                SELECT f.name, f.pl_modifier, f.strength_modifier, f.defense_modifier, f.agility_modifier, f.endurance_modifier, f.control_modifier
                FROM character_forms cf
                JOIN forms f ON cf.form_key = f.form_key
                WHERE cf.character_id = ? AND cf.is_active = 1
                LIMIT 1
            `, [userData.active_character_id]);

            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle('🔍 Current State')
                .setDescription(`**${userData.name}**'s current ascended state`);

            if (activeState) {
                const modifiers = [];

                if (activeState.pl_modifier) modifiers.push(`PL: ${activeState.pl_modifier}`);
                if (activeState.strength_modifier) modifiers.push(`STR: ${activeState.strength_modifier}`);
                if (activeState.defense_modifier) modifiers.push(`DEF: ${activeState.defense_modifier}`);
                if (activeState.agility_modifier) modifiers.push(`AGI: ${activeState.agility_modifier}`);
                if (activeState.endurance_modifier) modifiers.push(`END: ${activeState.endurance_modifier}`);
                if (activeState.control_modifier) modifiers.push(`CON: ${activeState.control_modifier}`);

                embed.addFields(
                    { name: 'State', value: activeState.name, inline: false },
                    { name: 'Modifiers', value: modifiers.length > 0 ? modifiers.join('\n') : 'None', inline: false }
                );
            } else {
                embed.addFields(
                    { name: 'State', value: 'Base', inline: false }
                );
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in currentstate command:', error);
            await message.reply('An error occurred while checking your state.');
        }
    }
};
