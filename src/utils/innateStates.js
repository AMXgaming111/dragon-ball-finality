const { innateStates } = require('./config');

/**
 * Get innate states for a specific race
 */
function getInnateStatesForRace(race) {
    return Object.values(innateStates).filter(state => state.defaultRace === race);
}

/**
 * Grant innate states to a character upon creation
 */
async function grantInnateStates(database, characterId, race) {
    const raceStates = getInnateStatesForRace(race);
    
    for (const state of raceStates) {
        try {
            // Create the innate state in character_forms table (reusing forms system for states)
            await database.run(`
                INSERT INTO character_forms (character_id, form_key, is_active) 
                VALUES (?, ?, ?)
                ON CONFLICT (character_id, form_key) DO NOTHING
            `, [characterId, state.tag, 0]); // Start inactive, will activate based on conditions
            
            console.log(`Granted innate state ${state.name} to character ${characterId}`);
        } catch (error) {
            console.error(`Error granting innate state ${state.name}:`, error);
        }
    }
}

/**
 * Check if character should have an innate state activated
 */
async function checkInnateStateActivation(database, characterId, character) {
    const raceStates = getInnateStatesForRace(character.race);
    console.log(`[DEBUG] Checking innate states for ${character.race} character ID ${characterId}`);
    console.log(`[DEBUG] Found ${raceStates.length} innate states for race: ${raceStates.map(s => s.name).join(', ')}`);
    
    for (const state of raceStates) {
        console.log(`[DEBUG] Checking state: ${state.name} (${state.tag}) with trigger: ${state.trigger}`);
        const shouldActivate = await checkStateTrigger(state, character, database);
        console.log(`[DEBUG] Should activate ${state.name}: ${shouldActivate}`);
        
        // Check current state
        const currentState = await database.get(`
            SELECT is_active FROM character_forms 
            WHERE character_id = ? AND form_key = ?
        `, [characterId, state.tag]);
        
        console.log(`[DEBUG] Current state for ${state.name}: ${currentState ? `active=${currentState.is_active} (type: ${typeof currentState.is_active})` : 'not found'}`);
        
        if (shouldActivate && (!currentState || currentState.is_active === 0 || currentState.is_active === false)) {
            // Activate the state
            await database.run(`
                UPDATE character_forms 
                SET is_active = 1 
                WHERE character_id = ? AND form_key = ?
            `, [characterId, state.tag]);
            
            console.log(`[SUCCESS] Activated innate state ${state.name} for character ${characterId}`);
            return { activated: true, state: state };
        } else if (!shouldActivate && currentState && (currentState.is_active === 1 || currentState.is_active === true)) {
            // Deactivate the state
            await database.run(`
                UPDATE character_forms 
                SET is_active = 0 
                WHERE character_id = ? AND form_key = ?
            `, [characterId, state.tag]);
            
            console.log(`[SUCCESS] Deactivated innate state ${state.name} for character ${characterId}`);
            return { activated: false, state: state };
        } else {
            console.log(`[DEBUG] No state change needed for ${state.name} (shouldActivate: ${shouldActivate}, currentlyActive: ${currentState?.is_active || 'none'}, condition check: ${shouldActivate && (!currentState || currentState.is_active === 0 || currentState.is_active === false)})`);
        }
    }
    
    return null;
}

/**
 * Check if a state's trigger condition is met
 */
async function checkStateTrigger(state, character, database) {
    switch (state.trigger) {
        case 'health_50_percent':
            const { calculateMaxHealthForCharacter } = require('./calculations');
            const maxHealth = await calculateMaxHealthForCharacter(database, character.id, character.base_pl, character.endurance);
            const currentHealth = character.current_health || maxHealth;
            const healthPercentage = (currentHealth / maxHealth) * 100;
            console.log(`[DEBUG] Health Check: ${currentHealth}/${maxHealth} = ${healthPercentage.toFixed(1)}% (trigger at ≤50%)`);
            return healthPercentage <= 50;
        
        // Add more trigger types as needed
        default:
            return false;
    }
}

/**
 * Apply innate state modifiers to character stats
 */
function applyInnateStateModifiers(baseStats, activeStates) {
    let modifiedStats = { ...baseStats };
    
    for (const state of activeStates) {
        if (state.modifiers) {
            // Apply each modifier
            Object.keys(state.modifiers).forEach(modifier => {
                const value = state.modifiers[modifier];
                
                if (modifier.endsWith('_modifier')) {
                    const statName = modifier.replace('_modifier', '');
                    if (modifiedStats[statName] !== undefined) {
                        if (value.startsWith('*')) {
                            modifiedStats[statName] = Math.round(modifiedStats[statName] * parseFloat(value.replace('*', '')));
                        } else if (value.startsWith('+')) {
                            modifiedStats[statName] += parseInt(value.replace('+', ''));
                        } else if (value.startsWith('-')) {
                            modifiedStats[statName] -= parseInt(value.replace('-', ''));
                        }
                    }
                }
            });
        }
    }
    
    return modifiedStats;
}

module.exports = {
    getInnateStatesForRace,
    grantInnateStates,
    checkInnateStateActivation,
    checkStateTrigger,
    applyInnateStateModifiers
};
