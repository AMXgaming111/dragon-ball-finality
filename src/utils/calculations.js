const { racials } = require('./config');

// Check if // Get current ki cap for a character (helper function)
async function getCurrentKiCap(database, characterId) {
    // Get character data directly
    const character = await database.get(`
        SELECT id, base_pl, endurance, current_health, current_ki
        FROM characters 
        WHERE id = ?
    `, [characterId]);
    
    if (!character) return 1; // Fallback
    
    return await calculateKiCap(database, character);
}

// Check if character has active Human Spirit racial
async function hasHumanSpirit(database, characterId) {
    const racial = await database.get(`
        SELECT is_active FROM character_racials 
        WHERE character_id = ? AND racial_tag = 'hspirit' AND is_active = 1
    `, [characterId]);
    
    return Boolean(racial); // Explicitly convert to boolean
}

// Calculate ki cap based on health with Human Spirit consideration
async function calculateKiCap(database, character) {
    const maxHealth = await calculateMaxHealthForCharacter(
        database,
        character.id,
        character.base_pl,
        character.endurance
    );
    const currentHealth = character.current_health || maxHealth;
    const healthPercentage = (currentHealth / maxHealth) * 100;
    
    if (healthPercentage >= 100) {
        return character.endurance;
    }
    
    // Calculate base ki reduction
    const baseReduction = (100 - healthPercentage) / 100;
    
    // Check for Human Spirit racial (halves ki cap reduction)
    const humanSpirit = await hasHumanSpirit(database, character.id);
    const actualReduction = humanSpirit ? baseReduction * 0.5 : baseReduction;
    
    const reducedCap = Math.round(character.endurance * (1 - actualReduction));
    return Math.max(1, reducedCap); // Minimum 1 ki cap
}

// Enforce ki cap dynamically when health changes - automatically lowers ki if above cap
async function enforceKiCap(database, characterId) {
    // Get character data directly to ensure we have fresh health data
    const character = await database.get(`
        SELECT id, base_pl, endurance, current_health, current_ki
        FROM characters 
        WHERE id = ?
    `, [characterId]);
    
    if (!character) return;
    
    // Handle null vs 0 ki carefully - null means max, 0 means 0
    const currentKi = character.current_ki !== null ? character.current_ki : character.endurance;
    const kiCap = await calculateKiCap(database, character);
    
    // Only reduce ki if it's above the cap - never increase it automatically
    // If current_ki was 0, don't treat it as max ki for cap enforcement
    if (character.current_ki !== null && currentKi > kiCap) {
        await database.run(
            'UPDATE characters SET current_ki = ? WHERE id = ?',
            [kiCap, characterId]
        );
        console.log(`Ki automatically reduced from ${currentKi} to ${kiCap} due to health cap for character ${characterId}`);
    }
}

// Get current ki cap for a character (helper function)
async function getCurrentKiCap(database, characterId) {
    // First get the character's user ID
    const characterData = await database.get(
        'SELECT owner_id FROM characters WHERE id = ?',
        [characterId]
    );
    if (!characterData) return 100; // Fallback
    
    const character = await database.getUserWithActiveCharacter(characterData.owner_id);
    if (!character || character.active_character_id !== characterId) return 100; // Fallback
    
    return await calculateKiCap(database, character);
}

