const { EmbedBuilder } = require('discord.js');
const { calculateKiCost } = require('../utils/calculations');

module.exports = {
    name: 'mregen',
    description: 'Toggle enhanced Majin Regeneration (20%)',
    async execute(message, args, database) {
        if (args.length < 1) {
            return message.reply('Usage: `!mregen <on/off>`');
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

            // Check if character has Majin Regeneration racial
            const hasRacial = await database.get(`
                SELECT * FROM character_racials 
                WHERE character_id = ? AND racial_tag = 'mregen'
            `, [userData.active_character_id]);

            if (!hasRacial) {
                return message.reply('Your character doesn\'t have the Majin Regeneration racial ability.');
            }

            const isActivating = action === 'on';

            // Update the enhanced regeneration state
            await database.run(`
                UPDATE character_racials 
                SET is_active = ? 
                WHERE character_id = ? AND racial_tag = 'mregen_enhanced'
            `, [isActivating, userData.active_character_id]);

            // If no enhanced entry exists, create it
            if (isActivating) {
                // Use PostgreSQL or SQLite compatible syntax
                const query = database.usePostgres
                    ? `INSERT INTO character_racials (character_id, racial_tag, is_active)
                       VALUES ($1, 'mregen_enhanced', 1) ON CONFLICT (character_id, racial_tag) DO NOTHING`
                    : `INSERT OR IGNORE INTO character_racials (character_id, racial_tag, is_active)
                       VALUES (?, 'mregen_enhanced', 1)`;
                
                await database.run(query, [userData.active_character_id]);
            }

            // Calculate ki cost for enhanced regeneration
            const kiCost = calculateKiCost(3, userData.control);

            const embed = new EmbedBuilder()
                .setColor(isActivating ? 0xe91e63 : 0x95a5a6)
                .setTitle(`💖 Enhanced Majin Regeneration ${isActivating ? 'Activated' : 'Deactivated'}`)
                .setDescription(`**${userData.name}**'s enhanced regeneration has been turned **${action}**.`)
                .addFields(
                    { name: 'Regeneration Rate', value: isActivating ? '20% per turn' : '10% per turn (base)', inline: true },
                    { name: 'Ki Cost per Turn', value: isActivating ? `${kiCost} ki points` : 'None', inline: true }
                );

            if (isActivating) {
                embed.addFields(
                    { name: 'Note', value: 'This enhanced regeneration will drain ki at the start of each turn in combat.', inline: false }
                );
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in mregen command:', error);
            await message.reply('An error occurred while toggling enhanced regeneration.');
        }
    }
};
