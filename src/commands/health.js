const { EmbedBuilder } = require('discord.js');
const { parseModifier, applyModifier, calculateMaxHealth, generateHealthBar } = require('../utils/calculations');

module.exports = {
    name: 'health',
    description: 'Display or modify character health',
    async execute(message, args, database) {
        let targetUserId = message.author.id;
        let targetUser = message.author;
        let modifierStr = null;

        // Parse arguments - can be !health, !health @user, !health +20, or !health @user +20
        if (args.length === 1) {
            // Check if it's a user mention or a modifier
            if (args[0].startsWith('<@')) {
                // It's a user mention
                const userId = args[0].replace(/[<@!>]/g, '');
                targetUser = await message.client.users.fetch(userId).catch(() => null);
                if (!targetUser) {
                    return message.reply('User not found!');
                }
                targetUserId = targetUser.id;
            } else {
                // It's a modifier for own character
                modifierStr = args[0];
            }
        } else if (args.length === 2) {
            // !health @user +20
            const userId = args[0].replace(/[<@!>]/g, '');
            targetUser = await message.client.users.fetch(userId).catch(() => null);
            if (!targetUser) {
                return message.reply('User not found!');
            }
            targetUserId = targetUser.id;
            modifierStr = args[1];
        }

        try {
            // Get user's active character
            const userData = await database.getUserWithActiveCharacter(targetUserId);
            if (!userData || !userData.active_character_id) {
                const pronoun = targetUserId === message.author.id ? 'You don\'t' : `${targetUser.username} doesn't`;
                return message.reply(`${pronoun} have an active character.`);
            }

            // Calculate max health
            const maxHealth = calculateMaxHealth(userData.base_pl, userData.endurance);
            let currentHealth = userData.current_health;

            // Set default if null
            if (currentHealth === null) {
                currentHealth = maxHealth;
                await database.run(
                    'UPDATE characters SET current_health = ? WHERE id = ?',
                    [currentHealth, userData.active_character_id]
                );
            }

            if (modifierStr) {
                // Modifying health - check if it's a percentage
                const isPercentage = modifierStr.includes('%');
                let value = modifierStr.replace('%', '');
                
                const modifier = parseModifier(value);
                if (!modifier) {
                    return message.reply('Invalid modifier! Use +, -, *, /, or set');
                }

                if (isPercentage) {
                    // Convert percentage to actual health value
                    const percentValue = (modifier.value / 100) * maxHealth;
                    modifier.value = percentValue;
                }

                // Apply the modifier
                const newHealth = Math.floor(applyModifier(currentHealth, modifier));

                // Update database
                await database.run(
                    'UPDATE characters SET current_health = ? WHERE id = ?',
                    [newHealth, userData.active_character_id]
                );

                currentHealth = newHealth;
            }

            // Calculate health percentage
            const healthPercentage = Math.max(0, (currentHealth / maxHealth) * 100);
            const clampedPercentage = Math.max(0, Math.min(120, healthPercentage));

            // Generate health bar
            const healthBar = generateHealthBar(clampedPercentage);

            // Create embed
            const embed = new EmbedBuilder()
                .setColor(currentHealth > 0 ? (healthPercentage >= 50 ? 0x2ecc71 : 0xf39c12) : 0xe74c3c)
                .setTitle(`${userData.name}'s Health`)
                .setDescription(`${healthBar}\n\n**${Math.round(clampedPercentage)}%**\n${currentHealth}/${maxHealth}`)
                .addFields(
                    { name: 'Character', value: userData.name, inline: true },
                    { name: 'Race', value: userData.race, inline: true },
                    { name: 'Owner', value: `<@${targetUserId}>`, inline: true }
                )
                .setTimestamp();

            // Add status indicators
            if (currentHealth > maxHealth) {
                embed.addFields({ name: 'Status', value: '🔋 Overhealed', inline: false });
            } else if (currentHealth <= 0) {
                embed.addFields({ name: 'Status', value: '💀 Critical', inline: false });
            } else if (healthPercentage < 20) {
                embed.addFields({ name: 'Status', value: '⚠️ Low Health', inline: false });
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error managing health:', error);
            await message.reply('An error occurred while managing health.');
        }
    }
};