// Calculate ki loss based on health percentage
function calculateKiLossFromHealth(healthPercentage) {
    if (healthPercentage >= 100) return 0;
    
    let totalLoss = 0;
    let remaining = 100 - healthPercentage;
    
    // First tier (100%-51%): 0.5% debuff per point lost [25% total loss]
    // From 100% to 51% = 49 points, but we want exactly 25% total
    // So: 50 points × 0.5% = 25%
    if (remaining > 0) {
        const firstTier = Math.min(remaining, 50); // 50 points to get exactly 25%
        totalLoss += firstTier * 0.5;
        remaining -= firstTier;
    }
    
    // Second tier (50%-21%): 1% debuff per point lost [30% total loss for combined 55%]
    // From 50% to 21% = 29 points, but we want exactly 30% additional
    // So: 30 points × 1% = 30%
    if (remaining > 0) {
        const secondTier = Math.min(remaining, 30); // 30 points to get exactly 30% additional
        totalLoss += secondTier * 1.0;
        remaining -= secondTier;
    }
    
    // Third tier (20%-0%): 1.5% debuff per point lost [30% total loss for combined 85%]
    // From 20% to 0% = 20 points, but we want exactly 30% additional
    // So: 20 points × 1.5% = 30%
    if (remaining > 0) {
        const thirdTier = Math.min(remaining, 20); // 20 points × 1.5% = 30%
        totalLoss += thirdTier * 1.5;
    }
    
    return Math.min(totalLoss, 85); // Cap at 85% as per specifications
}

// Calculate effective PL based on base PL, ki percentage, and forms
function calculateEffectivePL(basePL, kiPercentage, formMultiplier = 1, hasArcosianResilience = false, zenkaiBonus = 0, majinMagicBonus = 0, releasePercentage = 100) {
    const kiDebuff = calculateKiLossFromHealth(kiPercentage);
    const adjustedDebuff = hasArcosianResilience ? kiDebuff / 2 : kiDebuff;
    
    // Apply form multiplier to base PL
    const formAdjustedPL = basePL * formMultiplier;
    
    // Add racial bonuses (both are flat PL amounts)
    const racialAdjustedPL = formAdjustedPL + zenkaiBonus + majinMagicBonus;
    
    // Apply ki debuff to get base effective PL
    const baseEffectivePL = racialAdjustedPL * (1 - adjustedDebuff / 100);
    
    // Apply release percentage
    return Math.floor(baseEffectivePL * (releasePercentage / 100));
}

// Calculate the maximum multiplier a character can afford with their current ki
function calculateMaxAffordableMultiplier(currentKi, control, effort = 2, accuracyMultiplier = 1, endurance = 1) {
    let availableKi = currentKi;
    
    // Subtract accuracy multiplier cost if used
    if (accuracyMultiplier > 1) {
        const accuracyKiCost = calculateKiSpecialCost(accuracyMultiplier, control);
        availableKi -= accuracyKiCost;
    }
    
    // Subtract effort cost if applicable
    const effortKiCost = getEffortKiCost(effort);
    if (effortKiCost > 0) {
        const effortCost = Math.floor(endurance * (effortKiCost / 100));
        availableKi -= effortCost;
    }
    
    // If no ki available, return 0 to indicate no multipliers affordable
    if (availableKi <= 0) {
        return 0;
    }
    
    // Find the highest multiplier we can afford
    let maxMultiplier = 0;
    for (let mult = 1.5; mult <= 10; mult += 0.5) {
        const cost = calculateKiSpecialCost(mult, control);
        if (cost <= availableKi) {
            maxMultiplier = mult;
        } else {
            break;
        }
    }
    
    // If we can't afford even 1.5x, return 0
    return maxMultiplier > 0 ? maxMultiplier : 0;
}

// Calculate Zenkai bonus with health-based multiplier
async function calculateZenkaiWithHealthMultiplier(database, characterId, baseZenkaiBonus, basePL, endurance) {
    if (!baseZenkaiBonus || baseZenkaiBonus <= 0) {
        return 0;
    }
    
    try {
        // Get character's current health
        const character = await database.get('SELECT current_health FROM characters WHERE id = ?', [characterId]);
        if (!character) return baseZenkaiBonus;
        
        // Calculate health percentage
        const maxHealth = await calculateMaxHealthForCharacter(database, characterId, basePL, endurance);
        const currentHealth = character.current_health || maxHealth;
        const healthPercentage = (currentHealth / maxHealth) * 100;
        
        // Apply 1.4x multiplier if at 20% health or lower
        if (healthPercentage <= 20) {
            return Math.floor(baseZenkaiBonus * 1.4);
        }
        
        return baseZenkaiBonus;
    } catch (error) {
        console.error('Error calculating Zenkai health multiplier:', error);
        return baseZenkaiBonus;
    }
}

