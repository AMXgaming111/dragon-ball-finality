const { racials } = require('./config');

// Calculate ki loss based on health percentage
function calculateKiLossFromHealth(healthPercentage) {
    if (healthPercentage >= 100) return 0;
    
    let totalLoss = 0;
    let remaining = 100 - healthPercentage;
    
    // First 50% (100%-51%): 0.5% debuff per percentage lost
    if (remaining > 0) {
        const firstTier = Math.min(remaining, 49);
        totalLoss += firstTier * 0.5;
        remaining -= firstTier;
    }
    
    // Next 30% (50%-21%): 0.75% debuff per percentage lost
    if (remaining > 0) {
        const secondTier = Math.min(remaining, 30);
        totalLoss += secondTier * 0.75;
        remaining -= secondTier;
    }
    
    // Next 10% (20%-11%): 1% debuff per percentage lost
    if (remaining > 0) {
        const thirdTier = Math.min(remaining, 10);
        totalLoss += thirdTier * 1.0;
        remaining -= thirdTier;
    }
    
    // Last 10% (10%-0%): 1.5% debuff per percentage lost
    if (remaining > 0) {
        const fourthTier = Math.min(remaining, 10);
        totalLoss += fourthTier * 1.5;
    }
    
    return Math.min(totalLoss, 87.5); // Cap at 87.5%
}

// Calculate effective PL based on base PL, ki percentage, and forms
function calculateEffectivePL(basePL, kiPercentage, formMultiplier = 1, hasArcosianResilience = false) {
    const kiDebuff = calculateKiLossFromHealth(kiPercentage);
    const adjustedDebuff = hasArcosianResilience ? kiDebuff / 2 : kiDebuff;
    
    const effectivePL = basePL * formMultiplier;
    return Math.floor(effectivePL * (1 - adjustedDebuff / 100));
}

// Calculate maximum health based on base PL and endurance
function calculateMaxHealth(basePL, endurance, formMultiplier = 1) {
    return Math.floor(basePL * formMultiplier * endurance);
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

// Calculate physical attack damage
function calculatePhysicalAttack(effectivePL, strength, additive = 0) {
    return Math.floor(effectivePL * ((strength + additive) / 10));
}

// Calculate ki attack damage
function calculateKiAttack(effectivePL, multiplier = 1) {
    return Math.floor(effectivePL * 10 * multiplier);
}

// Calculate accuracy/agility roll
function calculateAccuracy(effectivePL, agility, modifier = 0, isMultiplier = false) {
    if (isMultiplier) {
        return Math.floor((effectivePL * (agility / 10)) * modifier);
    } else {
        return Math.floor(effectivePL * ((agility + modifier) / 10));
    }
}

// Calculate block value
function calculateBlock(effectivePL, defense, modifier = 0, isMultiplier = false) {
    if (isMultiplier) {
        return Math.floor((effectivePL * (defense / 10)) * modifier);
    } else {
        return Math.floor(effectivePL * ((defense + modifier) / 10));
    }
}

// Calculate dodge value
function calculateDodge(effectivePL, agility, modifier = 0, isMultiplier = false) {
    if (isMultiplier) {
        return Math.floor((effectivePL * (agility / 10)) * modifier);
    } else {
        return Math.floor(effectivePL * ((agility + modifier) / 10));
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
    
    return Math.floor(baseValue * multiplier);
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
function calculatePhysicalDefense(effectivePL, defense, additive = 0) {
    return Math.floor(effectivePL * ((defense + additive) / 10));
}

// Calculate ki defense (blocking with ki enhancement)
function calculateKiDefense(effectivePL, defense, multiplier = 1) {
    const baseDefense = Math.floor(effectivePL * (defense / 10));
    return Math.floor(baseDefense * multiplier);
}

// Generate health bar visualization
function generateHealthBar(healthPercentage, emojiId = '1400942686495572041') {
    const clampedPercentage = Math.max(0, Math.min(120, healthPercentage));
    
    let units = 0;
    if (clampedPercentage >= 100) units = 5;
    else if (clampedPercentage >= 80) units = 4;
    else if (clampedPercentage >= 50) units = 3;
    else if (clampedPercentage >= 20) units = 2;
    else if (clampedPercentage >= 1) units = 1;
    else units = 0;
    
    // Use custom emoji format for Discord
    const healthEmoji = `<:health:${emojiId}>`;
    const emptyEmoji = '▫️'; // Empty health unit
    
    return healthEmoji.repeat(units) + emptyEmoji.repeat(5 - units);
}

// Generate ki bar visualization
function generateKiBar(kiPercentage, emojiId = '1400943268170301561') {
    const clampedPercentage = Math.max(0, Math.min(120, kiPercentage));
    
    let units = 0;
    if (clampedPercentage >= 100) units = 5;
    else if (clampedPercentage >= 80) units = 4;
    else if (clampedPercentage >= 50) units = 3;
    else if (clampedPercentage >= 20) units = 2;
    else if (clampedPercentage >= 1) units = 1;
    else units = 0;
    
    // Use custom emoji format for Discord
    const kiEmoji = `<:ki:${emojiId}>`;
    const emptyEmoji = '▫️'; // Empty ki unit
    
    return kiEmoji.repeat(units) + emptyEmoji.repeat(5 - units);
}

module.exports = {
    calculateKiLossFromHealth,
    calculateEffectivePL,
    calculateMaxHealth,
    calculateMaxKi,
    calculateHealthPercentage,
    calculateKiCost,
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
    generateKiBar
};
