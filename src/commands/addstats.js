const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'addstats',
    description: 'Add character image. Use quotes for names with spaces: !addstats pic "Name Here" <url>',
    async execute(message, args, database) {
        if (args.length < 3) {
            return message.reply('Usage: `!addstats pic "<character_name>" <image_url>` or `!addstats pic <character_name> <image_url>`');
        }

        const subcommand = args[0].toLowerCase();
        if (subcommand !== 'pic') {
            return message.reply('Usage: `!addstats pic "<character_name>" <image_url>` or `!addstats pic <character_name> <image_url>`');
        }

        let characterName;
        let imageUrl;

        // Check if the second argument starts with a quote (after 'pic')
        if (args[1].startsWith('"')) {
            // Find the closing quote
            const commandAfterPic = args.slice(1).join(' '); // Everything after 'pic'
            const firstQuote = commandAfterPic.indexOf('"');
            const secondQuote = commandAfterPic.indexOf('"', firstQuote + 1);
            
            if (secondQuote === -1) {
                return message.reply('Missing closing quote! Usage: `!addstats pic "<character_name>" <image_url>`\nExample: `!addstats pic "Kazurai Sakada" https://example.com/image.png`');
            }
            
            // Extract name between quotes
            characterName = commandAfterPic.substring(firstQuote + 1, secondQuote);
            
            // Extract image URL after the closing quote
            imageUrl = commandAfterPic.substring(secondQuote + 1).trim();
            
            if (!characterName || !imageUrl) {
                return message.reply('Invalid format! Usage: `!addstats pic "<character_name>" <image_url>`\nExample: `!addstats pic "Kazurai Sakada" https://example.com/image.png`');
            }
        } else {
            // Original behavior for names without quotes
            characterName = args[1];
            imageUrl = args[2];
        }

        // Basic URL validation
        if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
            return message.reply('Please provide a valid image URL (starting with http:// or https://)');
        }

        try {
            // Find the character (case-insensitive)
            const character = await database.getCharacterByName(characterName);
            if (!character) {
                return message.reply('Character not found!');
            }

            // Check if user owns the character
            if (character.owner_id !== message.author.id) {
                return message.reply('You can only modify the image of your own characters.');
            }

            // Update character image
            await database.run(
                'UPDATE characters SET image_url = ? WHERE id = ?',
                [imageUrl, character.id]
            );

            // Create success embed
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('Character Image Updated!')
                .setDescription(`Successfully updated **${character.name}**'s image.`)
                .setThumbnail(imageUrl)
                .addFields(
                    { name: 'Character', value: character.name, inline: true },
                    { name: 'Race', value: character.race, inline: true }
                )
                .setTimestamp();

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error updating character image:', error);
            await message.reply('An error occurred while updating the character image. Please make sure the URL is valid.');
        }
    }
};