// Calculate effective PL with automatic release percentage lookup
async function calculateEffectivePLWithRelease(database, characterId, basePL, kiPercentage, formMultiplier = 1, hasArcosianResilience = false, zenkaiBonus = 0, majinMagicBonus = 0) {
    // Apply health-based multiplier to Zenkai bonus
    const adjustedZenkaiBonus = await calculateZenkaiWithHealthMultiplier(database, characterId, zenkaiBonus, basePL, 
        // We need endurance to calculate max health, but we don't have it here
        // Let's get it from the database
        (await database.get('SELECT endurance FROM characters WHERE id = ?', [characterId]))?.endurance || 100
    );
    
    // Get the character's release percentage
    const releaseData = await database.get(
        'SELECT release_percentage FROM characters WHERE id = ?',
        [characterId]
    );
    
    const releasePercentage = releaseData?.release_percentage || 100;
    
    return calculateEffectivePL(basePL, kiPercentage, formMultiplier, hasArcosianResilience, adjustedZenkaiBonus, majinMagicBonus, releasePercentage);
}

// Calculate maximum health based on base PL, endurance, and Ki Control level
function calculateMaxHealth(basePL, endurance, formMultiplier = 1, kiControlLevel = 0) {
    let healthMultiplier;
    
    // Determine health multiplier based on Ki Control level
    switch (kiControlLevel) {
        case 0: // None
            healthMultiplier = endurance / 4;
            break;
        case 1: // Basic
            healthMultiplier = endurance / 2;
            break;
        case 2: // Advanced
        default:
            healthMultiplier = endurance;
            break;
    }
    
    return Math.floor(basePL * formMultiplier * healthMultiplier);
}

// Helper function to calculate max health for a character (with database lookup for Ki Control)
async function calculateMaxHealthForCharacter(database, characterId, basePL, endurance, formMultiplier = 1) {
    // Get character's Ki Control level
    const character = await database.get(`
        SELECT ki_control FROM characters WHERE id = ?
    `, [characterId]);
    
    const kiControlLevel = character ? (character.ki_control || 0) : 0;
    return calculateMaxHealth(basePL, endurance, formMultiplier, kiControlLevel);
}

// Calculate maximum ki (equal to endurance stat)
function calculateMaxKi(endurance) {
    return endurance;
}

// Calculate current health percentage
function calculateHealthPercentage(currentHealth, maxHealth) {
    if (maxHealth === 0) return 0;
    return Math.max(0, (currentHealth / maxHealth) * 100);
}

// Calculate ki cost with control modifier
function calculateKiCost(baseCost, control) {
    const cost = Math.floor(baseCost * (100 / control));
    return Math.max(1, cost); // Minimum cost of 1
}

// Calculate ki special cost based on multiplier intervals
function calculateKiSpecialCost(multiplier, control) {
    // Validate multiplier is at least 1.5 and in 0.5 intervals
    if (multiplier < 1.5) return 0;
    
    // Calculate how many 0.5 intervals above 1.0
    const intervals = Math.floor((multiplier - 1.0) / 0.5);
    if (intervals <= 0) return 0;
    
    // Each interval costs 5 base ki, affected by control with minimum 1 per interval
    let totalCost = 0;
    for (let i = 0; i < intervals; i++) {
        const intervalCost = Math.max(1, Math.floor(5 * (100 / control)));
        totalCost += intervalCost;
    }
    
    return totalCost;
}

// Calculate physical attack damage
async function calculatePhysicalAttack(effectivePL, strength, additive = 0, database = null, characterId = null) {
    let finalStrength = strength + additive;
    
    // Check for Namekian Giant Form bonus
    if (database && characterId) {
        const giantForm = await database.get(`
            SELECT * FROM character_racials 
            WHERE character_id = ? AND racial_tag = 'ngiant' AND is_active = 1
        `, [characterId]);
        
        if (giantForm) {
            finalStrength += 40; // Giant form grants +40 strength
        }
    }
    
    return Math.max(1, Math.floor(effectivePL * (finalStrength / 10))); // Ensure minimum damage of 1
}

