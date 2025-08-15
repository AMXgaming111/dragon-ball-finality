/**
 * Add turn management to combat embed
 */
async function addTurnManagementToEmbed(interaction, combatEmbed, database) {
    // Add turn management footer and buttons
    combatEmbed.setFooter({ text: 'Would you like to end your turn?' });
    
    const turnRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('end_turn_yes')
                .setLabel('Yes')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('end_turn_no')
                .setLabel('No')
                .setStyle(ButtonStyle.Secondary)
        );

    // Edit the original message with the final combat result and turn buttons
    const combatMessage = await interaction.editReply({ embeds: [combatEmbed], components: [turnRow] });
    
    // Handle turn management button interaction
    const turnFilter = (buttonInteraction) => {
        return (buttonInteraction.customId === 'end_turn_yes' || buttonInteraction.customId === 'end_turn_no') && 
               buttonInteraction.user.id === interaction.user.id;
    };

    try {
        const turnInteraction = await combatMessage.awaitMessageComponent({ 
            filter: turnFilter, 
            time: 60000 
        });

        if (turnInteraction.customId === 'end_turn_yes') {
            // Advance the turn
            await advanceTurnFromInteraction(turnInteraction, database);
        } else {
            // User chose not to end turn
            await turnInteraction.update({ 
                embeds: [combatEmbed], 
                components: [] 
            });
        }
    } catch (error) {
        // Timeout or error - remove buttons
        try {
            await interaction.editReply({ embeds: [combatEmbed], components: [] });
        } catch (e) {
            // Ignore edit errors
        }
    }
}

/**
 * Advance turn from a button interaction
 */
async function advanceTurnFromInteraction(interaction, database) {
    const channelId = interaction.channel.id;
    
    // Check if turn order exists
    const turnOrder = await database.get(
        'SELECT * FROM turn_orders WHERE channel_id = ?',
        [channelId]
    );

    if (!turnOrder) {
        await interaction.update({ 
            content: 'No turn order exists in this channel.',
            embeds: interaction.message.embeds,
            components: [] 
        });
        return;
    }

    const participants = JSON.parse(turnOrder.participants);
    let currentTurn = turnOrder.current_turn;
    let currentRound = turnOrder.current_round;

    // Apply end-of-turn effects for current character
    const currentParticipant = participants[currentTurn];
    await applyEndOfTurnEffects(currentParticipant.characterId, database);

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
        const user = await interaction.client.users.fetch(nextParticipant.userId).catch(() => null);
        if (user) {
            displayUsername = user.username;
        }
    } catch (error) {
        // Keep the fallback username
    }
    
    const turnAdvanceEmbed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('🔄 Turn Advanced')
        .setDescription(`It's now **${nextParticipant.characterName}**'s turn!`)
        .addFields(
            { name: 'Current Player', value: `${nextParticipant.characterName} (${displayUsername})`, inline: true },
            { name: 'Round', value: currentRound.toString(), inline: true }
        );

    // Update the interaction with both the original combat embed and the turn advance embed
    await interaction.update({ 
        embeds: [interaction.message.embeds[0], turnAdvanceEmbed],
        components: [] 
    });
}

/**
 * Apply end-of-turn effects for a character (copied from turn.js for standalone use)
 */
async function applyEndOfTurnEffects(characterId, database) {
    // Get character with racials and forms
    const character = await database.get(`
        SELECT c.*, 
               GROUP_CONCAT(cr.racial_tag) as racials,
               f.name as form_name, 
               f.ki_drain, f.health_drain, f.strength_modifier, f.defense_modifier, 
               f.agility_modifier, f.endurance_modifier, f.control_modifier, f.pl_modifier
        FROM characters c
        LEFT JOIN character_racials cr ON c.id = cr.character_id
        LEFT JOIN character_forms cf ON c.id = cf.character_id AND cf.is_active = 1
        LEFT JOIN forms f ON cf.form_key = f.form_key
        WHERE c.id = ?
        GROUP BY c.id
    `, [characterId]);

    if (!character) return;

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
        
        const maxHealth = character.base_pl * character.endurance;
        const currentHealth = character.current_health || maxHealth;
        
        if (currentHealth < maxHealth) {
            if (hasEnhancedRegen) {
                // Enhanced regeneration - 20% health
                healthChange += Math.floor(maxHealth * 0.20);
                
                // Apply ki cost for enhanced regeneration
                const { calculateKiCost } = require('./src/utils/calculations');
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
            WHERE character_id = ? AND racial_tag = 'ngiant' AND is_active = 1
        `, [characterId]);
        
        if (giantForm) {
            // Giant form drains 10% ki per turn
            kiChange -= Math.floor(character.endurance * 0.10);
        }
    }

    // Apply form drains/gains
    if (character.form_name) {
        // Form is active, apply drains
        if (character.ki_drain) {
            const drainPercentage = character.ki_drain / 100;
            kiChange -= Math.floor(character.endurance * drainPercentage);
        }
        
        if (character.health_drain) {
            const drainPercentage = character.health_drain / 100;
            const maxHealth = character.base_pl * character.endurance;
            healthChange -= Math.floor(maxHealth * drainPercentage);
        }
    }

    // Apply changes
    if (healthChange !== 0) {
        const maxHealth = character.base_pl * character.endurance;
        const currentHealth = character.current_health || maxHealth;
        const newHealth = Math.min(maxHealth, currentHealth + healthChange); // Cap at max health
        
        await database.run(
            'UPDATE characters SET current_health = ? WHERE id = ?',
            [newHealth, characterId]
        );
    }

    if (kiChange !== 0) {
        const currentKi = character.current_ki || character.endurance;
        const newKi = Math.max(0, Math.min(character.endurance, currentKi + kiChange));
        
        await database.run(
            'UPDATE characters SET current_ki = ? WHERE id = ?',
            [newKi, characterId]
        );
    }
}
