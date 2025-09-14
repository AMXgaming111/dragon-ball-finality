const { EmbedBuilder } = require('discord.js');
const { races, defaultCharacterImage } = require('../utils/config');
const { getRacialForRace } = require('../utils/calculations');

module.exports = {
    name: 'cc',
    description: 'Create a character with a name and race. Use quotes for names with spaces: !cc "Name Here" race',
    async execute(message, args, database) {
        if (args.length < 2) {
            return message.reply('Usage: `!cc "<name>" <race>` or `!cc <name> <race>`\nAvailable races: ' + races.join(', '));
        }

        let characterName;
        let raceName;

        // Check if the first argument starts with a quote
        if (args[0].startsWith('"')) {
            // Find the closing quote
            const fullCommand = args.join(' ');
            const firstQuote = fullCommand.indexOf('"');
            const secondQuote = fullCommand.indexOf('"', firstQuote + 1);
            
            if (secondQuote === -1) {
                return message.reply('Missing closing quote! Usage: `!cc "<name>" <race>`\nExample: `!cc "Kazurai Sakada" saiyan`');
            }
            
            // Extract name between quotes
            characterName = fullCommand.substring(firstQuote + 1, secondQuote);
            
            // Extract race after the closing quote
            raceName = fullCommand.substring(secondQuote + 1).trim();
            
            if (!characterName || !raceName) {
                return message.reply('Invalid format! Usage: `!cc "<name>" <race>`\nExample: `!cc "Kazurai Sakada" saiyan`');
            }
        } else {
            // Original behavior for names without quotes
            characterName = args[0];
            raceName = args.slice(1).join(' ');
        }

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

            // Grant innate states for specific races
            if (validRace === 'Arcosian') {
                // Grant Suppression Form (minimal) to all Arcosians as an innate state
                await database.run(
                    `INSERT INTO character_forms (character_id, form_key, is_active) VALUES (?, ?, ?)`,
                    [characterId, 'minimal', false]
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
                    { name: 'Base PL', value: '1', inline: true },
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