// Calculate ki attack damage
function calculateKiAttack(effectivePL, multiplier = 1) {
    return Math.max(1, Math.floor(effectivePL * 10 * multiplier)); // Ensure minimum damage of 1
}

// Calculate accuracy/agility roll
function calculateAccuracy(effectivePL, agility, modifier = 0, isMultiplier = false) {
    if (isMultiplier) {
        return Math.max(1, Math.floor((effectivePL * (agility / 10)) * modifier)); // Ensure minimum accuracy of 1
    } else {
        return Math.max(1, Math.floor(effectivePL * ((agility + modifier) / 10))); // Ensure minimum accuracy of 1
    }
}

// Calculate block value
async function calculateBlock(effectivePL, defense, modifier = 0, isMultiplier = false, database = null, characterId = null) {
    let finalDefense = defense;
    
    // Check for Namekian Giant Form bonus
    if (database && characterId) {
        const giantForm = await database.get(`
            SELECT * FROM character_racials 
            WHERE character_id = ? AND racial_tag = 'ngiant' AND is_active = 1
        `, [characterId]);
        
        if (giantForm) {
            finalDefense += 40; // Giant form grants +40 defense
        }
    }
    
    if (isMultiplier) {
        return Math.max(1, Math.floor((effectivePL * (finalDefense / 10)) * modifier)); // Ensure minimum block of 1
    } else {
        return Math.max(1, Math.floor(effectivePL * ((finalDefense + modifier) / 10))); // Ensure minimum block of 1
    }
}

// Calculate dodge value
function calculateDodge(effectivePL, agility, modifier = 0, isMultiplier = false) {
    if (isMultiplier) {
        return Math.max(1, Math.floor((effectivePL * (agility / 10)) * modifier)); // Ensure minimum dodge of 1
    } else {
        return Math.max(1, Math.floor(effectivePL * ((agility + modifier) / 10))); // Ensure minimum dodge of 1
    }
}

// Generate random roll within effort range
function rollWithEffort(baseValue, effort = 2) {
    const effortRanges = {
        1: { min: 0.4, max: 0.6 },   // Low effort
        2: { min: 0.7, max: 1.0 },   // Normal effort
        3: { min: 0.8, max: 1.0 },   // Moderate effort
        4: { min: 0.9, max: 1.0 },   // High effort
        5: { min: 0.95, max: 1.2 }   // Monumental effort
    };
    
    const range = effortRanges[effort] || effortRanges[2];
    const multiplier = Math.random() * (range.max - range.min) + range.min;
    
    return Math.max(1, Math.floor(baseValue * multiplier)); // Ensure minimum roll of 1
}

// Get effort ki cost percentage
function getEffortKiCost(effort) {
    const effortCosts = {
        1: -3,  // Low effort: gain 3% ki
        2: 0,   // Normal effort: no cost
        3: 5,   // Moderate effort: 5% cost
        4: 7,   // High effort: 7% cost
        5: 10   // Monumental effort: 10% cost
    };
    
    return effortCosts[effort] || 0;
}

// Calculate blowback damage from ki attacks
function calculateBlowback(attackDamage, kiPercentageUsed) {
    if (kiPercentageUsed >= 100) return Math.floor(attackDamage * 1.5);
    if (kiPercentageUsed >= 75) return Math.floor(attackDamage * 0.7);
    if (kiPercentageUsed >= 50) return Math.floor(attackDamage * 0.3);
    if (kiPercentageUsed >= 25) return Math.floor(attackDamage * 0.1);
    return 0;
}

