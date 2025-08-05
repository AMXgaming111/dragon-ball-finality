const { EmbedBuilder } = require('discord.js');
const { calculateKiCost } = require('../utils/calculations');

module.exports = {
    name: 'ngiant',
    description: 'Toggle Namekian Giant Form',
    async execute(message, args, database) {
        if (args.length < 1) {
            return message.reply('Usage: `!ngiant <on/off>`');
        }

        const action = args[0].toLowerCase();

        if (!['on', 'off'].includes(action)) {
            return message.reply('Action must be either `on` or `off`');
        }

        try {
            // Get user's active character
            const userData = await database.getUserWithActiveCharacter(message.author.id);
            if (!userData || !userData.active_character_id) {
                return message.reply('You don\'t have an active character.');
            }

            // Check if character has Namekian Physiology racial
            const hasRacial = await database.get(`
                SELECT * FROM character_racials 
                WHERE character_id = ? AND racial_tag = 'nphys'
            `, [userData.active_character_id]);

            if (!hasRacial) {
                return message.reply('Your character doesn\'t have the Namekian Physiology racial ability.');
            }

            const isActivating = action === 'on';

            // Update the giant form state
            await database.run(`
                UPDATE character_racials 
                SET is_active = ? 
                WHERE character_id = ? AND racial_tag = 'ngiant'
            `, [isActivating, userData.active_character_id]);

            // If no giant entry exists, create it
            if (isActivating) {
                await database.run(`
                    INSERT OR IGNORE INTO character_racials (character_id, racial_tag, is_active)
                    VALUES (?, 'ngiant', 1)
                `, [userData.active_character_id]);
            }

            // Calculate ki cost for giant form
            const kiCost = calculateKiCost(3, userData.control);

            const embed = new EmbedBuilder()
                .setColor(isActivating ? 0x4caf50 : 0x95a5a6)
                .setTitle(`🟢 Namekian Giant Form ${isActivating ? 'Activated' : 'Deactivated'}`)
                .setDescription(`**${userData.name}**'s giant form has been turned **${action}**.`)
                .addFields(
                    { name: 'Stat Bonus', value: isActivating ? '+40 Strength & Defense' : 'None', inline: true },
                    { name: 'Ki Cost per Turn', value: isActivating ? `${kiCost} ki points` : 'None', inline: true }
                );

            if (isActivating) {
                embed.addFields(
                    { name: 'Note', value: 'This form will drain ki at the start of each turn in combat.', inline: false }
                );
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in ngiant command:', error);
            await message.reply('An error occurred while toggling giant form.');
        }
    }
};
