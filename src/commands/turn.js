const { EmbedBuilder } = require('discord.js');
const { hasStaffRole, calculateMaxHealthForCharacter, decrementTechniqueEffects } = require('../utils/calculations');

module.exports = {
    name: 'turn',
    description: 'Manage turn-based combat',
    async execute(message, args, database) {
        try {
            // Handle different subcommands
            if (args.length === 0) {
                // Advance turn
                return await advanceTurn(message, database);
            }

            const subcommand = args[0].toLowerCase();

            if (subcommand === 'order') {
                // Show turn order
                return await showTurnOrder(message, database);
            } else if (subcommand === 'end') {
                // End turn order
                return await endTurnOrder(message, database);
            } else if (subcommand === 'remove' && args[1]) {
                // Remove user from turn order
                return await removeFromTurnOrder(message, args[1], database);
            } else if (subcommand === 'transfer' && args[1]) {
                // Transfer turn order to another channel
                return await transferTurnOrder(message, args[1], database);
            } else if (args.every(arg => arg.startsWith('<@'))) {
                // Create new turn order with mentioned users
                return await createTurnOrder(message, args, database);
            } else if (args[0].startsWith('<@')) {
                // Add user to existing turn order
                return await addToTurnOrder(message, args[0], database);
            }

            return message.reply('Usage: `!turn <@user1> <@user2> ...` to create turn order\n' +
                               '`!turn` to advance turn\n' +
                               '`!turn order` to show current order\n' +
                               '`!turn remove <@user>` to remove user\n' +
                               '`!turn end` to end combat\n' +
                               '`!turn transfer <#channel>` to transfer combat');

        } catch (error) {
            console.error('Error in turn command:', error);
            await message.reply('An error occurred while managing turns.');
        }
    }
};

async function createTurnOrder(message, userMentions, database) {
    const channelId = message.channel.id;
    
    // Check if turn order already exists in this channel
    const existingOrder = await database.get(
        'SELECT * FROM turn_orders WHERE channel_id = ?',
        [channelId]
    );

    if (existingOrder) {
        return message.reply('A turn order already exists in this channel. Use `!turn end` to end it first.');
    }

    // Parse user mentions and get their characters
    const participants = [];
    for (const mention of userMentions) {
        const userId = mention.replace(/[<@!>]/g, '');
        const user = await message.client.users.fetch(userId).catch(() => null);
        if (!user) {
            return message.reply(`Could not find user ${mention}. Make sure they are in the server.`);
        }

        const userData = await database.getUserWithActiveCharacter(userId);
        if (!userData || !userData.active_character_id) {
            return message.reply(`${user.username} doesn't have an active character.`);
        }

        participants.push({
            userId: userId,
            username: user.username || 'Unknown User',
            characterName: userData.name,
            characterId: userData.active_character_id
        });
    }

    if (participants.length < 2) {
        return message.reply('You need at least 2 participants for a turn order.');
    }

    // Create turn order in database
    await database.run(
        'INSERT INTO turn_orders (channel_id, current_turn, current_round, participants) VALUES (?, ?, ?, ?)',
        [channelId, 0, 1, JSON.stringify(participants)]
    );

    // Create embed showing the new turn order
    const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('⚔️ Turn Order Created')
        .setDescription('Combat has begun!')
        .addFields(
            { name: 'Current Turn', value: `**${participants[0].characterName}** (${participants[0].username})`, inline: false },
            { name: 'Round', value: '1', inline: true },
            { name: 'Participants', value: participants.map((p, i) => `${i + 1}. ${p.characterName}`).join('\n'), inline: false }
        );

    await message.reply({ embeds: [embed] });
}

