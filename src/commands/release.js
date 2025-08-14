const { EmbedBuilder } = require('discord.js');
const { calculateEffectivePL, calculateEffectivePLWithRelease, calculateHealthPercentage, calculateMaxKi, getCombatBonuses } = require('../utils/calculations');

module.exports = {
    name: 'release',
    description: 'Adjust your effective power level percentage (useful for uncoded abilities/forms)',
    async execute(message, args, database) {
        try {
            // Get user data with active character
            const userData = await database.getUserWithActiveCharacter(message.author.id);
            if (!userData) {
                return message.reply('❌ You need to create and select a character first! Use `!cc` to create one and `!sw` to switch to it.');
            }

            // Check if percentage argument is provided
            if (!args[0]) {
                return message.reply('❌ Please specify a release percentage. Example: `!release 100%` for baseline power, `!release 50%` for half power.');
            }

            // Parse the percentage
            const percentageStr = args[0];
            if (!percentageStr.endsWith('%')) {
                return message.reply('❌ Please include the % symbol. Example: `!release 100%`');
            }

            const percentage = parseFloat(percentageStr.slice(0, -1));
            if (isNaN(percentage) || percentage < 0) {
                return message.reply('❌ Invalid percentage. Please use a positive number. Example: `!release 100%`');
            }

            // Update the character's release percentage in the database
            await database.run(
                'UPDATE characters SET release_percentage = ? WHERE id = ?',
                [percentage, userData.active_character_id]
            );

            // Calculate current values for display
            const maxKi = calculateMaxKi(userData.endurance);
            const currentKi = userData.current_ki || maxKi;
            const kiPercentage = calculateHealthPercentage(currentKi, maxKi);

            // Check for Arcosian Resilience
            const hasArcosianResilience = await database.get(
                'SELECT is_active FROM character_racials WHERE character_id = ? AND racial_tag = ? AND is_active = 1',
                [userData.active_character_id, 'aresist']
            );

            // Get combat bonuses
            const combatBonuses = await getCombatBonuses(database, userData.active_character_id, message.channel.id);

            // Get current form multiplier
            const currentForm = await database.get(
                'SELECT f.* FROM character_current_form ccf JOIN forms f ON ccf.form_key = f.form_key WHERE ccf.character_id = ?',
                [userData.active_character_id]
            );

            let formMultiplier = 1;
            if (currentForm && currentForm.pl_modifier) {
                const plModStr = currentForm.pl_modifier.toString();
                if (plModStr.startsWith('*')) {
                    formMultiplier = parseFloat(plModStr.slice(1));
                }
            }

            // Calculate base effective PL (at 100% release)
            const baseEffectivePL = calculateEffectivePL(
                userData.base_pl,
                kiPercentage,
                formMultiplier,
                !!hasArcosianResilience,
                combatBonuses.zenkaiBonus,
                combatBonuses.majinMagicBonus,
                100  // Always calculate at 100% for comparison
            );

            // Calculate final effective PL with the new release percentage
            const finalEffectivePL = calculateEffectivePL(
                userData.base_pl,
                kiPercentage,
                formMultiplier,
                !!hasArcosianResilience,
                combatBonuses.zenkaiBonus,
                combatBonuses.majinMagicBonus,
                percentage  // Use the specified release percentage
            );

            // Create embed response
            const embed = new EmbedBuilder()
                .setColor(0x9b59b6)
                .setTitle(`${userData.name} adjusts their power!`)
                .setDescription(`Release level set to **${percentage}%**`)
                .addFields(
                    { name: 'Base PL', value: userData.base_pl.toString(), inline: true },
                    { name: 'Form Multiplier', value: `${formMultiplier}x`, inline: true },
                    { name: 'Ki Status', value: `${Math.round(kiPercentage)}%`, inline: true },
                    { name: 'Combat Bonuses', value: `Zenkai: +${combatBonuses.zenkaiBonus} | Majin Magic: +${combatBonuses.majinMagicBonus}`, inline: false },
                    { name: 'Base Effective PL', value: `${baseEffectivePL} (100% release)`, inline: true },
                    { name: 'Current Effective PL', value: `${finalEffectivePL} (${percentage}% release)`, inline: true }
                );

            // Add special notes
            if (percentage > 100) {
                embed.addFields({ name: '⚡ Power Surge!', value: `You're releasing **${percentage}%** of your power - beyond normal limits!`, inline: false });
            } else if (percentage < 100) {
                embed.addFields({ name: '🔽 Power Suppression', value: `You're holding back, only using **${percentage}%** of your available power.`, inline: false });
            } else {
                embed.addFields({ name: '⚖️ Baseline Power', value: 'You\'re fighting at your natural effective power level.', inline: false });
            }

            if (!!hasArcosianResilience) {
                embed.addFields({ name: '🛡️ Arcosian Resilience', value: 'Ki debuffs are halved due to your racial ability.', inline: false });
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in release command:', error);
            await message.reply('❌ An error occurred while adjusting your power level. Please try again.');
        }
    }
};
