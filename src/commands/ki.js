const { EmbedBuilder } = require('discord.js');
const { parseModifier, applyModifier, calculateMaxKi, generateKiBar, calculateEffectivePL, calculateKiCap, hasHumanSpirit, calculateMaxHealthForCharacter } = require('../utils/calculations');

module.exports = {
    name: 'ki',
    description: 'Display or modify character ki',
    async execute(message, args, database) {
        let targetUserId = message.author.id;
        let targetUser = message.author;
        let modifierStr = null;

        // Parse arguments - can be !ki, !ki @user, !ki +20, or !ki @user +20
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
            // Could be !ki @user +20 OR !ki + 20 (space separated modifier)
            if (args[0].startsWith('<@')) {
                // It's !ki @user +20
                const userId = args[0].replace(/[<@!>]/g, '');
                targetUser = await message.client.users.fetch(userId).catch(() => null);
                if (!targetUser) {
                    return message.reply('User not found!');
                }
                targetUserId = targetUser.id;
                modifierStr = args[1];
            } else {
                // It's !ki + 20 (space separated modifier for own character)
                modifierStr = args[0] + args[1]; // Combine "+ 20" into "+20"
            }
        } else if (args.length === 3) {
            // !ki @user + 20 (space separated)
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

            // Get active form data for ki calculations
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
            
            // Calculate max health and ki with form modifications using proper Ki Control system
            const maxHealth = await calculateMaxHealthForCharacter(
                database, 
                userData.active_character_id, 
                modifiedBasePL, 
                modifiedEndurance, 
                1 // formMultiplier is already applied to basePL above
            );
            const maxKi = modifiedEndurance; // Ki max is always endurance (with form mods)
            
            let currentHealth = userData.current_health;
            let currentKi = userData.current_ki;

            // Set defaults if null
            if (currentHealth === null) {
                currentHealth = maxHealth;
                await database.run(
                    'UPDATE characters SET current_health = ? WHERE id = ?',
                    [currentHealth, userData.active_character_id]
                );
            }

            if (currentKi === null) {
                currentKi = maxKi;
                await database.run(
                    'UPDATE characters SET current_ki = ? WHERE id = ?',
                    [currentKi, userData.active_character_id]
                );
            }

            // Calculate ki cap using the standardized function (accounts for Human Spirit racial)
            const healthPercentage = (currentHealth / maxHealth) * 100;
            let kiCap;
            
            if (healthPercentage >= 100) {
                kiCap = modifiedEndurance;
            } else {
                // Calculate base ki reduction
                const baseReduction = (100 - healthPercentage) / 100;
                
                // Check for Human Spirit racial (halves ki cap reduction)
                const humanSpirit = await hasHumanSpirit(database, userData.active_character_id);
                const actualReduction = humanSpirit ? baseReduction * 0.5 : baseReduction;
                
                kiCap = Math.round(modifiedEndurance * (1 - actualReduction));
                kiCap = Math.max(1, kiCap); // Minimum 1 ki cap
            }

            if (modifierStr) {
                // Modifying ki - check if it's a percentage
                const isPercentage = modifierStr.includes('%');
                let value = modifierStr.replace('%', '');
                
                const modifier = parseModifier(value);
                if (!modifier) {
                    return message.reply('Invalid modifier! Use +, -, *, /, or set');
                }

                if (isPercentage) {
                    // Convert percentage to actual ki value based on max ki
                    const percentValue = (modifier.value / 100) * maxKi;
                    modifier.value = percentValue;
                }

                // Apply the modifier
                let newKi = Math.floor(applyModifier(currentKi, modifier));
                
                // Update database first
                await database.run(
                    'UPDATE characters SET current_ki = ? WHERE id = ?',
                    [newKi, userData.active_character_id]
                );

                // Enforce ki cap - automatically lower ki if above health cap
                const { enforceKiCap } = require('../utils/calculations');
                await enforceKiCap(database, userData.active_character_id);
                
                // Get the updated ki value after cap enforcement
                const updatedCharacter = await database.get(
                    'SELECT current_ki FROM characters WHERE id = ?',
                    [userData.active_character_id]
                );
                currentKi = updatedCharacter.current_ki;
            }

            // Calculate ki percentage based on actual max ki (not capped)
            const kiPercentage = Math.max(0, (currentKi / maxKi) * 100);
            const clampedPercentage = Math.max(0, Math.min(120, kiPercentage));

            // Generate ki bar with custom emoji (using correct IDs)
            const kiBar = generateKiBar(clampedPercentage, '1400943268170301561');

            // Create embed with cleaner layout (similar to health)
            const embed = new EmbedBuilder()
                .setColor(currentKi > 0 ? (kiPercentage >= 50 ? 0x3498db : 0xf39c12) : 0x95a5a6)
                .setTitle(`${userData.name}'s Ki`)
                .setDescription(`${kiBar}\n${currentKi}/${maxKi} (${Math.round(clampedPercentage)}%)`)
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
            if (currentKi > kiCap) {
                embed.addFields({ name: 'Status', value: '⚡ Above Health Cap', inline: false });
            } else if (currentKi <= 0) {
                embed.addFields({ name: 'Status', value: '😵 Exhausted', inline: false });
            } else if (kiPercentage < 20) {
                embed.addFields({ name: 'Status', value: '⚠️ Low Ki', inline: false });
            }

            // Add health cap info if relevant
            if (healthPercentage < 100) {
                const kiCapPercentage = Math.round((kiCap / maxKi) * 100);
                embed.addFields({ 
                    name: 'Health Cap', 
                    value: `${kiCap}/${maxKi} (${kiCapPercentage}%)`, 
                    inline: true 
                });
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error managing ki:', error);
            await message.reply('An error occurred while managing ki.');
        }
    }
};
