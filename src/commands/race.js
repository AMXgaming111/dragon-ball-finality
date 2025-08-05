const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'race',
    description: 'Toggle passive racial abilities on/off',
    async execute(message, args, database) {
        if (args.length < 1) {
            return message.reply('Usage: `!race <on/off>`');
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

            // Get character's passive racials
            const passiveRacials = await database.all(`
                SELECT racial_tag FROM character_racials 
                WHERE character_id = ? AND racial_tag IN ('zenkai', 'mregen', 'mmagic', 'aresist', 'hspirit')
            `, [userData.active_character_id]);

            if (passiveRacials.length === 0) {
                return message.reply('Your character doesn\'t have any passive racial abilities.');
            }

            const isActive = action === 'on';

            // Update racial states
            for (const racial of passiveRacials) {
                await database.run(
                    'UPDATE character_racials SET is_active = ? WHERE character_id = ? AND racial_tag = ?',
                    [isActive ? 1 : 0, userData.active_character_id, racial.racial_tag]
                );
            }

            const racialNames = {
                'zenkai': 'Zenkai',
                'mregen': 'Majin Regeneration',
                'mmagic': 'Majin\'s Magic',
                'aresist': 'Arcosian Resilience',
                'hspirit': 'Human Spirit'
            };

            const racialList = passiveRacials.map(r => racialNames[r.racial_tag] || r.racial_tag).join(', ');

            const embed = new EmbedBuilder()
                .setColor(isActive ? 0x2ecc71 : 0xe74c3c)
                .setTitle(`🧬 Racial Abilities ${isActive ? 'Activated' : 'Deactivated'}`)
                .setDescription(`**${userData.name}**'s passive racial abilities have been turned **${action}**.`)
                .addFields(
                    { name: 'Affected Racials', value: racialList, inline: false }
                );

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in race command:', error);
            await message.reply('An error occurred while toggling your racial abilities.');
        }
    }
};
