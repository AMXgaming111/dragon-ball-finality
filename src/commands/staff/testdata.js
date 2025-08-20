const { EmbedBuilder } = require('discord.js');
const { hasStaffRole } = require('../../utils/calculations');

module.exports = {
    name: 'testdata',
    description: '[STAFF] Create test character data for persistence testing',
    async execute(message, args, database) {
        if (!hasStaffRole(message.member)) {
            return message.reply('❌ This command is for staff members only!');
        }

        try {
            const userId = message.author.id;
            
            // Create test character
            const testCharacterData = {
                name: `TestChar_${Date.now()}`,
                race: 'Saiyan',
                gender: 'Male',
                background: 'Persistence Test Character',
                personality: 'Determined to survive redeployments',
                appearance: 'Glowing with test data energy'
            };

            // Create character using the database schema
            const result = await database.run(`
                INSERT INTO characters (name, owner_id, race, base_pl, strength, defense, agility, endurance, control)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                testCharacterData.name,
                userId,
                testCharacterData.race,
                1000, // base_pl
                5, 5, 5, 5, 5 // stats
            ]);

            const characterId = result.id;

            const embed = new EmbedBuilder()
                .setTitle('🧪 Test Character Created')
                .setDescription('Test character created for persistence testing!')
                .addFields(
                    { name: '👤 Character Name', value: testCharacterData.name, inline: true },
                    { name: '🏁 Race', value: testCharacterData.race, inline: true },
                    { name: '🆔 Character ID', value: characterId.toString(), inline: true },
                    { name: '💪 Base PL', value: '1000', inline: true },
                    { name: '📊 Stats', value: 'All stats set to 5', inline: true },
                    { name: '⏰ Created', value: new Date().toISOString(), inline: true }
                )
                .setColor(0x0099ff)
                .setTimestamp()
                .setFooter({ text: 'Use !test to check if this survives redeployment!' });

            await message.reply({ embeds: [embed] });

            console.log(`🧪 Test character created: ${testCharacterData.name} (ID: ${characterId})`);

        } catch (error) {
            console.error('❌ Test data creation error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Test Data Creation Failed')
                .setDescription(`Error: ${error.message}`)
                .setColor(0xff0000);

            await message.reply({ embeds: [errorEmbed] });
        }
    },
};