async function addToTurnOrder(message, userMention, database) {
    const channelId = message.channel.id;
    const userId = userMention.replace(/[<@!>]/g, '');
    
    // Check if turn order exists
    const turnOrder = await database.get(
        'SELECT * FROM turn_orders WHERE channel_id = ?',
        [channelId]
    );

    if (!turnOrder) {
        return message.reply('No turn order exists in this channel. Create one with `!turn <@user1> <@user2> ...`');
    }

    const user = await message.client.users.fetch(userId).catch(() => null);
    if (!user) {
        return message.reply('User not found!');
    }

    const userData = await database.getUserWithActiveCharacter(userId);
    if (!userData || !userData.active_character_id) {
        return message.reply(`${user.username} doesn't have an active character.`);
    }

    // Parse existing participants
    const participants = JSON.parse(turnOrder.participants);
    
    // Check if user is already in turn order
    if (participants.some(p => p.userId === userId)) {
        return message.reply(`${user.username} is already in the turn order.`);
    }

    // Add new participant
    participants.push({
        userId: userId,
        username: user.username,
        characterName: userData.name,
        characterId: userData.active_character_id
    });

    // Update database
    await database.run(
        'UPDATE turn_orders SET participants = ? WHERE channel_id = ?',
        [JSON.stringify(participants), channelId]
    );

    const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('➕ Added to Turn Order')
        .setDescription(`**${userData.name}** (${user.username}) has joined the combat!`)
        .addFields(
            { name: 'Position', value: participants.length.toString(), inline: true }
        );

    await message.reply({ embeds: [embed] });
}

async function removeFromTurnOrder(message, userMention, database) {
    const channelId = message.channel.id;
    const userId = userMention.replace(/[<@!>]/g, '');
    
    // Check if turn order exists
    const turnOrder = await database.get(
        'SELECT * FROM turn_orders WHERE channel_id = ?',
        [channelId]
    );

    if (!turnOrder) {
        return message.reply('No turn order exists in this channel.');
    }

    const user = await message.client.users.fetch(userId).catch(() => null);
    if (!user) {
        return message.reply('User not found!');
    }

    // Parse existing participants
    let participants = JSON.parse(turnOrder.participants);
    const initialCount = participants.length;
    
    // Remove participant
    participants = participants.filter(p => p.userId !== userId);

    if (participants.length === initialCount) {
        return message.reply(`${user.username} is not in the turn order.`);
    }

    if (participants.length < 2) {
        // End combat if less than 2 participants - clear technique effects for remaining participants
        try {
            for (const participant of participants) {
                await database.run(
                    'DELETE FROM technique_effects WHERE character_id = ? AND channel_id = ?',
                    [participant.characterId, channelId]
                );
            }
        } catch (error) {
            console.error('Error clearing technique effects:', error);
        }
        
        await database.run('DELETE FROM turn_orders WHERE channel_id = ?', [channelId]);
        return message.reply('Turn order ended - not enough participants remaining. Technique effects cleared.');
    }

    // Adjust current turn if necessary
    let currentTurn = turnOrder.current_turn;
    if (currentTurn >= participants.length) {
        currentTurn = 0;
    }

    // Update database
    await database.run(
        'UPDATE turn_orders SET participants = ?, current_turn = ? WHERE channel_id = ?',
        [JSON.stringify(participants), currentTurn, channelId]
    );

    const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('➖ Removed from Turn Order')
        .setDescription(`**${user.username}** has left the combat!`);

    await message.reply({ embeds: [embed] });
}

async function advanceTurn(message, database) {
    const channelId = message.channel.id;
    
    // Check if turn order exists
    const turnOrder = await database.get(
        'SELECT * FROM turn_orders WHERE channel_id = ?',
        [channelId]
    );

    if (!turnOrder) {
        return message.reply('No turn order exists in this channel.');
    }

    const participants = JSON.parse(turnOrder.participants);
    let currentTurn = turnOrder.current_turn;
    let currentRound = turnOrder.current_round;

    // Apply end-of-turn effects for current character
    const currentParticipant = participants[currentTurn];
    await applyEndOfTurnEffects(currentParticipant.characterId, database, message.channel.id);

    // Advance turn
    currentTurn++;
    if (currentTurn >= participants.length) {
        currentTurn = 0;
        currentRound++;
    }

    // Update database
    await database.run(
        'UPDATE turn_orders SET current_turn = ?, current_round = ? WHERE channel_id = ?',
        [currentTurn, currentRound, channelId]
    );

    const nextParticipant = participants[currentTurn];
    
    // Refresh username for display
    let displayUsername = nextParticipant.username || 'Unknown User';
    try {
        const user = await message.client.users.fetch(nextParticipant.userId).catch(() => null);
        if (user) {
            displayUsername = user.username;
        }
    } catch (error) {
        // Keep the fallback username
    }
    
    const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('🔄 Turn Advanced')
        .setDescription(`It's now **${nextParticipant.characterName}**'s turn!`)
        .addFields(
            { name: 'Current Player', value: `${nextParticipant.characterName} (${displayUsername})`, inline: true },
            { name: 'Round', value: currentRound.toString(), inline: true }
        );

    await message.reply({ embeds: [embed] });
}

