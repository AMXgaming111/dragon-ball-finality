const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { 
    calculateEffectivePL, 
    calculatePhysicalAttack, 
    calculateKiAttack, 
    calculateAccuracy,
    rollWithEffort,
    getEffortKiCost,
    calculateKiCost,
    calculateBlowback
} = require('../utils/calculations');

module.exports = {
    name: 'attack',
    description: 'Attack another character',
    async execute(message, args, database) {
        if (args.length < 1) {
            return message.reply('Usage: `!attack <@target>` or `!attack <modifiers> <@target>`\nModifiers: `a<multiplier>` (accuracy), `e<effort>` (1-5)');
        }

        // Parse arguments
        let targetMention;
        let accuracyMultiplier = 1;
        let effort = 2; // Default normal effort

        // Find target user mention
        const mentionArg = args.find(arg => arg.startsWith('<@'));
        if (!mentionArg) {
            return message.reply('You must mention a target user!');
        }
        targetMention = mentionArg;

        // Parse modifiers
        args.forEach(arg => {
            if (arg.startsWith('a') && !arg.startsWith('<@')) {
                const mult = parseFloat(arg.slice(1));
                if (!isNaN(mult) && mult > 0) {
                    accuracyMultiplier = mult;
                }
            } else if (arg.startsWith('e')) {
                const eff = parseInt(arg.slice(1));
                if (!isNaN(eff) && eff >= 1 && eff <= 5) {
                    effort = eff;
                }
            }
        });

        // Parse target user
        const targetUserId = targetMention.replace(/[<@!>]/g, '');
        const targetUser = await message.client.users.fetch(targetUserId).catch(() => null);
        if (!targetUser) {
            return message.reply('Target user not found!');
        }

        try {
            // Get attacker's character
            const attackerData = await database.getUserWithActiveCharacter(message.author.id);
            if (!attackerData || !attackerData.active_character_id) {
                return message.reply('You don\'t have an active character.');
            }

            // Get target's character
            const targetData = await database.getUserWithActiveCharacter(targetUserId);
            if (!targetData || !targetData.active_character_id) {
                return message.reply(`${targetUser.username} doesn't have an active character.`);
            }

            // Calculate attacker's effective PL and stats
            const attackerKiPercentage = attackerData.current_ki ? (attackerData.current_ki / attackerData.endurance) * 100 : 100;
            const attackerEffectivePL = calculateEffectivePL(attackerData.base_pl, attackerKiPercentage);

            // Create attack type selection embed
            const embed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('🥊 How would you like to attack?')
                .setDescription(`**${attackerData.name}** is attacking **${targetData.name}**`)
                .addFields(
                    { name: 'Attacker', value: `${attackerData.name} (PL: ${attackerEffectivePL})`, inline: true },
                    { name: 'Target', value: `${targetData.name}`, inline: true },
                    { name: 'Effort Level', value: `${effort}/5`, inline: true }
                );

            if (accuracyMultiplier !== 1) {
                embed.addFields({ name: 'Accuracy Modifier', value: `×${accuracyMultiplier}`, inline: true });
            }

            const physicalButton = new ButtonBuilder()
                .setCustomId('attack_physical')
                .setLabel('Physical')
                .setStyle(ButtonStyle.Secondary);

            const kiButton = new ButtonBuilder()
                .setCustomId('attack_ki')
                .setLabel('Ki')
                .setStyle(ButtonStyle.Primary);

            const magicButton = new ButtonBuilder()
                .setCustomId('attack_magic')
                .setLabel('Magic')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder()
                .addComponents(physicalButton, kiButton, magicButton);

            const response = await message.reply({
                embeds: [embed],
                components: [row]
            });

            // Handle button interactions
            const collector = response.createMessageComponentCollector({ 
                time: 60000 
            });

            collector.on('collect', async (interaction) => {
                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({ 
                        content: 'Only the attacker can choose the attack type.', 
                        ephemeral: true 
                    });
                }

                let attackType = interaction.customId.split('_')[1];
                
                // For now, we'll implement physical and ki attacks
                if (attackType === 'magic') {
                    return interaction.reply({
                        content: 'Magic attacks are not fully implemented yet.',
                        ephemeral: true
                    });
                }

                if (attackType === 'physical') {
                    await handlePhysicalAttack(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database);
                } else if (attackType === 'ki') {
                    await handleKiAttack(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database);
                }
            });

            collector.on('end', async (collected) => {
                if (collected.size === 0) {
                    try {
                        await response.edit({ 
                            components: [], 
                            content: 'Attack timed out.' 
                        });
                    } catch (error) {
                        // Message might have been deleted
                    }
                }
            });

        } catch (error) {
            console.error('Error in attack command:', error);
            await message.reply('An error occurred while processing the attack.');
        }
    }
};

