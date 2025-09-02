const { EmbedBuilder } = require('discord.js');
const { calculateKiCost, getCombatBonuses, calculateEffectivePL, decrementTechniqueEffects, calculateMaxHealthForCharacter } = require('./src/utils/calculations');

/**
 * Auto-manage turn order for combat - creates or adds participants as needed
 */
async function autoManageTurnOrder(channelId, attackerId, defenderId, client, database) {
    // Check if turn order exists
    const existingTurnOrder = await database.get(
        'SELECT * FROM turn_orders WHERE channel_id = ?',
        [channelId]
    );
    
    // Get character data for both participants
    const attackerData = await database.getUserWithActiveCharacter(attackerId);
    const defenderData = await database.getUserWithActiveCharacter(defenderId);
    
    if (!attackerData || !defenderData) {
        return { success: false, message: 'One or both participants don\'t have active characters.' };
    }

    // Get usernames
    const attackerUser = await client.users.fetch(attackerId).catch(() => null);
    const defenderUser = await client.users.fetch(defenderId).catch(() => null);
    
    const attackerUsername = attackerUser ? attackerUser.username : 'Unknown User';
    const defenderUsername = defenderUser ? defenderUser.username : 'Unknown User';

    if (!existingTurnOrder) {
        // Create new turn order with attacker first, defender second
        const participants = [
            {
                userId: attackerId,
                username: attackerUsername,
                characterName: attackerData.name,
                characterId: attackerData.active_character_id
            },
            {
                userId: defenderId,
                username: defenderUsername,
                characterName: defenderData.name,
                characterId: defenderData.active_character_id
            }
        ];
        
        await database.run(
            'INSERT INTO turn_orders (channel_id, participants, current_turn, current_round) VALUES (?, ?, ?, ?)',
            [channelId, JSON.stringify(participants), 0, 1]
        );
        
        return { 
            success: true, 
            message: `⚔️ **Combat initiated!** Turn order created with **${attackerData.name}** first, **${defenderData.name}** second.`,
            created: true
        };
    } else {
        // Turn order exists, check if participants need to be added
        const participants = JSON.parse(existingTurnOrder.participants);
        let updated = false;
        let messages = [];
        
        // Check if attacker is in turn order
        if (!participants.some(p => p.userId === attackerId)) {
            participants.push({
                userId: attackerId,
                username: attackerUsername,
                characterName: attackerData.name,
                characterId: attackerData.active_character_id
            });
            messages.push(`**${attackerData.name}** (${attackerUsername}) joined the combat!`);
            updated = true;
        }
        
        // Check if defender is in turn order
        if (!participants.some(p => p.userId === defenderId)) {
            participants.push({
                userId: defenderId,
                username: defenderUsername,
                characterName: defenderData.name,
                characterId: defenderData.active_character_id
            });
            messages.push(`**${defenderData.name}** (${defenderUsername}) joined the combat!`);
            updated = true;
        }
        
        if (updated) {
            await database.run(
                'UPDATE turn_orders SET participants = ? WHERE channel_id = ?',
                [JSON.stringify(participants), channelId]
            );
            
            return { 
                success: true, 
                message: messages.length > 0 ? `➕ ${messages.join(' ')}` : null,
                created: false,
                updated: true
            };
        }
        
        return { success: true, message: null, created: false, updated: false };
    }
}

/**
 * Advance turn from a button interaction
 */
