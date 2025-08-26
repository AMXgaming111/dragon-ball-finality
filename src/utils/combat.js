const { EmbedBuilder } = require('discord.js');
const { calculateMaxHealth, calculateMaxHealthForCharacter, generateHealthBar, generateKiBar, handleMajinMagic, getCombatBonuses } = require('./calculations');

/**
 * Resolve Double Strike technique with separate strike handling
 */
async function resolveDoubleStrike(database, pendingAttack, defenseType, defenseValue, dodgeValue = null) {
    const attackData = pendingAttack.attack_data;
    const { damage1, damage2, accuracy1, accuracy2 } = attackData;
    
    let strike1Result = {};
    let strike2Result = {};
    let totalFinalDamage = 0;
    
    // Resolve Strike 1
    if (defenseType === 'dodge') {
        if (dodgeValue > accuracy1) {
            // Strike 1 dodged
            strike1Result = {
                accuracy: accuracy1,
                dodge: dodgeValue,
                hit: false,
                damage: 0,
                finalDamage: 0
            };
        } else {
            // Strike 1 hits - apply pity block
            const pityBlockMultiplier = 0.5 + (Math.random() * 0.1);
            const pityBlockValue = Math.floor(defenseValue * pityBlockMultiplier);
            const finalDamage1 = Math.max(0, damage1 - pityBlockValue);
            totalFinalDamage += finalDamage1;
            
            strike1Result = {
                accuracy: accuracy1,
                dodge: dodgeValue,
                hit: true,
                damage: damage1,
                pityBlock: pityBlockValue,
                finalDamage: finalDamage1
            };
        }
    } else { // block
        const finalDamage1 = Math.max(0, damage1 - Math.floor(defenseValue / 2)); // Split block between strikes
        totalFinalDamage += finalDamage1;
        
        strike1Result = {
            accuracy: accuracy1,
            hit: true,
            damage: damage1,
            block: Math.floor(defenseValue / 2),
            finalDamage: finalDamage1
        };
    }
    
    // Resolve Strike 2
    if (defenseType === 'dodge') {
        if (dodgeValue > accuracy2) {
            // Strike 2 dodged
            strike2Result = {
                accuracy: accuracy2,
                dodge: dodgeValue,
                hit: false,
                damage: 0,
                finalDamage: 0
            };
        } else {
            // Strike 2 hits - apply pity block
            const pityBlockMultiplier = 0.5 + (Math.random() * 0.1);
            const pityBlockValue = Math.floor(defenseValue * pityBlockMultiplier);
            const finalDamage2 = Math.max(0, damage2 - pityBlockValue);
            totalFinalDamage += finalDamage2;
            
            strike2Result = {
                accuracy: accuracy2,
                dodge: dodgeValue,
                hit: true,
                damage: damage2,
                pityBlock: pityBlockValue,
                finalDamage: finalDamage2
            };
        }
    } else { // block
        const finalDamage2 = Math.max(0, damage2 - Math.floor(defenseValue / 2)); // Split block between strikes
        totalFinalDamage += finalDamage2;
        
        strike2Result = {
            accuracy: accuracy2,
            hit: true,
            damage: damage2,
            block: Math.floor(defenseValue / 2),
            finalDamage: finalDamage2
        };
    }
    
    // Apply total damage
    if (totalFinalDamage > 0) {
        const targetData = await database.getUserWithActiveCharacter(pendingAttack.target_user_id);
        if (targetData) {
            const maxHealth = await calculateMaxHealthForCharacter(
                database, 
                targetData.active_character_id, 
                targetData.base_pl, 
                targetData.endurance
            );
            const currentHealth = targetData.current_health || maxHealth;
            const newHealth = Math.max(0, currentHealth - totalFinalDamage);
            
            // Safety check to prevent NaN values in database
            if (isNaN(newHealth) || isNaN(targetData.active_character_id)) {
                console.error('Error managing health in double strike: NaN detected', {
                    newHealth,
                    currentHealth,
                    totalFinalDamage,
                    targetCharacterId: targetData.active_character_id,
                    maxHealth
                });
                return {
                    type: 'double_strike',
                    defenseType: defenseType,
                    strike1: strike1Result,
                    strike2: strike2Result,
                    totalDamage: damage1 + damage2,
                    finalDamage: totalFinalDamage,
                    success: totalFinalDamage < (damage1 + damage2)
                };
            }
            
            const paramPlaceholder1 = database.usePostgres ? '$1' : '?';
            const paramPlaceholder2 = database.usePostgres ? '$2' : '?';
            await database.run(
                `UPDATE characters SET current_health = ${paramPlaceholder1} WHERE id = ${paramPlaceholder2}`,
                [newHealth, targetData.active_character_id]
            );

            // Update ki cap based on new health percentage - automatically enforce cap
            const { enforceKiCap } = require('./calculations');
            await enforceKiCap(database, pendingAttack.target_character_id);
        }
    }
    
    return {
        type: 'double_strike',
        defenseType: defenseType,
        strike1: strike1Result,
        strike2: strike2Result,
        totalDamage: damage1 + damage2,
        finalDamage: totalFinalDamage,
        success: totalFinalDamage < (damage1 + damage2) // Partial success if any damage reduced
    };
}

