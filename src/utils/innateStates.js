/**
 * Innate States Configuration
 * 
 * This file defines which races get which innate states automatically
 * when characters are created, and what special features they have.
 */

// Define innate states for each race
const INNATE_STATES = {
    'Arcosian': [
        {
            form_key: 'minimal',
            name: 'Suppression Form',
            description: 'Reduces power level but increases control and regenerates ki',
            special_features: ['ki_regeneration', 'endurance_based_ki_gain']
        }
    ],
    'Namekian': [
        {
            form_key: 'ngiant',
            name: 'Giant Form',
            description: 'x1.4 Strength and Defense. Cost: 3 Ki per turn (affected by control). Advanced Ki Control allows harnessing this power without size change.',
            special_features: ['turn_ki_cost', 'strength_defense_boost']
        }
    ],
    'Saiyan': [
        {
            form_key: 'oozaru',
            name: 'Oozaru',
            description: 'x10 Strength, x0.2 Control. Additionally, you are unable to use ki supers for anything aside from attacking.',
            special_features: ['ki_super_restriction']
        }
    ],
    // Add more races and their innate states here
    // 'Saiyan': [
    //     {
    //         form_key: 'oozaru',
    //         name: 'Great Ape Form',
    //         description: 'Transforms under full moon or artificial blutz waves',
    //         special_features: ['moon_trigger', 'size_increase', 'rage_boost']
    //     }
    // ],
    // 'Majin': [
    //     {
    //         form_key: 'absorption',
    //         name: 'Absorption Ability',
    //         description: 'Can absorb other beings to gain power',
    //         special_features: ['absorption_mechanics', 'power_stealing']
    //     }
    // ]
};

// Define special feature handlers
const SPECIAL_FEATURES = {
    'ki_regeneration': {
        description: 'Regenerates ki per turn instead of draining it',
        handler: 'handleKiRegeneration'
    },
    'endurance_based_ki_gain': {
        description: 'Ki regeneration amount depends on endurance stat',
        handler: 'handleEnduranceBasedKiGain'
    },
    'turn_ki_cost': {
        description: 'Costs ki at the start of each turn',
        handler: 'handleTurnKiCost'
    },
    'strength_defense_boost': {
        description: 'Provides multiplier bonus to strength and defense',
        handler: 'handleStrengthDefenseBoost'
    },
    'ki_super_restriction': {
        description: 'Restricts ki supers to attacking only',
        handler: 'handleKiSuperRestriction'
    },
    'moon_trigger': {
        description: 'Automatically activates under certain conditions',
        handler: 'handleMoonTrigger'
    },
    'size_increase': {
        description: 'Changes character size and provides bonuses',
        handler: 'handleSizeIncrease'
    },
    'rage_boost': {
        description: 'Power increases when health is low',
        handler: 'handleRageBoost'
    },
    'absorption_mechanics': {
        description: 'Special absorption combat interactions',
        handler: 'handleAbsorption'
    },
    'power_stealing': {
        description: 'Can steal power from defeated opponents',
        handler: 'handlePowerStealing'
    }
};

/**
 * Get innate states for a race
 * @param {string} race - The race name
 * @returns {Array} Array of innate state objects
 */
function getInnateStatesForRace(race) {
    return INNATE_STATES[race] || [];
}

/**
 * Check if a state has special features
 * @param {string} stateKey - The state key
 * @returns {boolean} True if state has special features
 */
function hasSpecialFeatures(stateKey) {
    for (const race in INNATE_STATES) {
        const states = INNATE_STATES[race];
        const state = states.find(s => s.form_key === stateKey);
        if (state && state.special_features && state.special_features.length > 0) {
            return true;
        }
    }
    return false;
}

/**
 * Get special features for a state
 * @param {string} stateKey - The state key
 * @returns {Array} Array of special feature names
 */
function getSpecialFeatures(stateKey) {
    for (const race in INNATE_STATES) {
        const states = INNATE_STATES[race];
        const state = states.find(s => s.form_key === stateKey);
        if (state && state.special_features) {
            return state.special_features;
        }
    }
    return [];
}

/**
 * Grant innate states to a character based on their race
 * @param {Object} database - Database instance
 * @param {number} characterId - Character ID
 * @param {string} race - Character race
 */
async function grantInnateStates(database, characterId, race) {
    const innateStates = getInnateStatesForRace(race);
    
    for (const state of innateStates) {
        try {
            // Check if the state form exists in the database
            const existingForm = await database.get(
                'SELECT * FROM forms WHERE form_key = ?',
                [state.form_key]
            );

            if (!existingForm) {
                console.log(`⚠️  Warning: Form '${state.form_key}' not found for race '${race}'. Creating it...`);
                
                // Create the form based on the state configuration
                if (state.form_key === 'minimal') {
                    // Arcosian Suppression Form
                    await database.run(`
                        INSERT OR IGNORE INTO forms (
                            form_key, 
                            name, 
                            pl_modifier, 
                            control_modifier, 
                            ki_drain,
                            is_stackable
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        state.form_key,
                        state.name,
                        '*0.6',     // 40% PL reduction
                        '*2',       // x2 control
                        '-5',       // Regain 5% ki per turn
                        false
                    ]);
                } else if (state.form_key === 'ngiant') {
                    // Namekian Giant Form
                    await database.run(`
                        INSERT OR IGNORE INTO forms (
                            form_key, 
                            name, 
                            strength_modifier,
                            defense_modifier,
                            ki_drain,
                            is_stackable
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        state.form_key,
                        state.name,
                        '*1.4',     // x1.4 strength
                        '*1.4',     // x1.4 defense
                        '3',        // 3 ki per turn cost
                        false
                    ]);
                } else {
                    // Default form creation for other states
                    await database.run(`
                        INSERT OR IGNORE INTO forms (
                            form_key, 
                            name, 
                            pl_modifier, 
                            control_modifier, 
                            ki_drain,
                            is_stackable
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        state.form_key,
                        state.name,
                        '*1',     // No PL change by default
                        '*1',     // No control change by default
                        '0',      // No ki drain by default
                        false
                    ]);
                }
            }

            // Grant the state to the character
            await database.run(`
                INSERT OR IGNORE INTO character_forms (character_id, form_key, is_active)
                VALUES (?, ?, ?)
            `, [characterId, state.form_key, false]);

            console.log(`✅ Granted innate state '${state.name}' to character ${characterId}`);

        } catch (error) {
            console.error(`❌ Failed to grant innate state '${state.name}' to character ${characterId}:`, error);
        }
    }
}

module.exports = {
    INNATE_STATES,
    SPECIAL_FEATURES,
    getInnateStatesForRace,
    hasSpecialFeatures,
    getSpecialFeatures,
    grantInnateStates
};
