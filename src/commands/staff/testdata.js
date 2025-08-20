const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasStaffRole } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testdata')
        .setDescription('[STAFF] Create test character data for persistence testing'),

    async execute(interaction) {
        if (!hasStaffRole(interaction.member)) {
            return interaction.reply({ 
                content: '❌ This command is for staff members only!', 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        try {
            const db = interaction.client.database;
            const userId = interaction.user.id;
            
            // Create test character
            const testCharacterData = {
                name: `TestChar_${Date.now()}`,
                race: 'Saiyan',
                gender: 'Male',
                background: 'Persistence Test Character',
                personality: 'Determined to survive redeployments',
                appearance: 'Glowing with test data energy'
            };

            const result = await db.createCharacter(userId, testCharacterData);
            const characterId = result.lastID;

            // Add some stats
            await db.updateCharacterStats(characterId, {
                base_pl: 1000,
                strength: 5,
                endurance: 5,
                dexterity: 5,
                intelligence: 5,
                ki_control: 5
            });

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
                .setFooter({ text: 'Use /test to check if this survives redeployment!' });

            await interaction.editReply({ embeds: [embed] });

            console.log(`🧪 Test character created: ${testCharacterData.name} (ID: ${characterId})`);

        } catch (error) {
            console.error('❌ Test data creation error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Test Data Creation Failed')
                .setDescription(`Error: ${error.message}`)
                .setColor(0xff0000);

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