// Get racial ability for a race
function getRacialForRace(race) {
    const raceRacialMap = {
        'Saiyan': 'zenkai',
        'Human': 'hspirit',
        'Namekian': 'nphys',
        'Synthetic Majin': 'mregen',
        'Arcosian': 'aresist',
        'Majin': 'mmagic'
    };
    
    return raceRacialMap[race] || null;
}

// Parse modifier string (e.g., "+10", "*2", "set5", "/2")
function parseModifier(modifierStr) {
    if (!modifierStr) return null;
    
    const str = modifierStr.toString().toLowerCase();
    
    if (str.startsWith('+')) {
        return { type: 'add', value: parseFloat(str.slice(1)) };
    } else if (str.startsWith('-')) {
        return { type: 'subtract', value: parseFloat(str.slice(1)) };
    } else if (str.startsWith('*')) {
        return { type: 'multiply', value: parseFloat(str.slice(1)) };
    } else if (str.startsWith('/')) {
        return { type: 'divide', value: parseFloat(str.slice(1)) };
    } else if (str.startsWith('set')) {
        return { type: 'set', value: parseFloat(str.slice(3)) };
    }
    
    // If no operator, assume it's a set value
    const value = parseFloat(str);
    if (!isNaN(value)) {
        return { type: 'set', value: value };
    }
    
    return null;
}

// Apply modifier to a value
function applyModifier(currentValue, modifier) {
    if (!modifier) return currentValue;
    
    switch (modifier.type) {
        case 'add':
            return currentValue + modifier.value;
        case 'subtract':
            return currentValue - modifier.value;
        case 'multiply':
            return currentValue * modifier.value;
        case 'divide':
            return currentValue / modifier.value;
        case 'set':
            return modifier.value;
        default:
            return currentValue;
    }
}

// Check if user has staff role
function hasStaffRole(member, staffRoleName = 'Staff') {
    return member.roles.cache.some(role => role.name === staffRoleName);
}

// Calculate physical defense (blocking)
async function calculatePhysicalDefense(effectivePL, defense, additive = 0, database = null, characterId = null) {
    let finalDefense = defense + additive;
    
    // Check for Namekian Giant Form bonus
    if (database && characterId) {
        const giantForm = await database.get(`
            SELECT * FROM character_racials 
            WHERE character_id = ? AND racial_tag = 'ngiant' AND is_active = 1
        `, [characterId]);
        
        if (giantForm) {
            finalDefense += 40; // Giant form grants +40 defense
        }
    }
    
    return Math.max(1, Math.floor(effectivePL * (finalDefense / 10))); // Ensure minimum defense of 1
}

// Calculate ki defense (blocking with ki enhancement)
function calculateKiDefense(effectivePL, defense, multiplier = 1) {
    const baseDefense = Math.floor(effectivePL * (defense / 10));
    return Math.max(1, Math.floor(baseDefense * multiplier)); // Ensure minimum defense of 1
}

// Generate health bar visualization
function generateHealthBar(healthPercentage, emojiId = '1400942686495572041') {
    const clampedPercentage = Math.max(0, Math.min(120, healthPercentage));
    
    // Calculate units based on exact percentage ranges from specifications
    let units = 0;
    if (clampedPercentage >= 100) units = 10;      // 100%+ shows all 10 units
    else if (clampedPercentage >= 90) units = 9;   // 99-90% shows 9 units
    else if (clampedPercentage >= 80) units = 8;   // 89-80% shows 8 units
    else if (clampedPercentage >= 60) units = 7;   // 79-60% shows 7 units (as specified)
    else if (clampedPercentage >= 50) units = 6;   // 59-50% shows 6 units
    else if (clampedPercentage >= 40) units = 5;   // 49-40% shows 5 units
    else if (clampedPercentage >= 30) units = 4;   // 39-30% shows 4 units
    else if (clampedPercentage >= 20) units = 3;   // 29-20% shows 3 units
    else if (clampedPercentage >= 10) units = 2;   // 19-10% shows 2 units
    else if (clampedPercentage >= 1) units = 1;    // 9-1% shows 1 unit
    else units = 0;                                // 0% and below shows 0 units
    
    // Use custom emoji format for Discord
    const healthEmoji = `<:health:${emojiId}>`;
    const emptyEmoji = '<:empty_health:1402157239220830290>'; // Empty health unit
    
    return healthEmoji.repeat(units) + emptyEmoji.repeat(10 - units);
}