/**
 * Store a pending attack in the database
 */
async function storePendingAttack(database, channelId, attackerUserId, targetUserId, attackerCharacterId, targetCharacterId, attackType, damage, accuracy, attackData) {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    
    // Clean up any existing pending attacks from this attacker to this target in this channel
    await database.run(
        'DELETE FROM pending_attacks WHERE channel_id = ? AND attacker_user_id = ? AND target_user_id = ?',
        [channelId, attackerUserId, targetUserId]
    );
    
    // Store the new attack
    const result = await database.run(`
        INSERT INTO pending_attacks 
        (channel_id, attacker_user_id, target_user_id, attacker_character_id, target_character_id, attack_type, damage, accuracy, attack_data, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [channelId, attackerUserId, targetUserId, attackerCharacterId, targetCharacterId, attackType, damage, accuracy, JSON.stringify(attackData), expiresAt.toISOString()]);
    
    return result.id;
}

/**
 * Resolve Weakpoint technique combat
 */
async function resolveWeakpoint(database, pendingAttack, defenseType, defenseValue, dodgeValue = null) {
    const attackData = pendingAttack.attack_data;
    const { displayDamage, actualDamage, targetMaxHealth } = attackData;
    
    let finalDamage = 0;
    let combatResult = {};
    let fullyDefended = false;
    
    if (defenseType === 'block') {
        // Check if the display damage is fully blocked
        if (defenseValue >= displayDamage) {
            fullyDefended = true;
            finalDamage = 0; // Fully blocked, no damage
        } else {
            finalDamage = actualDamage; // Not fully blocked, apply 7% damage
        }
        
        combatResult = {
            type: 'weakpoint_block',
            displayDamage: displayDamage,
            actualDamage: actualDamage,
            defenseValue: defenseValue,
            finalDamage: finalDamage,
            fullyDefended: fullyDefended,
            success: fullyDefended
        };
    } else if (defenseType === 'dodge') {
        if (dodgeValue > pendingAttack.accuracy) {
            // Successful dodge - fully defended
            fullyDefended = true;
            finalDamage = 0;
            combatResult = {
                type: 'weakpoint_dodge',
                attackAccuracy: pendingAttack.accuracy,
                dodgeValue: dodgeValue,
                displayDamage: displayDamage,
                actualDamage: actualDamage,
                finalDamage: 0,
                fullyDefended: true,
                success: true
            };
        } else {
            // Failed dodge - not fully defended, apply 7% damage
            finalDamage = actualDamage;
            combatResult = {
                type: 'weakpoint_failed_dodge',
                attackAccuracy: pendingAttack.accuracy,
                dodgeValue: dodgeValue,
                displayDamage: displayDamage,
                actualDamage: actualDamage,
                finalDamage: finalDamage,
                fullyDefended: false,
                success: false
            };
        }
    }
    
    // Apply damage to target if any
    if (finalDamage > 0) {
        const targetData = await database.getUserWithActiveCharacter(pendingAttack.target_user_id);
        if (targetData) {
            const currentHealth = targetData.current_health || targetMaxHealth;
            const newHealth = currentHealth - finalDamage; // Allow negative health
            
            const paramPlaceholder1 = database.usePostgres ? '$1' : '?';
            const paramPlaceholder2 = database.usePostgres ? '$2' : '?';
            await database.run(
                `UPDATE characters SET current_health = ${paramPlaceholder1} WHERE id = ${paramPlaceholder2}`,
                [newHealth, pendingAttack.target_character_id]
            );
            
            // Handle Majin Magic for attacker if damage was dealt
            if (finalDamage > 0) {
                try {
                    const healthPercentageLost = (finalDamage / targetMaxHealth) * 100;
                    await handleMajinMagic(database, pendingAttack.attacker_character_id, healthPercentageLost, pendingAttack.channel_id);
                } catch (error) {
                    console.error('Error handling Majin Magic in weakpoint resolution:', error);
                }
            }
        }
    }
    
    return combatResult;
}

/**
 * Get pending attack for a specific defender
 */
async function getPendingAttack(database, channelId, attackerUserId, targetUserId) {
    const attack = await database.get(`
        SELECT * FROM pending_attacks 
        WHERE channel_id = ? AND attacker_user_id = ? AND target_user_id = ? 
        AND datetime(expires_at) > datetime('now')
        ORDER BY created_at DESC
        LIMIT 1
    `, [channelId, attackerUserId, targetUserId]);
    
    if (attack && attack.attack_data) {
        attack.attack_data = JSON.parse(attack.attack_data);
    }
    
    return attack;
}

/**
 * Clean up expired pending attacks
 */
async function cleanupExpiredAttacks(database) {
    await database.run("DELETE FROM pending_attacks WHERE datetime(expires_at) <= datetime('now')");
}

/**
 * Resolve combat between attack and defense
 */
async function resolveCombat(database, pendingAttack, defenseType, defenseValue, dodgeValue = null) {
    const attackData = pendingAttack.attack_data;
    let finalDamage = 0;
    let combatResult = {};
    
    // Safety check for NaN values
    if (isNaN(pendingAttack.damage) || isNaN(defenseValue) || (dodgeValue !== null && isNaN(dodgeValue))) {
        console.error('Error in resolveCombat: NaN values detected', {
            damage: pendingAttack.damage,
            defenseValue,
            dodgeValue,
            attackData
        });
        // Return safe default values
        return {
            type: 'error',
            finalDamage: 0,
            success: false
        };
    }
    
    // Special handling for Double Strike technique
    if (attackData && attackData.technique === 'double_strike') {
        return resolveDoubleStrike(database, pendingAttack, defenseType, defenseValue, dodgeValue);
    }
    
    // Special handling for Weakpoint technique
    if (attackData && attackData.technique === 'weakpoint') {
        return resolveWeakpoint(database, pendingAttack, defenseType, defenseValue, dodgeValue);
    }
    
    if (defenseType === 'block') {
        // Block reduces damage
        finalDamage = Math.max(0, pendingAttack.damage - defenseValue);
        combatResult = {
            type: 'block',
            attackDamage: pendingAttack.damage,
            defenseValue: defenseValue,
            finalDamage: finalDamage,
            success: defenseValue > 0
        };
    } else if (defenseType === 'dodge') {
        if (dodgeValue > pendingAttack.accuracy) {
            // Successful dodge - no damage
            finalDamage = 0;
            combatResult = {
                type: 'dodge',
                attackAccuracy: pendingAttack.accuracy,
                dodgeValue: dodgeValue,
                finalDamage: 0,
                success: true
            };
        } else {
            // Failed dodge - pity block with 50-60% defense roll
            const pityBlockMultiplier = 0.5 + (Math.random() * 0.1); // 50-60%
            const pityBlockValue = Math.floor(defenseValue * pityBlockMultiplier);
            finalDamage = Math.max(0, pendingAttack.damage - pityBlockValue);
            combatResult = {
                type: 'failed_dodge',
                attackAccuracy: pendingAttack.accuracy,
                dodgeValue: dodgeValue,
                pityBlockValue: pityBlockValue,
                finalDamage: finalDamage,
                success: false
            };
        }
    }
    
    // Apply damage to target if any
    if (finalDamage > 0) {
        const targetData = await database.getUserWithActiveCharacter(pendingAttack.target_user_id);
        if (targetData) {
            const maxHealth = await calculateMaxHealthForCharacter(
                database,
                pendingAttack.target_character_id,
                targetData.base_pl,
                targetData.endurance
            );
            const currentHealth = targetData.current_health || maxHealth;
            const newHealth = currentHealth - finalDamage; // Allow negative health
            
            // Safety check to prevent NaN values in database
            if (isNaN(newHealth) || isNaN(pendingAttack.target_character_id)) {
                console.error('Error managing health: NaN detected', {
                    newHealth,
                    currentHealth,
                    finalDamage,
                    targetCharacterId: pendingAttack.target_character_id,
                    maxHealth
                });
                return combatResult; // Exit early to prevent database error
            }
            
            const paramPlaceholder1 = database.usePostgres ? '$1' : '?';
            const paramPlaceholder2 = database.usePostgres ? '$2' : '?';
            await database.run(
                `UPDATE characters SET current_health = ${paramPlaceholder1} WHERE id = ${paramPlaceholder2}`,
                [newHealth, pendingAttack.target_character_id]
            );
            
            // Handle Majin Magic for attacker if damage was dealt
            if (finalDamage > 0) {
                try {
                    const healthPercentageLost = (finalDamage / maxHealth) * 100;
                    await handleMajinMagic(database, pendingAttack.attacker_character_id, healthPercentageLost, pendingAttack.channel_id);
                } catch (error) {
                    console.error('Error handling Majin Magic in combat resolution:', error);
                }
            }
            
            // Update ki cap based on new health percentage - automatically enforce cap
            const { enforceKiCap } = require('./calculations');
            await enforceKiCap(database, pendingAttack.target_character_id);
            
            combatResult.healthUpdate = {
                oldHealth: currentHealth,
                newHealth: newHealth,
                maxHealth: maxHealth
            };
        }
        
        // Handle Zenkai bonus for successful attacks
        try {
            // Store the last attacked target's effective PL for Zenkai checking
            const targetData = await database.getUserWithActiveCharacter(pendingAttack.target_user_id);
            if (targetData) {
                const targetKiPercentage = targetData.current_ki ? (targetData.current_ki / targetData.endurance) * 100 : 100;
                
                // Check for target's Arcosian Resilience
                const targetHasArcosianResilience = await database.get(`
                    SELECT is_active FROM character_racials 
                    WHERE character_id = ? AND racial_tag = 'aresist' AND is_active = 1
                `, [pendingAttack.target_character_id]);
                
                // Get target's combat bonuses
                const targetCombatBonuses = await getCombatBonuses(database, pendingAttack.target_character_id, pendingAttack.channel_id);
                
                const { calculateEffectivePL } = require('./calculations');
                const targetEffectivePL = calculateEffectivePL(
                    targetData.base_pl, 
                    targetKiPercentage, 
                    1, 
                    targetHasArcosianResilience !== null,
                    targetCombatBonuses.zenkaiBonus,
                    targetCombatBonuses.majinMagicBonus
                );
                
                // Get attacker's current bonuses
                const attackerCombatBonuses = await getCombatBonuses(database, pendingAttack.attacker_character_id, pendingAttack.channel_id);
                
                // Store the last attacked target's effective PL for Zenkai checking (happens during end-of-turn)
                const combatQuery = database.usePostgres
                    ? `INSERT INTO combat_state (character_id, channel_id, zenkai_bonus, majin_magic_bonus, last_enemy_pl) 
                       VALUES ($1, $2, $3, $4, $5) 
                       ON CONFLICT (character_id, channel_id) 
                       DO UPDATE SET zenkai_bonus = $3, majin_magic_bonus = $4, last_enemy_pl = $5`
                    : `INSERT OR REPLACE INTO combat_state (character_id, channel_id, zenkai_bonus, majin_magic_bonus, last_enemy_pl) VALUES (?, ?, ?, ?, ?)`;
                
                await database.run(combatQuery, [
                    pendingAttack.attacker_character_id, 
                    pendingAttack.channel_id, 
                    attackerCombatBonuses.zenkaiBonus || 0,
                    attackerCombatBonuses.majinMagicBonus || 0,
                    targetEffectivePL
                ]);
            }
        } catch (error) {
            console.error('Error storing last attack data for Zenkai:', error);
        }
    }
    
    // Remove the pending attack
    await database.run('DELETE FROM pending_attacks WHERE id = ?', [pendingAttack.id]);
    
    return combatResult;
}

/**
 * Create combat result embed
 */
function createCombatResultEmbed(attackerName, targetName, combatResult, attackType) {
    const embed = new EmbedBuilder()
        .setTimestamp();
    
    if (combatResult.type === 'block') {
        embed.setColor(0x95a5a6)
            .setTitle('⚔️ Combat Result - Block')
            .setDescription(`**${targetName}** blocked **${attackerName}**'s ${attackType} attack!`)
            .addFields(
                { name: 'Attack Damage', value: combatResult.attackDamage.toString(), inline: true },
                { name: 'Block Value', value: combatResult.defenseValue.toString(), inline: true },
                { name: 'Final Damage', value: combatResult.finalDamage.toString(), inline: true }
            );
    } else if (combatResult.type === 'dodge') {
        embed.setColor(0x3498db)
            .setTitle('⚔️ Combat Result - Successful Dodge')
            .setDescription(`**${targetName}** successfully dodged **${attackerName}**'s ${attackType} attack!`)
            .addFields(
                { name: 'Attack Accuracy', value: combatResult.attackAccuracy.toString(), inline: true },
                { name: 'Dodge Value', value: combatResult.dodgeValue.toString(), inline: true },
                { name: 'Final Damage', value: '0', inline: true }
            );
    } else if (combatResult.type === 'failed_dodge') {
        embed.setColor(0xe67e22)
            .setTitle('⚔️ Combat Result - Failed Dodge')
            .setDescription(`**${targetName}** failed to dodge **${attackerName}**'s ${attackType} attack but managed a last-second block!`)
            .addFields(
                { name: 'Attack Accuracy', value: combatResult.attackAccuracy.toString(), inline: true },
                { name: 'Dodge Value', value: combatResult.dodgeValue.toString(), inline: true },
                { name: 'Pity Block', value: combatResult.pityBlockValue.toString(), inline: true },
                { name: 'Final Damage', value: combatResult.finalDamage.toString(), inline: true }
            );
    } else if (combatResult.type === 'weakpoint_block') {
        if (combatResult.fullyDefended) {
            embed.setColor(0x2ecc71)
                .setTitle('🎯 Weakpoint Strike - Fully Blocked!')
                .setDescription(`**${targetName}** completely blocked **${attackerName}**'s weakpoint strike!`)
                .addFields(
                    { name: 'Display Damage', value: combatResult.displayDamage.toString(), inline: true },
                    { name: 'Block Value', value: combatResult.defenseValue.toString(), inline: true },
                    { name: 'Final Damage', value: '0 (Fully Defended)', inline: true }
                );
        } else {
            embed.setColor(0x8e44ad)
                .setTitle('🎯 Weakpoint Strike - Critical Hit!')
                .setDescription(`**${targetName}** couldn't fully block **${attackerName}**'s weakpoint strike! The attack found its mark!`)
                .addFields(
                    { name: 'Display Damage', value: combatResult.displayDamage.toString(), inline: true },
                    { name: 'Block Value', value: combatResult.defenseValue.toString(), inline: true },
                    { name: 'Weakpoint Damage', value: `${combatResult.actualDamage} (7% max health)`, inline: true },
                    { name: 'Final Damage', value: combatResult.finalDamage.toString(), inline: true }
                );
        }
    } else if (combatResult.type === 'weakpoint_dodge') {
        embed.setColor(0x3498db)
            .setTitle('🎯 Weakpoint Strike - Dodged!')
            .setDescription(`**${targetName}** successfully dodged **${attackerName}**'s weakpoint strike!`)
            .addFields(
                { name: 'Attack Accuracy', value: combatResult.attackAccuracy.toString(), inline: true },
                { name: 'Dodge Value', value: combatResult.dodgeValue.toString(), inline: true },
                { name: 'Final Damage', value: '0 (Fully Avoided)', inline: true }
            );
    } else if (combatResult.type === 'weakpoint_failed_dodge') {
        embed.setColor(0x8e44ad)
            .setTitle('🎯 Weakpoint Strike - Critical Hit!')
            .setDescription(`**${targetName}** failed to dodge **${attackerName}**'s weakpoint strike! The attack struck a vital point!`)
            .addFields(
                { name: 'Attack Accuracy', value: combatResult.attackAccuracy.toString(), inline: true },
                { name: 'Dodge Value', value: combatResult.dodgeValue.toString(), inline: true },
                { name: 'Weakpoint Damage', value: `${combatResult.actualDamage} (7% max health)`, inline: true },
                { name: 'Final Damage', value: combatResult.finalDamage.toString(), inline: true }
            );
    }
    
    // Add health information if damage was taken
    if (combatResult.healthUpdate && combatResult.finalDamage > 0) {
        const { newHealth, maxHealth } = combatResult.healthUpdate;
        const healthPercentage = (newHealth / maxHealth) * 100;
        const healthBar = generateHealthBar(healthPercentage);
        
        embed.addFields({
            name: `${targetName}'s Health`,
            value: `${healthBar}\n${newHealth}/${maxHealth} (${Math.round(healthPercentage)}%)`,
            inline: false
        });
        
        // Only show critical status if health is positive but below 20%
        if (newHealth > 0 && healthPercentage < 20) {
            embed.addFields({ name: 'Status', value: '⚠️ **CRITICAL**', inline: false });
        }
    }
    
    return embed;
}

/**
 * Add ki bar display to combat embed
 */
function addKiDisplay(embed, characterName, currentKi, maxKi) {
    const kiPercentage = Math.max(0, (currentKi / maxKi) * 100);
    const clampedPercentage = Math.max(0, Math.min(120, kiPercentage));
    const kiBar = generateKiBar(clampedPercentage, '1400943268170301561');
    
    embed.addFields({
        name: `${characterName}'s Ki`,
        value: `${kiBar}\n${currentKi}/${maxKi} (${Math.round(clampedPercentage)}%)`,
        inline: false
    });
    
    return embed;
}

module.exports = {
    storePendingAttack,
    getPendingAttack,
    cleanupExpiredAttacks,
    resolveCombat,
    createCombatResultEmbed,
    addKiDisplay
};
