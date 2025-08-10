const { EmbedBuilder } = require('discord.js');
const { calculateMaxHealth, generateHealthBar, handleZenkaiBonus } = require('./calculations');

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
            const maxHealth = targetData.base_pl * targetData.endurance;
            const currentHealth = targetData.current_health || maxHealth;
           const newHealth = currentHealth - finalDamage; // Allow negative health
            
            await database.run(
                'UPDATE characters SET current_health = ? WHERE id = ?',
                [newHealth, pendingAttack.target_character_id]
            );
            
            // Update ki cap based on new health percentage with Human Spirit consideration
            const { calculateKiCap } = require('./calculations');
            const newKiCap = await calculateKiCap(database, {
                id: pendingAttack.target_character_id,
                base_pl: targetData.base_pl,
                endurance: targetData.endurance,
                current_health: newHealth
            });
            
            // Don't increase current ki, only limit maximum
            const currentKi = targetData.current_ki || targetData.endurance;
            const adjustedKi = Math.min(currentKi, newKiCap);
            
            await database.run(
                'UPDATE characters SET current_ki = ? WHERE id = ?',
                [adjustedKi, pendingAttack.target_character_id]
            );
            
            combatResult.healthUpdate = {
                oldHealth: currentHealth,
                newHealth: newHealth,
                maxHealth: maxHealth
            };
        }
        
        // Handle Zenkai bonus for successful attacks
        try {
            // Get target's effective PL before the attack
            const targetData = await database.getUserWithActiveCharacter(pendingAttack.target_user_id);
            if (targetData) {
                const targetKiPercentage = targetData.current_ki ? (targetData.current_ki / targetData.endurance) * 100 : 100;
                
                // Check for target's Arcosian Resilience
                const targetHasArcosianResilience = await database.get(`
                    SELECT is_active FROM character_racials 
                    WHERE character_id = ? AND racial_tag = 'aresist' AND is_active = 1
                `, [pendingAttack.target_character_id]);
                
                // Get target's Zenkai bonus
                let targetZenkaiBonus = 0;
                const targetRacials = await database.getCharacterWithRacials(pendingAttack.target_character_id);
                if (targetRacials.racials && targetRacials.racials.includes('zenkai')) {
                    const targetZenkaiState = await database.get(`
                        SELECT zenkai_bonus FROM combat_state 
                        WHERE character_id = ? AND channel_id = ?
                    `, [pendingAttack.target_character_id, pendingAttack.channel_id]);
                    
                    if (targetZenkaiState) {
                        targetZenkaiBonus = targetZenkaiState.zenkai_bonus || 0;
                    }
                }
                
                const { calculateEffectivePL } = require('./calculations');
                const targetEffectivePL = calculateEffectivePL(
                    targetData.base_pl, 
                    targetKiPercentage, 
                    1, 
                    targetHasArcosianResilience !== null,
                    targetZenkaiBonus
                );
                
                // Check for Zenkai bonus for the attacker
                const zenkaiResult = await handleZenkaiBonus(
                    database, 
                    pendingAttack.attacker_character_id, 
                    targetEffectivePL, 
                    pendingAttack.channel_id
                );
                
                if (zenkaiResult && zenkaiResult > 0) {
                    console.log(`Zenkai bonus applied: ${zenkaiResult}%`);
                }
            }
        } catch (error) {
            console.error('Error handling Zenkai in combat resolution:', error);
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

module.exports = {
    storePendingAttack,
    getPendingAttack,
    cleanupExpiredAttacks,
    resolveCombat,
    createCombatResultEmbed
};