// Generate ki bar visualization
function generateKiBar(kiPercentage, emojiId = '1400943268170301561') {
    const clampedPercentage = Math.max(0, Math.min(120, kiPercentage));
    
    // Calculate units based on exact percentage ranges (same as health bar)
    let units = 0;
    if (clampedPercentage >= 100) units = 10;      // 100%+ shows all 10 units
    else if (clampedPercentage >= 90) units = 9;   // 99-90% shows 9 units
    else if (clampedPercentage >= 80) units = 8;   // 89-80% shows 8 units
    else if (clampedPercentage >= 60) units = 7;   // 79-60% shows 7 units
    else if (clampedPercentage >= 50) units = 6;   // 59-50% shows 6 units
    else if (clampedPercentage >= 40) units = 5;   // 49-40% shows 5 units
    else if (clampedPercentage >= 30) units = 4;   // 39-30% shows 4 units
    else if (clampedPercentage >= 20) units = 3;   // 29-20% shows 3 units
    else if (clampedPercentage >= 10) units = 2;   // 19-10% shows 2 units
    else if (clampedPercentage >= 1) units = 1;    // 9-1% shows 1 unit
    else units = 0;                                // 0% and below shows 0 units
    
    // Use custom emoji format for Discord
    const kiEmoji = `<:ki:${emojiId}>`;
    const emptyEmoji = '<:empty_ki:1402164874154479636>'; // Empty ki unit
    
    return kiEmoji.repeat(units) + emptyEmoji.repeat(10 - units);
}

// Handle Majin Magic racial ability - grants ki and PL for health percentage lost by defender
async function handleMajinMagic(db, characterId, healthPercentageLost, channelId = null) {
    try {
        // Check if character has Majin Magic racial
        const majinRacial = await db.get(
            'SELECT * FROM character_racials WHERE character_id = ? AND racial_tag = ?',
            [characterId, 'mmagic']
        );

        if (!majinRacial) return;

        // Get character data
        const character = await db.get(
            'SELECT * FROM characters WHERE id = ?',
            [characterId]
        );

        if (!character) return;

        // Get current combat state
        let combatState;
        if (channelId) {
            combatState = await db.get(
                'SELECT * FROM combat_state WHERE character_id = ? AND channel_id = ?',
                [characterId, channelId]
            );
        } else {
            // Fallback to any combat state for the character
            combatState = await db.get(
                'SELECT * FROM combat_state WHERE character_id = ? ORDER BY rowid DESC LIMIT 1',
                [characterId]
            );
        }

        // Calculate ki gain (equal to health percentage lost by defender)
        const currentKi = character.current_ki || 0;
        const maxKi = character.endurance || 100;
        const kiGainAmount = Math.max(1, Math.floor(maxKi * (healthPercentageLost / 100)));
        
        // Get current ki cap to respect health limitations
        const kiCap = await calculateKiCap(db, character);
        const newKi = Math.min(kiCap, currentKi + kiGainAmount); // Respect health cap
        
        // Calculate PL bonus (percentage of base PL equal to health percentage lost)
        const currentBonus = combatState?.majin_magic_bonus || 0;
        const maxBonus = Math.floor(character.base_pl * 0.50); // Max 50% of base PL
        const plBonusAmount = Math.max(1, Math.floor(character.base_pl * (healthPercentageLost / 100)));
        
        // Ensure we don't exceed the 50% cap
        const potentialNewBonus = currentBonus + plBonusAmount;
        const actualBonusGain = Math.min(plBonusAmount, maxBonus - currentBonus);
        const newBonus = Math.min(maxBonus, potentialNewBonus);
        
        // Update ki
        await db.run(
            'UPDATE characters SET current_ki = ? WHERE id = ?',
            [newKi, characterId]
        );

        // Update or create combat state for PL bonus
        if (combatState && channelId) {
            await db.run(
                'UPDATE combat_state SET majin_magic_bonus = ? WHERE character_id = ? AND channel_id = ?',
                [newBonus, characterId, channelId]
            );
        } else if (channelId) {
            await db.run(
                'INSERT INTO combat_state (character_id, channel_id, majin_magic_bonus, zenkai_bonus) VALUES (?, ?, ?, ?)',
                [characterId, channelId, newBonus, 0]
            );
        } else if (combatState) {
            // Fallback for when no channel_id is provided
            await db.run(
                'UPDATE combat_state SET majin_magic_bonus = ? WHERE character_id = ?',
                [newBonus, characterId]
            );
        } else {
            // Cannot create without channel_id
            console.warn('Cannot create combat state for Majin Magic without channel_id');
            return;
        }

        const kiPercentageGain = ((kiGainAmount / maxKi) * 100).toFixed(1);
        const plPercentageGain = ((actualBonusGain / character.base_pl) * 100).toFixed(1);
        
        console.log(`Majin Magic activated for character ${characterId}: +${kiPercentageGain}% Ki, +${plPercentageGain}% PL bonus`);

    } catch (error) {
        console.error('Error in handleMajinMagic:', error);
    }
}

