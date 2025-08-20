const { EmbedBuilder } = require('discord.js');
const { calculateKiCost } = require('../utils/calculations');

module.exports = {
    name: 'nregen',
    description: 'Use Namekian Regeneration',
    async execute(message, args, database) {
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

            // Flat ki cost for 10% healing (3 ki points per 10%)
            const minKiCost = 3;
            const maxHealth = userData.base_pl * userData.endurance;
            const currentHealth = userData.current_health || maxHealth;

            const embed = new EmbedBuilder()
                .setColor(0x4caf50)
                .setTitle('🟢 Namekian Regeneration')
                .setDescription('How much ki would you like to spend on regeneration?')
                .addFields(
                    { name: 'Current Health', value: `${currentHealth}/${maxHealth}`, inline: true },
                    { name: 'Cost per 10% heal', value: `${minKiCost} ki`, inline: true },
                    { name: 'Current Ki', value: `${userData.current_ki || userData.endurance}/${userData.endurance}`, inline: true }
                )
                .setFooter({ text: 'Type the amount of ki you want to spend (must be a multiple of 3)' });

            await message.reply({ embeds: [embed] });

            // Wait for user input
            const filter = (msg) => msg.author.id === message.author.id;
            const collected = await message.channel.awaitMessages({ 
                filter, 
                max: 1, 
                time: 30000 
            });

            if (collected.size === 0) {
                return message.reply('Regeneration timed out.');
            }

            const kiInput = parseInt(collected.first().content);
            if (isNaN(kiInput) || kiInput < minKiCost) {
                return message.reply(`Invalid ki amount! Must be at least ${minKiCost} ki.`);
            }

            // Check if ki input is a multiple of 3
            if (kiInput % 3 !== 0) {
                return message.reply('Ki amount must be a multiple of 3!');
            }

            // Check if user has enough ki
            const currentKi = userData.current_ki || userData.endurance;
            if (kiInput > currentKi) {
                return message.reply(`You don't have enough ki! Current ki: ${currentKi}`);
            }

            // Calculate healing amount (10% per minimum cost unit)
            const healingUnits = Math.floor(kiInput / minKiCost);
            const healingPercent = healingUnits * 10;
            const healingAmount = Math.floor(maxHealth * (healingPercent / 100));
            
            const newHealth = Math.min(maxHealth, currentHealth + healingAmount);
            const newKi = currentKi - kiInput;

            // Update character's health and ki
            await database.run(
                'UPDATE characters SET current_health = ?, current_ki = ? WHERE id = ?',
                [newHealth, newKi, userData.active_character_id]
            );

            // Create result embed
            const resultEmbed = new EmbedBuilder()
                .setColor(0x4caf50)
                .setTitle('🟢 Namekian Regeneration Complete')
                .setDescription(`**${userData.name}** has regenerated health!`)
                .addFields(
                    { name: 'Ki Spent', value: `${kiInput} ki`, inline: true },
                    { name: 'Health Restored', value: `${healingAmount} HP`, inline: true },
                    { name: 'Healing Percentage', value: `${healingPercent}%`, inline: true },
                    { name: 'New Health', value: `${newHealth}/${maxHealth}`, inline: true },
                    { name: 'Remaining Ki', value: `${newKi}/${userData.endurance}`, inline: true }
                )
                .setTimestamp();

            await message.reply({ embeds: [resultEmbed] });

        } catch (error) {
            console.error('Error in nregen command:', error);
            await message.reply('An error occurred while using regeneration.');
        }
    }
};
