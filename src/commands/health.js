const { EmbedBuilder } = require('discord.js');
const { parseModifier, applyModifier, calculateMaxHealth, calculateMaxHealthForCharacter, generateHealthBar, calculateEffectivePL } = require('../utils/calculations');

module.exports = {
    name: 'health',
    description: 'Display or modify character health',
    async execute(message, args, database) {
        let targetUserId = message.author.id;
        let targetUser = message.author;
        let modifierStr = null;

        // Parse arguments - can be !health, !health @user, !health +20, or !health @user +20
        if (args.length === 1) {
            // Check if it's a user mention or a modifier
            if (args[0].startsWith('<@')) {
                // It's a user mention
                const userId = args[0].replace(/[<@!>]/g, '');
                targetUser = await message.client.users.fetch(userId).catch(() => null);
                if (!targetUser) {
                    return message.reply('User not found!');
                }
                targetUserId = targetUser.id;
            } else {
                // It's a modifier for own character
                modifierStr = args[0];
            }
        } else if (args.length === 2) {
            // Could be !health @user +20 OR !health + 20 (space separated modifier)
            if (args[0].startsWith('<@')) {
                // It's !health @user +20
                const userId = args[0].replace(/[<@!>]/g, '');
                targetUser = await message.client.users.fetch(userId).catch(() => null);
                if (!targetUser) {
                    return message.reply('User not found!');
                }
                targetUserId = targetUser.id;
                modifierStr = args[1];
            } else {
                // It's !health + 20 (space separated modifier for own character)
                modifierStr = args[0] + args[1]; // Combine "+ 20" into "+20"
            }
        } else if (args.length === 3) {
            // !health @user + 20 (space separated)
            const userId = args[0].replace(/[<@!>]/g, '');
            targetUser = await message.client.users.fetch(userId).catch(() => null);
            if (!targetUser) {
                return message.reply('User not found!');
            }
            targetUserId = targetUser.id;
            modifierStr = args[1] + args[2]; // Combine "+ 20" into "+20"
        }

        try {
            // Get user's active character with form data
            const userData = await database.getUserWithActiveCharacter(targetUserId);
            if (!userData || !userData.active_character_id) {
                const pronoun = targetUserId === message.author.id ? 'You don\'t' : `${targetUser.username} doesn't`;
                return message.reply(`${pronoun} have an active character.`);
            }

            // Get active form data for health calculations
            const activeForm = await database.get(`
                SELECT f.name, f.pl_modifier, f.endurance_modifier, cf.is_active
                FROM character_forms cf
                JOIN forms f ON cf.form_key = f.form_key
                WHERE cf.character_id = ? AND cf.is_active = 1
                LIMIT 1
            `, [userData.active_character_id]);

            let formMultiplier = 1;
            let enduranceModifier = 0;
            let basePLModifier = 1;

            if (activeForm) {
                // Parse the old-style form modifiers
                if (activeForm.pl_modifier) {
                    // Parse modifier like "*5" or "+100"
                    const plMod = activeForm.pl_modifier;
                    if (plMod.startsWith('*')) {
                        basePLModifier = parseFloat(plMod.substring(1)) || 1;
                    } else if (plMod.startsWith('+')) {
                        basePLModifier = 1 + (parseFloat(plMod.substring(1)) || 0);
                    }
                }
                if (activeForm.endurance_modifier) {
                    // Parse modifier like "+40" or "-10"
                    const endMod = activeForm.endurance_modifier;
                    if (endMod.startsWith('+')) {
                        enduranceModifier = parseFloat(endMod.substring(1)) || 0;
                    } else if (endMod.startsWith('-')) {
                        enduranceModifier = -(parseFloat(endMod.substring(1)) || 0);
                    }
                }
            }

            // Calculate modified stats
            const modifiedBasePL = userData.base_pl * basePLModifier;
            const modifiedEndurance = userData.endurance + enduranceModifier;
            
            // Calculate max health with form modifications and Ki Control scaling
            const maxHealth = await calculateMaxHealthForCharacter(
                database, 
                userData.active_character_id, 
                modifiedBasePL, 
                modifiedEndurance, 
                formMultiplier
            );
            let currentHealth = userData.current_health;

            // Set default if null (use percentage of new max if form changed)
            if (currentHealth === null) {
                currentHealth = maxHealth;
                await database.run(
                    'UPDATE characters SET current_health = ? WHERE id = ?',
                    [currentHealth, userData.active_character_id]
                );
            }

            // Store original health percentage for form transitions (use Ki Control-adjusted max health)
            const originalMaxHealth = await calculateMaxHealthForCharacter(
                database, 
                userData.active_character_id, 
                userData.base_pl, 
                userData.endurance, 
                1 // No form multiplier for original calculation
            );
            const healthPercentage = (currentHealth / originalMaxHealth) * 100;

            if (modifierStr) {
                // Modifying health - check if it's a percentage
                const isPercentage = modifierStr.includes('%');
                let value = modifierStr.replace('%', '');
                
                const modifier = parseModifier(value);
                if (!modifier) {
                    return message.reply('Invalid modifier! Use +, -, *, /, or set');
                }

                if (isPercentage) {
                    // Convert percentage to actual health value
                    const percentValue = (modifier.value / 100) * maxHealth;
                    modifier.value = percentValue;
                }

                // Apply the modifier
                const newHealth = Math.floor(applyModifier(currentHealth, modifier));

                // Update database
                await database.run(
                    'UPDATE characters SET current_health = ? WHERE id = ?',
                    [newHealth, userData.active_character_id]
                );

                currentHealth = newHealth;

                // Update ki maximum based on new health percentage - automatically enforce cap
                const { enforceKiCap } = require('../utils/calculations');
                await enforceKiCap(database, userData.active_character_id);
            }

            // Calculate current health percentage
            const currentHealthPercentage = Math.max(0, (currentHealth / maxHealth) * 100);
            const clampedPercentage = Math.max(0, Math.min(120, currentHealthPercentage));

            // Generate health bar with custom emoji
            const healthBar = generateHealthBar(clampedPercentage, '1400942686495572041');

            // Create embed with cleaner layout
            const embed = new EmbedBuilder()
                .setColor(currentHealth > 0 ? (currentHealthPercentage >= 50 ? 0x2ecc71 : 0xf39c12) : 0xe74c3c)
                .setTitle(`${userData.name}'s Health`)
                .setDescription(`${healthBar}\n${currentHealth}/${maxHealth} (${Math.round(clampedPercentage)}%)`)
                .setTimestamp();

            // Add form information if active
            if (activeForm) {
                embed.addFields({ 
                    name: 'Active Form', 
                    value: activeForm.name, 
                    inline: true 
                });
            }

            // Add status indicators
            if (currentHealth > maxHealth) {
                embed.addFields({ name: 'Status', value: '🔋 Overhealed', inline: false });
            } else if (currentHealth <= 0) {
                embed.addFields({ name: 'Status', value: '💀 Critical', inline: false });
            } else if (currentHealthPercentage < 20) {
                embed.addFields({ name: 'Status', value: '⚠️ Low Health', inline: false });
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error managing health:', error);
            await message.reply('An error occurred while managing health.');
        }
    }
};
