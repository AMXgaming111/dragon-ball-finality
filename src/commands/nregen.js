const { EmbedBuilder } = require('discord.js');
const { calculateKiCost, calculateMaxHealthForCharacter } = require('../utils/calculations');

// Helper function to calculate cumulative ki cost for a given healing percentage
function calculateCumulativeKiCost(healingPercent) {
    if (healingPercent <= 0) return 0;
    
    // Ensure healing percent is in 10% increments and max 100%
    const intervals = Math.min(Math.floor(healingPercent / 10), 10);
    let totalCost = 0;
    
    // Each interval costs 3 more than the previous: 3, 6, 9, 12, 15, 18, 21, 24, 27, 30
    for (let i = 1; i <= intervals; i++) {
        totalCost += i * 3;
    }
    
    return totalCost;
}

// Helper function to determine max healing percentage for given ki amount
function getMaxHealingForKi(kiAmount) {
    let maxPercent = 0;
    
    // Check each 10% interval up to 100%
    for (let percent = 10; percent <= 100; percent += 10) {
        const cost = calculateCumulativeKiCost(percent);
        if (cost <= kiAmount) {
            maxPercent = percent;
        } else {
            break;
        }
    }
    
    return maxPercent;
}

// Helper function to generate cost breakdown display
function generateCostBreakdown() {
    let breakdown = '';
    for (let percent = 10; percent <= 100; percent += 10) {
        const cost = calculateCumulativeKiCost(percent);
        breakdown += `${percent}% = ${cost} ki\n`;
    }
    return breakdown;
}

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

            // Escalating ki cost system - show available options
            const maxHealth = await calculateMaxHealthForCharacter(
                database,
                userData.active_character_id,
                userData.base_pl,
                userData.endurance
            );
            const currentHealth = userData.current_health || maxHealth;
            const currentKi = userData.current_ki !== null ? userData.current_ki : userData.endurance;
            const maxHealingAvailable = getMaxHealingForKi(currentKi);

            const embed = new EmbedBuilder()
                .setColor(0x4caf50)
                .setTitle('🟢 Namekian Regeneration')
                .setDescription('Select healing percentage (escalating ki costs):')
                .addFields(
                    { name: 'Current Health', value: `${currentHealth}/${maxHealth}`, inline: true },
                    { name: 'Current Ki', value: `${currentKi}/${userData.endurance}`, inline: true },
                    { name: 'Max Affordable', value: `${maxHealingAvailable}%`, inline: true },
                    { name: 'Healing Costs', value: generateCostBreakdown(), inline: false }
                )
                .setFooter({ text: 'Type the healing percentage you want (10, 20, 30, etc.)' });

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

            const healingInput = parseInt(collected.first().content);
            if (isNaN(healingInput) || healingInput < 10 || healingInput > 100) {
                return message.reply('Invalid healing percentage! Must be between 10 and 100.');
            }

            // Check if healing percentage is a multiple of 10
            if (healingInput % 10 !== 0) {
                return message.reply('Healing percentage must be a multiple of 10 (10, 20, 30, etc.)!');
            }

            // Calculate ki cost for requested healing
            const kiCost = calculateCumulativeKiCost(healingInput);
            
            // Check if user has enough ki
            if (kiCost > currentKi) {
                return message.reply(`You don't have enough ki! Need ${kiCost} ki, have ${currentKi} ki.`);
            }

            // Calculate healing amount
            const healingAmount = Math.floor(maxHealth * (healingInput / 100));
            const newHealth = Math.min(maxHealth, currentHealth + healingAmount);
            const newKi = currentKi - kiCost;

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
                    { name: 'Healing Percentage', value: `${healingInput}%`, inline: true },
                    { name: 'Ki Spent', value: `${kiCost} ki`, inline: true },
                    { name: 'Health Restored', value: `${healingAmount} HP`, inline: true },
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
