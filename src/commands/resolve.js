const { EmbedBuilder } = require('discord.js');
const { cleanupExpiredAttacks, createCombatResultEmbed } = require('../utils/combat');
const { calculateMaxHealth, generateHealthBar, hasStaffRole } = require('../utils/calculations');

module.exports = {
    name: 'resolve',
    description: 'Manually resolve expired attacks (Staff only)',
    async execute(message, args, database) {
        // Check staff permissions
        if (!hasStaffRole(message.member)) {
            return message.reply('This command is restricted to staff members.');
        }

        try {
            // Get all expired pending attacks in this channel
            const expiredAttacks = await database.all(`
                SELECT * FROM pending_attacks 
                WHERE channel_id = ? AND datetime(expires_at) <= datetime('now')
                ORDER BY created_at ASC
            `, [message.channel.id]);

            if (expiredAttacks.length === 0) {
                await cleanupExpiredAttacks(database);
                return message.reply('No expired attacks found in this channel.');
            }

            let resolvedCount = 0;

            for (const attack of expiredAttacks) {
                try {
                    // Get character data
                    const attackerData = await database.getUserWithActiveCharacter(attack.attacker_user_id);
                    const targetData = await database.getUserWithActiveCharacter(attack.target_user_id);

                    if (!attackerData || !targetData) {
                        // Skip if characters no longer exist
                        await database.run('DELETE FROM pending_attacks WHERE id = ?', [attack.id]);
                        continue;
                    }

                    // Apply full damage (undefended attack)
                    const maxHealth = targetData.base_pl * targetData.endurance;
                    const currentHealth = targetData.current_health || maxHealth;
                    const newHealth = Math.max(0, currentHealth - attack.damage);

                    await database.run(
                        'UPDATE characters SET current_health = ? WHERE id = ?',
                        [newHealth, attack.target_character_id]
                    );
                    
                    // Update ki cap based on new health percentage with Human Spirit consideration
                    const { calculateKiCap } = require('../utils/calculations');
                    const newKiCap = await calculateKiCap(database, {
                        id: attack.target_character_id,
                        base_pl: targetData.base_pl,
                        endurance: targetData.endurance,
                        current_health: newHealth
                    });
                    
                    // Don't increase current ki, only limit maximum
                    const currentKi = targetData.current_ki || targetData.endurance;
                    const adjustedKi = Math.min(currentKi, newKiCap);
                    
                    await database.run(
                        'UPDATE characters SET current_ki = ? WHERE id = ?',
                        [adjustedKi, attack.target_character_id]
                    );

                    // Create result embed for undefended attack
                    const embed = new EmbedBuilder()
                        .setColor(0xe74c3c)
                        .setTitle('⚔️ Undefended Attack Resolved')
                        .setDescription(`**${targetData.name}** failed to defend against **${attackerData.name}**'s ${attack.attack_type} attack in time!`)
                        .addFields(
                            { name: 'Full Damage Taken', value: attack.damage.toString(), inline: true },
                            { name: 'Attack Accuracy', value: attack.accuracy.toString(), inline: true }
                        );

                    // Add health information
                    const healthPercentage = (newHealth / maxHealth) * 100;
                    const healthBar = generateHealthBar(healthPercentage);
                    
                    embed.addFields({
                        name: `${targetData.name}'s Health`,
                        value: `${healthBar}\n${newHealth}/${maxHealth} (${Math.round(healthPercentage)}%)`,
                        inline: false
                    });
                    
                    if (newHealth <= 0) {
                        embed.addFields({ name: 'Status', value: '💀 **DEFEATED**', inline: false });
                    } else if (healthPercentage < 20) {
                        embed.addFields({ name: 'Status', value: '⚠️ **CRITICAL**', inline: false });
                    }

                    embed.setFooter({ text: 'Attack expired - full damage applied automatically' });

                    await message.channel.send({ embeds: [embed] });

                    // Remove the expired attack
                    await database.run('DELETE FROM pending_attacks WHERE id = ?', [attack.id]);
                    resolvedCount++;

                } catch (error) {
                    console.error('Error resolving expired attack:', error);
                    // Remove the problematic attack
                    await database.run('DELETE FROM pending_attacks WHERE id = ?', [attack.id]);
                }
            }

            // Clean up any remaining expired attacks
            await cleanupExpiredAttacks(database);

            if (resolvedCount > 0) {
                await message.reply(`Resolved ${resolvedCount} expired attack(s).`);
            } else {
                await message.reply('No valid expired attacks to resolve.');
            }

        } catch (error) {
            console.error('Error in resolve command:', error);
            await message.reply('An error occurred while resolving expired attacks.');
        }
    }
};
