const { EmbedBuilder } = require('discord.js');
const { colors, emojis } = require('./config');

/**
 * Check if user has staff role
 */
function hasStaffRole(member, staffRoleName = 'Staff') {
    if (!member || !member.roles) return false;
    return member.roles.cache.some(role => role.name === staffRoleName);
}

/**
 * Create error embed
 */
function createErrorEmbed(message, title = 'Error') {
    return new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle(`❌ ${title}`)
        .setDescription(message)
        .setTimestamp();
}

/**
 * Create success embed
 */
function createSuccessEmbed(message, title = 'Success') {
    return new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle(`✅ ${title}`)
        .setDescription(message)
        .setTimestamp();
}

/**
 * Create info embed
 */
function createInfoEmbed(message, title = 'Information') {
    return new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle(`ℹ️ ${title}`)
        .setDescription(message)
        .setTimestamp();
}

/**
 * Create warning embed
 */
function createWarningEmbed(message, title = 'Warning') {
    return new EmbedBuilder()
        .setColor('#FFFF00')
        .setTitle(`⚠️ ${title}`)
        .setDescription(message)
        .setTimestamp();
}

/**
 * Parse quoted names from command arguments
 */
function parseQuotedName(args) {
    const argString = args.join(' ');
    
    // Check for quoted name
    const quotedMatch = argString.match(/^"([^"]+)"\s*(.*)/);
    if (quotedMatch) {
        return {
            name: quotedMatch[1],
            remainingArgs: quotedMatch[2].trim().split(/\s+/).filter(arg => arg.length > 0)
        };
    }
    
    // No quotes, return first arg as name
    return {
        name: args[0] || '',
        remainingArgs: args.slice(1)
    };
}

/**
 * Validate numeric input
 */
function validateNumber(value, min = -Infinity, max = Infinity) {
    const num = parseFloat(value);
    if (isNaN(num)) return null;
    if (num < min || num > max) return null;
    return num;
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    return Math.floor(num).toLocaleString();
}

/**
 * Create health bar visualization
 */
function createHealthBar(current, max, length = 10) {
    const percentage = Math.max(0, Math.min(100, (current / max) * 100));
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    
    let color = '🟢'; // Green
    if (percentage < 25) color = '🔴'; // Red
    else if (percentage < 50) color = '🟡'; // Yellow
    else if (percentage < 75) color = '🟠'; // Orange
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `${color} ${bar} ${Math.round(percentage)}%`;
}

/**
 * Create ki bar visualization
 */
function createKiBar(current, max, length = 10) {
    const percentage = Math.max(0, Math.min(100, (current / max) * 100));
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `💙 ${bar} ${Math.round(percentage)}%`;
}

/**
 * Create character summary for embeds
 */
function createCharacterSummary(character) {
    const maxHealth = Math.floor((character.endurance * 10) + (character.base_pl * 0.1));
    const maxKi = Math.floor((character.control * 10) + (character.base_pl * 0.05));
    const currentHealth = character.current_health || maxHealth;
    const currentKi = character.current_ki || maxKi;
    
    return {
        name: character.name,
        race: character.race,
        basePL: formatNumber(character.base_pl),
        health: `${formatNumber(currentHealth)}/${formatNumber(maxHealth)}`,
        ki: `${formatNumber(currentKi)}/${formatNumber(maxKi)}`,
        healthBar: createHealthBar(currentHealth, maxHealth),
        kiBar: createKiBar(currentKi, maxKi)
    };
}

module.exports = {
    hasStaffRole,
    createErrorEmbed,
    createSuccessEmbed,
    createInfoEmbed,
    createWarningEmbed,
    parseQuotedName,
    validateNumber,
    formatNumber,
    createHealthBar,
    createKiBar,
    createCharacterSummary
};