async function showTurnOrder(message, database) {
    const channelId = message.channel.id;
    
    // Check if turn order exists
    const turnOrder = await database.get(
        'SELECT * FROM turn_orders WHERE channel_id = ?',
        [channelId]
    );

    if (!turnOrder) {
        return message.reply('No turn order exists in this channel.');
    }

    const participants = JSON.parse(turnOrder.participants);
    const currentTurn = turnOrder.current_turn;
    const currentRound = turnOrder.current_round;

    // Refresh usernames in case they've changed or become unavailable
    for (let i = 0; i < participants.length; i++) {
        const participant = participants[i];
        try {
            const user = await message.client.users.fetch(participant.userId).catch(() => null);
            if (user) {
                participant.username = user.username;
            } else {
                participant.username = 'Unknown User';
            }
        } catch (error) {
            participant.username = 'Unknown User';
        }
    }

    const orderText = participants.map((p, i) => {
        const indicator = i === currentTurn ? '👉' : '   ';
        const username = p.username || 'Unknown User';
        return `${indicator} ${i + 1}. ${p.characterName} (${username})`;
    }).join('\n');

    const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('📋 Turn Order')
        .setDescription('```' + orderText + '```')
        .addFields(
            { name: 'Current Turn', value: `**${participants[currentTurn].characterName}**`, inline: true },
            { name: 'Round', value: currentRound.toString(), inline: true }
        );

    await message.reply({ embeds: [embed] });
}

async function endTurnOrder(message, database) {
    const channelId = message.channel.id;
    
    // Check if turn order exists
    const turnOrder = await database.get(
        'SELECT * FROM turn_orders WHERE channel_id = ?',
        [channelId]
    );

    if (!turnOrder) {
        return message.reply('No turn order exists in this channel.');
    }

    // Clear Majin Magic and Zenkai bonuses for all participants since combat is ending
    try {
        const participants = JSON.parse(turnOrder.participants);
        for (const participant of participants) {
            await database.run(
                'UPDATE combat_state SET majin_magic_bonus = 0, zenkai_bonus = 0 WHERE character_id = ? AND channel_id = ?',
                [participant.characterId, channelId]
            );
            
            // Clear all technique effects for this character in this channel
            await database.run(
                'DELETE FROM technique_effects WHERE character_id = ? AND channel_id = ?',
                [participant.characterId, channelId]
            );
        }
        console.log('Cleared Majin Magic, Zenkai bonuses, and technique effects for all participants');
    } catch (error) {
        console.error('Error clearing combat bonuses:', error);
    }

    // Delete turn order
    await database.run('DELETE FROM turn_orders WHERE channel_id = ?', [channelId]);

    const embed = new EmbedBuilder()
        .setColor(0x95a5a6)
        .setTitle('🏁 Combat Ended')
        .setDescription('Turn order has been ended.\n*Majin Magic, Zenkai bonuses, and technique effects have been cleared.*');

    await message.reply({ embeds: [embed] });
}