// Get combat bonuses from database
async function getCombatBonuses(db, characterId, channelId = null) {
    try {
        let query, params;
        
        if (channelId) {
            // Use specific channel if provided
            query = 'SELECT zenkai_bonus, majin_magic_bonus FROM combat_state WHERE character_id = ? AND channel_id = ?';
            params = [characterId, channelId];
        } else {
            // Fallback to any combat state for the character
            query = 'SELECT zenkai_bonus, majin_magic_bonus FROM combat_state WHERE character_id = ? ORDER BY rowid DESC LIMIT 1';
            params = [characterId];
        }
        
        const combatState = await db.get(query, params);

        return {
            zenkaiBonus: combatState?.zenkai_bonus || 0,
            majinMagicBonus: combatState?.majin_magic_bonus || 0
        };
    } catch (error) {
        console.error('Error getting combat bonuses:', error);
        return { zenkaiBonus: 0, majinMagicBonus: 0 };
    }
}

module.exports = {
    calculateKiLossFromHealth,
    calculateEffectivePL,
    calculateEffectivePLWithRelease,
    calculateMaxAffordableMultiplier,
    calculateMaxHealth,
    calculateMaxHealthForCharacter,
    calculateMaxKi,
    calculateHealthPercentage,
    calculateKiCost,
    calculateKiSpecialCost,
    calculatePhysicalAttack,
    calculateKiAttack,
    calculateAccuracy,
    calculateBlock,
    calculateDodge,
    calculatePhysicalDefense,
    calculateKiDefense,
    rollWithEffort,
    getEffortKiCost,
    calculateBlowback,
    getRacialForRace,
    parseModifier,
    applyModifier,
    hasStaffRole,
    generateHealthBar,
    generateKiBar,
    hasHumanSpirit,
    calculateKiCap,
    enforceKiCap,
    getCurrentKiCap,
    handleMajinMagic,
    getCombatBonuses,
    calculateZenkaiWithHealthMultiplier
};

// Technique Effects Management