async function advanceTurnFromInteraction(interaction, database) {
    console.log('=== ADVANCE TURN DEBUG: Function called');
    const channelId = interaction.channel.id;
    console.log('=== ADVANCE TURN DEBUG: Channel ID:', channelId);
    
    // Check if turn order exists
    const paramPlaceholder = database.usePostgres ? '$1' : '?';
    const paramPlaceholder2 = database.usePostgres ? '$2' : '?';
    const paramPlaceholder3 = database.usePostgres ? '$3' : '?';
    
    const turnOrder = await database.get(
        `SELECT * FROM turn_orders WHERE channel_id = ${paramPlaceholder}`,
        [channelId]
    );
    console.log('=== ADVANCE TURN DEBUG: Turn order found:', !!turnOrder);

    if (!turnOrder) {
        console.log('=== ADVANCE TURN DEBUG: No turn order, sending error message');
        await interaction.update({ 
            content: 'No turn order exists in this channel.',
            embeds: interaction.message.embeds,
            components: [] 
        });
        return;
    }

    console.log('=== ADVANCE TURN DEBUG: Parsing participants');
    const participants = JSON.parse(turnOrder.participants);
    let currentTurn = turnOrder.current_turn;
    let currentRound = turnOrder.current_round;
    console.log('=== ADVANCE TURN DEBUG: Current turn:', currentTurn, 'Current round:', currentRound);

    // Apply end-of-turn effects for current character
    const currentParticipant = participants[currentTurn];
    console.log('=== ADVANCE TURN DEBUG: Applying end-of-turn effects for:', currentParticipant?.characterName);
    await applyEndOfTurnEffects(currentParticipant.characterId, database);
    console.log('=== ADVANCE TURN DEBUG: End-of-turn effects applied');

    // Advance turn
    currentTurn++;
    if (currentTurn >= participants.length) {
        currentTurn = 0;
        currentRound++;
    }
    console.log('=== ADVANCE TURN DEBUG: New turn:', currentTurn, 'New round:', currentRound);

    // Update database
    console.log('=== ADVANCE TURN DEBUG: Updating database');
    await database.run(
        `UPDATE turn_orders SET current_turn = ${paramPlaceholder}, current_round = ${paramPlaceholder2} WHERE channel_id = ${paramPlaceholder3}`,
        [currentTurn, currentRound, channelId]
    );
    console.log('=== ADVANCE TURN DEBUG: Database updated');

    const nextParticipant = participants[currentTurn];
    console.log('=== ADVANCE TURN DEBUG: Next participant:', nextParticipant?.characterName);
    
    // Refresh username for display
    let displayUsername = nextParticipant.username || 'Unknown User';
    try {
        const user = await interaction.client.users.fetch(nextParticipant.userId).catch(() => null);
        if (user) {
            displayUsername = user.username;
        }
    } catch (error) {
        // Keep the fallback username
    }
    console.log('=== ADVANCE TURN DEBUG: Creating embed');
    
    const turnAdvanceEmbed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('🔄 Turn Advanced')
        .setDescription(`It's now **${nextParticipant.characterName}**'s turn!`)
        .addFields(
            { name: 'Current Player', value: `${nextParticipant.characterName} (${displayUsername})`, inline: true },
            { name: 'Round', value: currentRound.toString(), inline: true }
        );

    // Update the interaction with both the original combat embed and the turn advance embed
    console.log('=== ADVANCE TURN DEBUG: About to update interaction');
    await interaction.update({ 
        embeds: [interaction.message.embeds[0], turnAdvanceEmbed],
        components: [] 
    });
    console.log('=== ADVANCE TURN DEBUG: Interaction updated successfully');
}

/**
 * Apply end-of-turn effects for a character (copied from turn.js for standalone use)
 */