async function transferTurnOrder(message, channelMention, database) {
    const currentChannelId = message.channel.id;
    
    // Parse target channel
    let targetChannelId = channelMention.replace(/[<#>]/g, '');
    
    // Check if current turn order exists
    const turnOrder = await database.get(
        'SELECT * FROM turn_orders WHERE channel_id = ?',
        [currentChannelId]
    );

    if (!turnOrder) {
        return message.reply('No turn order exists in this channel.');
    }

    // Check if target channel already has a turn order
    const existingTargetOrder = await database.get(
        'SELECT * FROM turn_orders WHERE channel_id = ?',
        [targetChannelId]
    );

    if (existingTargetOrder) {
        return message.reply('Target channel already has an active turn order.');
    }

    // Only staff can transfer turn orders
    if (!hasStaffRole(message.member)) {
        return message.reply('Only staff members can transfer turn orders.');
    }

    // Transfer turn order
    await database.run(
        'UPDATE turn_orders SET channel_id = ? WHERE channel_id = ?',
        [targetChannelId, currentChannelId]
    );

    const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('📤 Turn Order Transferred')
        .setDescription(`Combat has been moved to <#${targetChannelId}>`);

    await message.reply({ embeds: [embed] });
}

async function applyEndOfTurnEffects(characterId, database, channelId) {
    // Get character with racials and forms
    const groupConcatFunction = database.usePostgres ? 'string_agg' : 'GROUP_CONCAT';
    const character = await database.get(`
        SELECT c.*, 
               ${groupConcatFunction}(cr.racial_tag${database.usePostgres ? ", ','" : ''}) as racials,
               f.name as form_name, 
               f.ki_drain, f.health_drain, f.strength_modifier, f.defense_modifier, 
               f.agility_modifier, f.endurance_modifier, f.control_modifier, f.pl_modifier
        FROM characters c
        LEFT JOIN character_racials cr ON c.id = cr.character_id AND cr.is_active = 1
        LEFT JOIN character_forms cf ON c.id = cf.character_id AND cf.is_active = 1
        LEFT JOIN forms f ON cf.form_key = f.form_key
        WHERE c.id = ?
        GROUP BY c.id, c.name, c.owner_id, c.race, c.base_pl, c.strength, c.defense, c.agility, 
                 c.endurance, c.control, c.current_health, c.current_ki, c.release_percentage, 
                 c.image_url, c.ki_control, c.magic_mastery, c.primary_affinity, c.secondary_affinities, 
                 c.primary_specialization, c.secondary_specialization, c.created_at,
                 f.name, f.ki_drain, f.health_drain, f.strength_modifier, f.defense_modifier, 
                 f.agility_modifier, f.endurance_modifier, f.control_modifier, f.pl_modifier
    `, [characterId]);

    if (!character) return;

    console.log(`[DEBUG] Turn effects for character ${characterId} (${character.name})`);
    console.log(`[DEBUG] Race: ${character.race}, Current Health: ${character.current_health}, Base PL: ${character.base_pl}, Endurance: ${character.endurance}`);

    let healthChange = 0;
    let kiChange = 0;
    const racials = character.racials ? character.racials.split(',') : [];

    // Apply racial effects
    if (racials.includes('mregen')) {
        // Majin Regeneration
        const hasEnhancedRegen = await database.get(`
            SELECT * FROM character_racials 
            WHERE character_id = ? AND racial_tag = 'mregen_enhanced' AND is_active = 1
        `, [characterId]);
        
        const maxHealth = await calculateMaxHealthForCharacter(database, characterId, character.base_pl, character.endurance);
        const currentHealth = character.current_health || maxHealth;
        
        if (currentHealth < maxHealth) {
            if (hasEnhancedRegen) {
                // Enhanced regeneration - 20% health
                healthChange += Math.floor(maxHealth * 0.2);
                
                // Apply flat ki cost for enhanced regeneration
                const kiCost = 3;
                kiChange -= kiCost;
            } else {
                // Basic regeneration - 10% health
                healthChange += Math.floor(maxHealth * 0.1);
            }
        }
    }

    // Zenkai - check if character faced a stronger enemy and apply bonus
    if (racials.includes('zenkai')) {
        try {
            // Get combat state to check if last enemy was stronger
            const combatState = await database.get(
                'SELECT * FROM combat_state WHERE character_id = ? AND channel_id = ?',
                [characterId, channelId]
            );

            if (combatState && combatState.last_enemy_pl) {
                // Calculate character's current effective PL
                const currentKi = character.current_ki !== null ? character.current_ki : character.endurance;
                const kiPercentage = (currentKi / character.endurance) * 100;
                
                // Check for form multiplier
                let formMultiplier = 1;
                if (character.pl_modifier) {
                    const plModStr = character.pl_modifier.toString();
                    if (plModStr.startsWith('*')) {
                        formMultiplier = parseFloat(plModStr.slice(1)) || 1;
                    }
                }
                
                // Check for Arcosian Resilience
                const hasArcosianResilience = await database.get(`
                    SELECT is_active FROM character_racials 
                    WHERE character_id = ? AND racial_tag = 'aresist' AND is_active = 1
                `, [characterId]);

                // Get current combat bonuses
                const { getCombatBonuses, calculateEffectivePL, calculateMaxHealthForCharacter, calculateZenkaiWithHealthMultiplier } = require('../utils/calculations');
                const bonuses = await getCombatBonuses(database, characterId, channelId);

                // Calculate health-adjusted Zenkai bonus for comparison
                const adjustedZenkaiBonus = await calculateZenkaiWithHealthMultiplier(
                    database, 
                    characterId, 
                    bonuses.zenkaiBonus || 0, 
                    character.base_pl, 
                    character.endurance
                );

                const charEffectivePL = calculateEffectivePL(
                    character.base_pl,
                    kiPercentage,
                    formMultiplier,
                    hasArcosianResilience !== null,
                    adjustedZenkaiBonus,
                    bonuses.majinMagicBonus
                );

                // Check if the last enemy hit had higher effective PL than the character
                // Continue gaining Zenkai until character's effective PL equals or exceeds opponent's
                if (combatState.last_enemy_pl > charEffectivePL) {
                    // Calculate health percentage for low health multiplier
                    const maxHealth = await calculateMaxHealthForCharacter(database, characterId, character.base_pl, character.endurance);
                    const currentHealth = character.current_health || maxHealth;
                    const healthPercentage = (currentHealth / maxHealth) * 100;
                    const isLowHealth = healthPercentage <= 20;
                    
                    // Apply 30% base PL bonus (buffed from 10%)
                    let zenkaiGain = Math.floor(character.base_pl * 0.30);
                    
                    // Apply 1.4x multiplier if at low health (20% or lower)
                    if (isLowHealth) {
                        zenkaiGain = Math.floor(zenkaiGain * 1.4);
                    }
                    
                    const baseZenkaiBonus = bonuses.zenkaiBonus || 0;
                    const newZenkaiBonus = baseZenkaiBonus + zenkaiGain;
                    
                    // Update combat state
                    await database.run(
                        'UPDATE combat_state SET zenkai_bonus = ? WHERE character_id = ? AND channel_id = ?',
                        [newZenkaiBonus, characterId, channelId]
                    );

                    console.log(`Zenkai activated for character ${characterId}:`);
                    console.log(`  - Enemy PL: ${combatState.last_enemy_pl}, Character PL: ${charEffectivePL}`);
                    console.log(`  - Base gain: ${Math.floor(character.base_pl * 0.30)} PL (30% of ${character.base_pl})`);
                    console.log(`  - Health: ${healthPercentage.toFixed(1)}% ${isLowHealth ? '(LOW HEALTH 1.4x MULTIPLIER APPLIED)' : ''}`);
                    console.log(`  - Final gain: +${zenkaiGain} PL`);
                    console.log(`  - Total Zenkai: ${baseZenkaiBonus} -> ${newZenkaiBonus} PL`);
                    if (isLowHealth) {
                        console.log(`  - Low health multiplier applied (≤20% HP): 1.4x bonus`);
                    }
                }
            }
        } catch (error) {
            console.error('Error applying Zenkai bonus:', error);
        }
    }

    // Giant Form handling for Namekians
    if (racials.includes('ngiant')) {
        const giantForm = await database.get(`
            SELECT * FROM character_racials 
            WHERE character_id = ? AND racial_tag = 'ngiant' AND is_active = 1
        `, [characterId]);
        
        if (giantForm) {
            // Giant form ki drain: 3 * (100 / Control) per turn
            const { calculateKiCost } = require('../utils/calculations');
            const kiCost = calculateKiCost(3, character.control);
            kiChange -= kiCost;
        }
    }

    // Human Spirit and Arcosian Resilience are passive and applied in calculations
    // Majin's Magic is handled when dealing damage in combat

    // Apply form drains/gains
    if (character.form_name) {
        // Form is active, apply drains/gains
        if (character.ki_drain) {
            const baseDrain = parseInt(character.ki_drain) || 0;
            
            // Special handling for Suppression Form (minimal)
            if (character.form_key === 'minimal' && baseDrain < 0) {
                // Suppression Form: regain 5% ki per turn, minimum 1 ki if under 20 endurance
                const regenPercentage = Math.abs(baseDrain); // Convert -5 to 5
                let kiRegen = Math.floor(character.endurance * (regenPercentage / 100));
                
                // Apply minimum 1 ki if under 20 endurance
                if (character.endurance < 20 && kiRegen < 1) {
                    kiRegen = 1;
                }
                
                kiChange += kiRegen;
            } else if (baseDrain > 0) {
                // Regular form ki drain
                const actualDrain = Math.max(1, baseDrain * (100 / character.control));
                kiChange -= actualDrain;
            } else if (baseDrain < 0) {
                // Regular form ki gain (negative drain) - percentage-based
                const regenPercentage = Math.abs(baseDrain); // Convert -5 to 5
                let kiRegen = Math.floor(character.endurance * (regenPercentage / 100));
                
                // Apply minimum 1 ki if under 20 endurance (consistent with Suppression Form)
                if (character.endurance < 20 && kiRegen < 1) {
                    kiRegen = 1;
                }
                
                kiChange += kiRegen;
            }
        }
        
        if (character.health_drain) {
            const healthDrain = parseInt(character.health_drain) || 0;
            if (healthDrain > 0) {
                healthChange -= healthDrain;
            }
        }
    }

    // Check and apply innate state effects (e.g., Survival Response ki regen)
    const { innateStates } = require('../utils/config');
    const activeInnateStates = await database.all(`
        SELECT cf.form_key FROM character_forms cf
        WHERE cf.character_id = ? AND cf.is_active = 1
    `, [characterId]);

    for (const activeState of activeInnateStates) {
        const stateConfig = innateStates[activeState.form_key];
        if (stateConfig && stateConfig.modifiers && stateConfig.modifiers.ki_regen) {
            const regenValue = stateConfig.modifiers.ki_regen;
            
            if (regenValue.includes('%')) {
                // Percentage-based regen (e.g., '+5%')
                const percentage = parseInt(regenValue.replace(/[+%]/g, ''));
                let kiRegen = Math.floor(character.endurance * (percentage / 100));
                
                // Apply minimum 1 ki if under 20 endurance (same as Suppression Form)
                if (character.endurance < 20 && kiRegen < 1) {
                    kiRegen = 1;
                }
                
                kiChange += kiRegen;
                console.log(`Applied ${stateConfig.name} ki regen: +${kiRegen} ki (${percentage}% of ${character.endurance} endurance)`);
            }
        }
    }

    // Check for innate state activation (before applying changes)
    const { checkInnateStateActivation } = require('../utils/innateStates');
    try {
        console.log(`Checking innate state activation for character ${characterId} (race: ${character.race})`);
        const result = await checkInnateStateActivation(database, characterId, character);
        if (result) {
            console.log(`Innate state activation result:`, result);
        }
    } catch (error) {
        console.error('Error checking innate state activation:', error);
    }

    // Apply changes
    if (healthChange !== 0) {
        const maxHealth = await calculateMaxHealthForCharacter(database, characterId, character.base_pl, character.endurance);
        const currentHealth = character.current_health || maxHealth;
        const newHealth = Math.min(maxHealth, currentHealth + healthChange); // Cap at max health
        
        await database.run(
            'UPDATE characters SET current_health = ? WHERE id = ?',
            [newHealth, characterId]
        );
    }

    if (kiChange !== 0) {
        const currentKi = character.current_ki !== null ? character.current_ki : character.endurance;
        const newKi = Math.max(0, currentKi + kiChange);
        
        await database.run(
            'UPDATE characters SET current_ki = ? WHERE id = ?',
            [newKi, characterId]
        );
        
        // Enforce ki cap if ki was increased
        if (kiChange > 0) {
            const { enforceKiCap } = require('../utils/calculations');
            await enforceKiCap(database, characterId);
        }
    }
    
    // Decrement technique effect durations at end of turn
    await decrementTechniqueEffects(database, characterId, channelId);
}
