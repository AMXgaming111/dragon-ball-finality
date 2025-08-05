const { EmbedBuilder } = require('discord.js');
const { parseModifier, applyModifier, calculateMaxKi, calculateHealthPercentage, generateKiBar } = require('../utils/calculations');

module.exports = {
    name: 'ki',
    description: 'Display or modify character ki',
    async execute(message, args, database) {
        let targetUserId = message.author.id;
        let targetUser = message.author;
        let modifierStr = null;

        // Parse arguments - can be !ki, !ki @user, !ki +20, or !ki @user +20
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
            // !ki @user +20
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

            // Calculate max ki and health percentage
            const maxKi = calculateMaxKi(userData.endurance);
            const maxHealth = userData.base_pl * userData.endurance;
            let currentHealth = userData.current_health;
            let currentKi = userData.current_ki;

            // Set defaults if null
            if (currentHealth === null) {
                currentHealth = maxHealth;
                await database.run(
                    'UPDATE characters SET current_health = ? WHERE id = ?',
                    [currentHealth, userData.active_character_id]
                );
            }

            if (currentKi === null) {
                currentKi = maxKi;
                await database.run(
                    'UPDATE characters SET current_ki = ? WHERE id = ?',
                    [currentKi, userData.active_character_id]
                );
            }

            // Calculate health percentage to determine ki cap
            const healthPercentage = calculateHealthPercentage(currentHealth, maxHealth);
            const kiCap = Math.floor(maxKi * (healthPercentage / 100));

            if (modifierStr) {
                // Modifying ki - check if it's a percentage
                const isPercentage = modifierStr.includes('%');
                let value = modifierStr.replace('%', '');
                
                const modifier = parseModifier(value);
                if (!modifier) {
                    return message.reply('Invalid modifier! Use +, -, *, /, or set');
                }

                if (isPercentage) {
                    // Convert percentage to actual ki value based on current cap
                    const percentValue = (modifier.value / 100) * kiCap;
                    modifier.value = percentValue;
                }

                // Apply the modifier
                let newKi = Math.floor(applyModifier(currentKi, modifier));
                
                // Cap ki at the health-based maximum unless setting above
                if (modifier.type !== 'set' || newKi <= kiCap) {
                    newKi = Math.min(newKi, kiCap);
                }

                // Update database
                await database.run(
                    'UPDATE characters SET current_ki = ? WHERE id = ?',
                    [newKi, userData.active_character_id]
                );

                currentKi = newKi;
            }

            // Calculate ki percentage
            const kiPercentage = Math.max(0, (currentKi / maxKi) * 100);
            const clampedPercentage = Math.max(0, Math.min(120, kiPercentage));

            // Generate ki bar with custom emoji
            const kiBar = generateKiBar(clampedPercentage);

            // Create embed
            const embed = new EmbedBuilder()
                .setColor(currentKi > 0 ? (kiPercentage >= 50 ? 0x3498db : 0xf39c12) : 0x95a5a6)
                .setTitle(`${userData.name}'s Ki`)
                .setDescription(`${kiBar}\n\n**${Math.round(clampedPercentage)}%**\n${currentKi}/${maxKi}`)
                .addFields(
                    { name: 'Character', value: userData.name, inline: true },
                    { name: 'Current Cap', value: `${kiCap}/${maxKi}`, inline: true },
                    { name: 'Health %', value: `${Math.round(healthPercentage)}%`, inline: true }
                )
                .setTimestamp();

            // Add status indicators
            if (currentKi > kiCap) {
                embed.addFields({ name: 'Status', value: '⚡ Above Cap', inline: false });
            } else if (currentKi <= 0) {
                embed.addFields({ name: 'Status', value: '😵 Exhausted', inline: false });
            } else if (kiPercentage < 20) {
                embed.addFields({ name: 'Status', value: '⚠️ Low Ki', inline: false });
            }

            // Add explanation about ki cap
            if (healthPercentage < 100) {
                embed.setFooter({ text: 'Ki cap is reduced based on health percentage' });
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error managing ki:', error);
            await message.reply('An error occurred while managing ki.');
        }
    }
};
