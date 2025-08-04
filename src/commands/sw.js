const { EmbedBuilder } = require('discord.js');
const { staffRoleName } = require('../utils/config');
const { hasStaffRole } = require('../utils/calculations');

module.exports = {
    name: 'sw',
    description: 'Switch to another character',
    async execute(message, args, database) {
        if (args.length < 1) {
            return message.reply('Usage: `!sw <character_name>`');
        }

        const characterName = args.join(' ');

        try {
            // Find the character (case-insensitive)
            const character = await database.getCharacterByName(characterName);
            if (!character) {
                return message.reply('Character not found!');
            }

            // Check permissions: owner or staff
            const member = message.guild.members.cache.get(message.author.id);
            const isOwner = character.owner_id === message.author.id;
            const isStaff = hasStaffRole(member, staffRoleName);

            if (!isOwner && !isStaff) {
                return message.reply('You can only switch to your own characters, or you need the Staff role to switch to any character.');
            }

            // Ensure user exists in database
            await database.createUser(message.author.id);

            // Update active character
            await database.run(
                'UPDATE users SET active_character_id = ? WHERE user_id = ?',
                [character.id, message.author.id]
            );

            // Get character with racials for display
            const characterData = await database.getCharacterWithRacials(character.id);
            const racials = characterData.racials ? characterData.racials.split(',') : [];

            // Create success embed
            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle('Character Switched!')
                .setDescription(`Successfully switched to **${character.name}**`)
                .addFields(
                    { name: 'Race', value: character.race, inline: true },
                    { name: 'Base PL', value: character.base_pl.toString(), inline: true },
                    { name: 'Owner', value: `<@${character.owner_id}>`, inline: true }
                )
                .setThumbnail(character.image_url || require('../utils/config').defaultCharacterImage)
                .setTimestamp();

            // Add racials if any
            if (racials.length > 0) {
                embed.addFields({ 
                    name: 'Racials', 
                    value: racials.join(', '), 
                    inline: false 
                });
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error switching character:', error);
            await message.reply('An error occurred while switching characters.');
        }
    }
};
