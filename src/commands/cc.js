const { EmbedBuilder } = require('discord.js');
const { races, defaultCharacterImage } = require('../utils/config');
const { getRacialForRace } = require('../utils/calculations');

module.exports = {
    name: 'cc',
    description: 'Create a character with a name and race',
    async execute(message, args, database) {
        if (args.length < 2) {
            return message.reply('Usage: `!cc <name> <race>`\nAvailable races: ' + races.join(', '));
        }

        const characterName = args[0];
        const raceName = args.slice(1).join(' ');

        // Case-insensitive race matching
        const validRace = races.find(race => race.toLowerCase() === raceName.toLowerCase());
        if (!validRace) {
            return message.reply(`Invalid race! Available races: ${races.join(', ')}`);
        }

        try {
            // Ensure user exists in database
            await database.createUser(message.author.id);

            // Check if character name already exists (case-insensitive)
            const existingCharacter = await database.getCharacterByName(characterName);
            if (existingCharacter) {
                return message.reply('A character with that name already exists!');
            }

            // Create the character
            const result = await database.run(
                `INSERT INTO characters (name, owner_id, race, image_url) VALUES (?, ?, ?, ?)`,
                [characterName, message.author.id, validRace, defaultCharacterImage]
            );

            const characterId = result.id;

            // Add racial ability for the race
            const racialTag = getRacialForRace(validRace);
            if (racialTag) {
                await database.run(
                    `INSERT INTO character_racials (character_id, racial_tag) VALUES (?, ?)`,
                    [characterId, racialTag]
                );
            }

            // Set as active character if user doesn't have one
            const user = await database.getUser(message.author.id);
            if (!user.active_character_id) {
                await database.run(
                    `UPDATE users SET active_character_id = ? WHERE user_id = ?`,
                    [characterId, message.author.id]
                );
            }

            // Create success embed
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('Character Created!')
                .setDescription(`Successfully created **${characterName}** (${validRace})`)
                .addFields(
                    { name: 'Race', value: validRace, inline: true },
                    { name: 'Base PL', value: '10', inline: true },
                    { name: 'Racial Ability', value: racialTag ? racialTag : 'None', inline: true }
                )
                .setThumbnail(defaultCharacterImage)
                .setFooter({ text: `Character ID: ${characterId}` })
                .setTimestamp();

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error creating character:', error);
            await message.reply('An error occurred while creating the character.');
        }
    }
};