async function handlePhysicalAttack(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database) {
    const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('💪 Physical Attack')
        .setDescription('Please type your additive (or 0 for basic attack):');

    await interaction.update({ embeds: [embed], components: [] });

    // Wait for user input
    const filter = (msg) => msg.author.id === interaction.user.id;
    const collected = await interaction.channel.awaitMessages({ 
        filter, 
        max: 1, 
        time: 30000 
    });

    if (collected.size === 0) {
        return interaction.followUp('Attack timed out.');
    }

    const additiveInput = collected.first().content;
    const additive = parseFloat(additiveInput) || 0;

    // Calculate damage and accuracy
    const baseDamage = calculatePhysicalAttack(attackerEffectivePL, attackerData.strength, additive);
    const baseAccuracy = calculateAccuracy(attackerEffectivePL, attackerData.agility, 0, false);
    
    // Apply effort and accuracy multiplier
    const damage = rollWithEffort(baseDamage, effort);
    const accuracy = rollWithEffort(baseAccuracy * accuracyMultiplier, effort);

    // Apply effort ki cost/gain
    const effortKiCost = getEffortKiCost(effort);
    let kiChange = 0;

    if (additive === 0 && accuracyMultiplier === 1) {
        // Basic attack - gain 5% ki
        kiChange = Math.floor(attackerData.endurance * 0.05);
    } else {
        // Modified attack - apply effort cost
        if (effortKiCost > 0) {
            kiChange = -Math.floor(attackerData.endurance * (effortKiCost / 100));
        } else if (effortKiCost < 0) {
            kiChange = Math.floor(attackerData.endurance * (Math.abs(effortKiCost) / 100));
        }
    }

    // Update attacker's ki
    if (kiChange !== 0) {
        const newKi = Math.max(0, (attackerData.current_ki || attackerData.endurance) + kiChange);
        await database.run(
            'UPDATE characters SET current_ki = ? WHERE id = ?',
            [newKi, attackerData.active_character_id]
        );
    }

    // Create result embed
    const resultEmbed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('💥 Physical Attack Result')
        .setDescription(`**${attackerData.name}** has attacked **${targetData.name}** for **${damage}** damage!`)
        .addFields(
            { name: 'Accuracy', value: accuracy.toString(), inline: true },
            { name: 'Damage', value: damage.toString(), inline: true },
            { name: 'Attack Type', value: additive === 0 ? 'Basic' : 'Enhanced', inline: true }
        );

    if (kiChange !== 0) {
        resultEmbed.addFields({ 
            name: 'Ki Change', 
            value: `${kiChange > 0 ? '+' : ''}${kiChange}`, 
            inline: true 
        });
    }

    await interaction.followUp({ embeds: [resultEmbed] });
    
    // Delete the user's additive input message
    try {
        await collected.first().delete();
    } catch (error) {
        // Might not have permission to delete
    }
}

async function handleKiAttack(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database) {
    const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('⚡ Ki Attack')
        .setDescription('Please type your multiplier (minimum 1.1):');

    await interaction.update({ embeds: [embed], components: [] });

    // Wait for user input
    const filter = (msg) => msg.author.id === interaction.user.id;
    const collected = await interaction.channel.awaitMessages({ 
        filter, 
        max: 1, 
        time: 30000 
    });

    if (collected.size === 0) {
        return interaction.followUp('Attack timed out.');
    }

    const multiplierInput = collected.first().content;
    const multiplier = parseFloat(multiplierInput);

    if (isNaN(multiplier) || multiplier < 1.1) {
        return interaction.followUp('Multiplier must be at least 1.1!');
    }

    // Calculate ki cost
    const baseCost = Math.floor((multiplier - 1) * 10); // 1 ki per 0.1 multiplier
    const kiCost = calculateKiCost(baseCost, attackerData.control);
    
    // Check if attacker has enough ki
    const currentKi = attackerData.current_ki || attackerData.endurance;
    if (currentKi < kiCost) {
        return interaction.followUp(`Not enough ki! Need ${kiCost}, have ${currentKi}.`);
    }

    // Calculate damage and accuracy
    const baseDamage = calculateKiAttack(attackerEffectivePL, multiplier);
    const baseAccuracy = calculateAccuracy(attackerEffectivePL, attackerData.agility, 0, false);
    
    // Apply effort
    const damage = rollWithEffort(baseDamage, effort);
    const accuracy = rollWithEffort(baseAccuracy * accuracyMultiplier, effort);

    // Calculate total ki cost with effort
    const effortKiCost = getEffortKiCost(effort);
    let totalKiCost = kiCost;
    if (effortKiCost > 0) {
        totalKiCost += Math.floor(attackerData.endurance * (effortKiCost / 100));
    }

    // Calculate blowback damage
    const kiPercentageUsed = (totalKiCost / attackerData.endurance) * 100;
    const blowbackDamage = calculateBlowback(damage, kiPercentageUsed);

    // Update attacker's ki and potentially health
    const newKi = Math.max(0, currentKi - totalKiCost);
    await database.run(
        'UPDATE characters SET current_ki = ? WHERE id = ?',
        [newKi, attackerData.active_character_id]
    );

    if (blowbackDamage > 0) {
        const maxHealth = attackerData.base_pl * attackerData.endurance;
        const currentHealth = attackerData.current_health || maxHealth;
        const newHealth = currentHealth - blowbackDamage;
        
        await database.run(
            'UPDATE characters SET current_health = ? WHERE id = ?',
            [newHealth, attackerData.active_character_id]
        );
    }

    // Create result embed
    const resultEmbed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('⚡ Ki Attack Result')
        .setDescription(`**${attackerData.name}** has attacked **${targetData.name}** for **${damage}** damage!`)
        .addFields(
            { name: 'Accuracy', value: accuracy.toString(), inline: true },
            { name: 'Damage', value: damage.toString(), inline: true },
            { name: 'Multiplier', value: `${multiplier}x`, inline: true },
            { name: 'Ki Cost', value: totalKiCost.toString(), inline: true }
        );

    if (blowbackDamage > 0) {
        resultEmbed.addFields({ 
            name: 'Blowback Damage', 
            value: blowbackDamage.toString(), 
            inline: true 
        });
    }

    await interaction.followUp({ embeds: [resultEmbed] });
    
    // Delete the user's multiplier input message
    try {
        await collected.first().delete();
    } catch (error) {
        // Might not have permission to delete
    }
}