async function applyEndOfTurnEffects(characterId, database) {
    console.log('=== APPLY END TURN EFFECTS DEBUG: Starting for character ID:', characterId);
    
    // Get character with racials and forms
    console.log('=== APPLY END TURN EFFECTS DEBUG: Fetching character data');
    
    let character;
    try {
        const groupConcatFunction = database.usePostgres ? 'STRING_AGG' : 'GROUP_CONCAT';
        const paramPlaceholder = database.usePostgres ? '$1' : '?';
        const groupConcatSeparator = database.usePostgres ? "STRING_AGG(cr.racial_tag, ',')" : 'GROUP_CONCAT(cr.racial_tag)';
        
        const query = database.usePostgres ? `
            SELECT c.*, 
                   ${groupConcatSeparator} as racials,
                   f.name as form_name, 
                   f.ki_drain, f.health_drain, f.strength_modifier, f.defense_modifier, 
                   f.agility_modifier, f.endurance_modifier, f.control_modifier, f.pl_modifier
            FROM characters c
            LEFT JOIN character_racials cr ON c.id = cr.character_id
            LEFT JOIN character_forms cf ON c.id = cf.character_id AND cf.is_active = 1
            LEFT JOIN forms f ON cf.form_key = f.form_key
            WHERE c.id = ${paramPlaceholder}
            GROUP BY c.id, c.name, c.owner_id, c.race, c.base_pl, c.strength, c.defense, c.agility, c.endurance, c.control, c.current_health, c.current_ki, c.release_percentage, c.image_url, c.ki_control, c.magic_mastery, c.primary_affinity, c.secondary_affinities, c.created_at, f.name, f.ki_drain, f.health_drain, f.strength_modifier, f.defense_modifier, f.agility_modifier, f.endurance_modifier, f.control_modifier, f.pl_modifier
        ` : `
            SELECT c.*, 
                   ${groupConcatSeparator} as racials,
                   f.name as form_name, 
                   f.ki_drain, f.health_drain, f.strength_modifier, f.defense_modifier, 
                   f.agility_modifier, f.endurance_modifier, f.control_modifier, f.pl_modifier
            FROM characters c
            LEFT JOIN character_racials cr ON c.id = cr.character_id
            LEFT JOIN character_forms cf ON c.id = cf.character_id AND cf.is_active = 1
            LEFT JOIN forms f ON cf.form_key = f.form_key
            WHERE c.id = ${paramPlaceholder}
            GROUP BY c.id
        `;
        
        character = await database.get(query, [characterId]);
        
        console.log('=== APPLY END TURN EFFECTS DEBUG: Character query completed, result:', character ? 'found' : 'null');
        
    } catch (error) {
        console.error('=== APPLY END TURN EFFECTS DEBUG: Database error:', error);
        return;
    }
    
    if (!character) {
        console.log('=== APPLY END TURN EFFECTS DEBUG: No character found, returning early');
        return;
    }
    
    console.log('=== APPLY END TURN EFFECTS DEBUG: Character name:', character.name);

    let healthChange = 0;
    let kiChange = 0;
    const racials = character.racials ? character.racials.split(',') : [];

    // Check for Zenkai advancement if in combat
    const paramPlaceholder1 = database.usePostgres ? '$1' : '?';
    const paramPlaceholder2 = database.usePostgres ? '$2' : '?';
    
    const turnOrder = await database.get(
        `SELECT * FROM turn_orders WHERE participants LIKE ${paramPlaceholder1} AND channel_id IS NOT NULL`,
        [`%"characterId":${characterId}%`]
    );

    if (turnOrder) {
        // Check for Zenkai racial
        const zenkaiRacial = await database.get(
            `SELECT * FROM character_racials WHERE character_id = ${paramPlaceholder1} AND racial_tag = ${paramPlaceholder2}`,
            [characterId, 'zenkai']
        );

        if (zenkaiRacial) {
            // Get current bonuses and last attacked target PL
            const combatState = await database.get(
                `SELECT * FROM combat_state WHERE character_id = ${paramPlaceholder1} AND channel_id = ${paramPlaceholder2}`,
                [characterId, turnOrder.channel_id]
            );

            if (combatState && combatState.last_attacker_pl) {
                // Get current bonuses
                const bonuses = await getCombatBonuses(database, characterId);

                // Calculate character's current effective PL (without the potential new Zenkai bonus)
                const formMultiplier = character.pl_modifier || 1.0;
                const kiPercentage = (character.current_ki / character.endurance) * 100;
                
                // Check for Arcosian Resilience
                const hasArcosianResilience = await database.get(`
                    SELECT is_active FROM character_racials 
                    WHERE character_id = ${paramPlaceholder1} AND racial_tag = 'aresist' AND is_active = 1
                `, [characterId]);

                const charEffectivePL = calculateEffectivePL(
                    character.base_pl,
                    kiPercentage,
                    formMultiplier,
                    hasArcosianResilience !== null,
                    bonuses.zenkaiBonus,
                    bonuses.majinMagicBonus
                );

                // Check if the last enemy hit had higher effective PL than the character
                if (combatState.last_enemy_pl > charEffectivePL) {
                    // Apply 10% base PL bonus
                    const zenkaiGain = Math.floor(character.base_pl * 0.10);
                    const newZenkaiBonus = (bonuses.zenkaiBonus || 0) + zenkaiGain;
                    
                    // Update combat state
                    const paramPlaceholder3 = database.usePostgres ? '$3' : '?';
                    await database.run(
                        `UPDATE combat_state SET zenkai_bonus = ${paramPlaceholder1} WHERE character_id = ${paramPlaceholder2} AND channel_id = ${paramPlaceholder3}`,
                        [newZenkaiBonus, characterId, turnOrder.channel_id]
                    );

                    console.log(`Zenkai activated for ${character.char_name}: +${zenkaiGain} PL (Total Zenkai: ${newZenkaiBonus})`);
                }
            }
        }
    }

    // Apply racial effects
    if (racials.includes('mregen')) {
        // Majin Regeneration
        const hasEnhancedRegen = await database.get(`
            SELECT * FROM character_racials 
            WHERE character_id = ${paramPlaceholder1} AND racial_tag = 'mregen_enhanced' AND is_active = 1
        `, [characterId]);
        
        const maxHealth = await calculateMaxHealthForCharacter(database, characterId, character.base_pl, character.endurance);
        const currentHealth = character.current_health || maxHealth;
        
        if (currentHealth < maxHealth) {
            if (hasEnhancedRegen) {
                // Enhanced regeneration - 20% health
                healthChange += Math.floor(maxHealth * 0.20);
                
                // Apply ki cost for enhanced regeneration
                const kiCost = calculateKiCost(3, character.control);
                kiChange -= kiCost;
            } else {
                // Basic regeneration - 10% health
                healthChange += Math.floor(maxHealth * 0.10);
            }
        }
    }

    // Giant Form handling for Namekians
    if (racials.includes('ngiant')) {
        const giantForm = await database.get(`
            SELECT * FROM character_racials 
            WHERE character_id = ${paramPlaceholder1} AND racial_tag = 'ngiant' AND is_active = 1
        `, [characterId]);
        
        if (giantForm) {
            // Giant form ki drain: 3 * (100 / Control) per turn
            const kiCost = calculateKiCost(3, character.control);
            kiChange -= kiCost;
        }
    }

    // Apply form drains/gains
    if (character.form_name) {
        // Form is active, apply drains
        if (character.ki_drain) {
            const baseDrain = parseInt(character.ki_drain) || 0;
            if (baseDrain > 0) {
                const actualDrain = Math.max(1, baseDrain * (100 / character.control));
                kiChange -= actualDrain;
            }
        }
        
        if (character.health_drain) {
            const healthDrain = parseInt(character.health_drain) || 0;
            if (healthDrain > 0) {
                healthChange -= healthDrain;
            }
        }
    }

    // Apply changes
    if (healthChange !== 0) {
        const maxHealth = character.base_pl * character.endurance;
        const currentHealth = character.current_health || maxHealth;
        const newHealth = Math.min(maxHealth, currentHealth + healthChange); // Cap at max health
        
        await database.run(
            `UPDATE characters SET current_health = ${paramPlaceholder1} WHERE id = ${paramPlaceholder2}`,
            [newHealth, characterId]
        );
    }

    if (kiChange !== 0) {
        const currentKi = character.current_ki || character.endurance;
        const newKi = Math.max(0, Math.min(character.endurance, currentKi + kiChange));
        
        await database.run(
            `UPDATE characters SET current_ki = ${paramPlaceholder1} WHERE id = ${paramPlaceholder2}`,
            [newKi, characterId]
        );
    }
    
    // Decrement technique effect durations at end of turn
    await decrementTechniqueEffects(database, characterId, turnOrder ? turnOrder.channel_id : null);
}

module.exports = {
    autoManageTurnOrder,
    advanceTurnFromInteraction,
    applyEndOfTurnEffects
};