// Add a technique effect
async function addTechniqueEffect(database, characterId, channelId, techniqueName, effectType, effectValue, targetCharacterId = null, turnsRemaining = 1) {
    await database.run(`
        INSERT INTO technique_effects (character_id, channel_id, technique_name, effect_type, effect_value, target_character_id, turns_remaining)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [characterId, channelId, techniqueName, effectType, effectValue, targetCharacterId, turnsRemaining]);
}

// Get active technique effects for a character
async function getTechniqueEffects(database, characterId, channelId, effectType = null) {
    let query = `
        SELECT * FROM technique_effects 
        WHERE character_id = ? AND channel_id = ? AND turns_remaining > 0
    `;
    let params = [characterId, channelId];
    
    if (effectType) {
        query += ` AND effect_type = ?`;
        params.push(effectType);
    }
    
    return await database.all(query, params);
}

// Get technique effects targeting a specific character
async function getTechniqueEffectsOnTarget(database, targetCharacterId, channelId, effectType = null) {
    let query = `
        SELECT * FROM technique_effects 
        WHERE target_character_id = ? AND channel_id = ? AND turns_remaining > 0
    `;
    let params = [targetCharacterId, channelId];
    
    if (effectType) {
        query += ` AND effect_type = ?`;
        params.push(effectType);
    }
    
    return await database.all(query, params);
}

// Decrement technique effect turns and remove expired ones
async function decrementTechniqueEffects(database, characterId, channelId) {
    // Decrement turns for all effects of this character
    await database.run(`
        UPDATE technique_effects 
        SET turns_remaining = turns_remaining - 1 
        WHERE character_id = ? AND channel_id = ?
    `, [characterId, channelId]);
    
    // Remove expired effects
    await database.run(`
        DELETE FROM technique_effects 
        WHERE character_id = ? AND channel_id = ? AND turns_remaining <= 0
    `, [characterId, channelId]);
}

// Remove specific technique effect
async function removeTechniqueEffect(database, characterId, channelId, techniqueName) {
    await database.run(`
        DELETE FROM technique_effects 
        WHERE character_id = ? AND channel_id = ? AND technique_name = ?
    `, [characterId, channelId, techniqueName]);
}

// Calculate effective stats with technique bonuses
async function calculateEffectiveStats(database, characterId, channelId, baseStats) {
    const effects = await getTechniqueEffects(database, characterId, channelId);
    
    let effectiveStats = { ...baseStats };
    
    // Ensure all stats exist with default values
    if (!effectiveStats.control) effectiveStats.control = baseStats.control || 0;
    if (!effectiveStats.strength) effectiveStats.strength = baseStats.strength || 0;
    if (!effectiveStats.agility) effectiveStats.agility = baseStats.agility || 0;
    if (!effectiveStats.endurance) effectiveStats.endurance = baseStats.endurance || 0;
    
    for (const effect of effects) {
        switch (effect.effect_type) {
            case 'control_bonus':
                effectiveStats.control = (effectiveStats.control || 0) + parseInt(effect.effect_value);
                break;
            case 'strength_multiplier':
                effectiveStats.strength *= parseFloat(effect.effect_value);
                break;
            case 'agility_multiplier':
                effectiveStats.agility *= parseFloat(effect.effect_value);
                break;
            case 'agility_debuff':
                effectiveStats.agility *= parseFloat(effect.effect_value);
                break;
            // Add more stat modifications as needed
        }
    }
    
    return effectiveStats;
}

// Calculate damage reduction from technique effects
async function calculateTechniqueDamageReduction(database, characterId, channelId) {
    const effects = await getTechniqueEffects(database, characterId, channelId, 'damage_reduction');
    
    let totalReduction = 0;
    for (const effect of effects) {
        totalReduction += parseFloat(effect.effect_value);
    }
    
    return Math.min(totalReduction, 0.8); // Cap at 80% reduction
}

module.exports.addTechniqueEffect = addTechniqueEffect;
module.exports.getTechniqueEffects = getTechniqueEffects;
module.exports.getTechniqueEffectsOnTarget = getTechniqueEffectsOnTarget;
module.exports.decrementTechniqueEffects = decrementTechniqueEffects;
module.exports.removeTechniqueEffect = removeTechniqueEffect;
module.exports.calculateEffectiveStats = calculateEffectiveStats;
module.exports.calculateTechniqueDamageReduction = calculateTechniqueDamageReduction;
