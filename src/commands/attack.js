const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { 
    calculateEffectivePL,
    calculateEffectivePLWithRelease,
    calculateMaxAffordableMultiplier,
    calculatePhysicalAttack, 
    calculateKiAttack, 
    calculateAccuracy,
    rollWithEffort,
    getEffortKiCost,
    calculateKiSpecialCost,
    calculateBlowback,
    getCombatBonuses,
    getCurrentKiCap
} = require('../utils/calculations');
const { storePendingAttack, cleanupExpiredAttacks } = require('../utils/combat');
const { autoManageTurnOrder } = require('../../helper_functions');

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
            // Clean up expired attacks
            await cleanupExpiredAttacks(database);
            
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

            // Auto-manage turn order (create or add participants as needed)
            const turnOrderResult = await autoManageTurnOrder(
                message.channel.id, 
                message.author.id, 
                targetUserId, 
                message.client, 
                database
            );
            
            if (!turnOrderResult.success) {
                return message.reply(turnOrderResult.message);
            }
            
            if (turnOrderResult.message) {
                await message.channel.send(turnOrderResult.message);
            }

            // Calculate attacker's effective PL and stats
            const attackerKiPercentage = attackerData.current_ki ? (attackerData.current_ki / attackerData.endurance) * 100 : 100;
            
            // Check for Arcosian Resilience racial
            const hasArcosianResilience = await database.get(`
                SELECT is_active FROM character_racials 
                WHERE character_id = ? AND racial_tag = 'aresist' AND is_active = 1
            `, [attackerData.active_character_id]);
            
            // Get combat bonuses (Zenkai and Majin Magic)
            const combatBonuses = await getCombatBonuses(database, attackerData.active_character_id, message.channel.id);
            
            const attackerEffectivePL = await calculateEffectivePLWithRelease(
                database,
                attackerData.active_character_id,
                attackerData.base_pl, 
                attackerKiPercentage, 
                1, 
                !!hasArcosianResilience,
                combatBonuses.zenkaiBonus,
                combatBonuses.majinMagicBonus
            );

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
    // Check for Namekian Giant Form bonus for max additive calculation
    let effectiveStrength = attackerData.strength;
    const giantForm = await database.get(`
        SELECT is_active FROM character_racials 
        WHERE character_id = ? AND racial_tag = 'ngiant' AND is_active = 1
    `, [attackerData.active_character_id]);
    
    if (giantForm) {
        effectiveStrength += 40; // Giant form grants +40 strength
    }
    
    const maxAdditive = ((effectiveStrength + attackerData.endurance + attackerData.control) / 6).toFixed(2);
    const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('💪 Physical Attack')
        .setDescription('Please type your additive (or 0 for basic attack):')
        .addFields({ name: 'Max Additive', value: `Your maximum additive is **${maxAdditive}**`, inline: false });    await interaction.update({ embeds: [embed], components: [] });

    // Wait for user input
    const filter = (msg) => msg.author.id === interaction.user.id;
    const collected = await interaction.channel.awaitMessages({ 
        filter, 
        max: 1, 
        time: 30000 
    });

    if (collected.size === 0) {
        const timeoutEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('⏰ Attack Timed Out')
            .setDescription('Attack timed out.');
        return interaction.editReply({ embeds: [timeoutEmbed], components: [] });
    }

    const additiveInput = collected.first().content;
    const additive = parseFloat(additiveInput) || 0;

    // Calculate damage and accuracy
    const baseDamage = await calculatePhysicalAttack(attackerEffectivePL, attackerData.strength, additive, database, attackerData.active_character_id);
    const baseAccuracy = calculateAccuracy(attackerEffectivePL, attackerData.agility, 0, false);
    
    // Apply effort and accuracy multiplier
    const damage = rollWithEffort(baseDamage, effort);
    const accuracy = rollWithEffort(baseAccuracy * accuracyMultiplier, effort);

    // Apply ki costs and gains
    const effortKiCost = getEffortKiCost(effort);
    let kiChange = 0;

    if (additive === 0 && accuracyMultiplier === 1) {
        // Basic attack - gain 5% ki (but still apply effort cost if any)
        kiChange = Math.floor(attackerData.endurance * 0.05);
        if (effortKiCost > 0) {
            kiChange -= Math.floor(attackerData.endurance * (effortKiCost / 100));
        } else if (effortKiCost < 0) {
            kiChange += Math.floor(attackerData.endurance * (Math.abs(effortKiCost) / 100));
        }
    } else {
        // Modified attack - calculate ki costs
        
        // Apply accuracy multiplier ki cost if used
        if (accuracyMultiplier > 1) {
            const accuracyKiCost = calculateKiSpecialCost(accuracyMultiplier, attackerData.control);
            kiChange -= accuracyKiCost;
        }
        
        // Apply effort ki cost/gain
        if (effortKiCost > 0) {
            kiChange -= Math.floor(attackerData.endurance * (effortKiCost / 100));
        } else if (effortKiCost < 0) {
            kiChange += Math.floor(attackerData.endurance * (Math.abs(effortKiCost) / 100));
        }
        
        // Check if attacker has enough ki for the costs
        const currentKi = attackerData.current_ki || attackerData.endurance;
        const totalKiCost = Math.abs(Math.min(0, kiChange)); // Get the total cost (negative changes)
        if (totalKiCost > currentKi) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ Insufficient Ki')
                .setDescription(`Not enough ki! Need ${totalKiCost}, have ${currentKi}.`);
            return interaction.editReply({ embeds: [errorEmbed], components: [] });
        }
    }

    // Update attacker's ki
    if (kiChange !== 0) {
        const currentKi = attackerData.current_ki || attackerData.endurance;
        let newKi = Math.max(0, currentKi + kiChange);
        
        // For basic attacks, respect health cap
        if (additive === 0 && accuracyMultiplier === 1 && kiChange > 0) {
            const kiCap = await getCurrentKiCap(database, attackerData.active_character_id);
            newKi = Math.min(kiCap, newKi);
        }
        
        await database.run(
            'UPDATE characters SET current_ki = ? WHERE id = ?',
            [newKi, attackerData.active_character_id]
        );
    }

    // Get attacker's username for mention
    const attackerUser = await interaction.client.users.fetch(attackerData.owner_id);

    // Create final result embed
    const resultEmbed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('💥 Physical Attack Launched')
        .setDescription(`**${attackerData.name}** launched a physical attack against **${targetData.name}**!\n\n*${targetData.name} must use \`!defend @${attackerUser.username}\` to respond!*`)
        .addFields(
            { name: 'Attack Damage', value: damage.toString(), inline: true },
            { name: 'Accuracy', value: accuracy.toString(), inline: true },
            { name: 'Attack Type', value: additive === 0 ? 'Basic' : 'Enhanced', inline: true }
        )
        .setFooter({ text: 'Target must defend within 5 minutes or take full damage!' });

    if (kiChange !== 0) {
        resultEmbed.addFields({ 
            name: 'Ki Change', 
            value: `${kiChange > 0 ? '+' : ''}${kiChange}`, 
            inline: true 
        });
    }

    // Add turn management footer and buttons
    resultEmbed.setFooter({ text: 'Would you like to end your turn?' });
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

    // Store the pending attack
    const attackData = {
        additive: additive,
        effort: effort,
        accuracyMultiplier: accuracyMultiplier,
        isBasic: additive === 0 && accuracyMultiplier === 1
    };
    
    await storePendingAttack(
        database,
        interaction.channel.id,
        interaction.user.id,
        targetData.owner_id,
        attackerData.active_character_id,
        targetData.active_character_id,
        'physical',
        damage,
        accuracy,
        attackData
    );

    // Edit the original message with the final result
    const attackMessage = await interaction.editReply({ embeds: [resultEmbed], components: [turnRow] });
    
    // Handle turn management button interaction
    const turnFilter = (buttonInteraction) => {
        return (buttonInteraction.customId === 'end_turn_yes' || buttonInteraction.customId === 'end_turn_no') && 
               buttonInteraction.user.id === interaction.user.id;
    };

    try {
        const turnInteraction = await attackMessage.awaitMessageComponent({ 
            filter: turnFilter, 
            time: 60000 
        });

        if (turnInteraction.customId === 'end_turn_yes') {
            const { advanceTurnFromInteraction } = require('../../helper_functions');
            await advanceTurnFromInteraction(turnInteraction, database);
        } else {
            // User chose not to end turn
            await turnInteraction.update({ 
                embeds: [resultEmbed], 
                components: [] 
            });
        }
    } catch (error) {
        // Timeout or error - remove buttons
        try {
            await interaction.editReply({ embeds: [resultEmbed], components: [] });
        } catch (e) {
            // Ignore edit errors
        }
    }
    
    // Delete the user's additive input message
    try {
        await collected.first().delete();
    } catch (error) {
        // Might not have permission to delete
    }
}

async function handleKiAttack(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database) {
    // Calculate maximum affordable multiplier
    const attackerCurrentKi = attackerData.current_ki || attackerData.endurance;
    const maxMultiplier = calculateMaxAffordableMultiplier(attackerCurrentKi, attackerData.control, effort, accuracyMultiplier, attackerData.endurance);
    
    // Check if any multipliers are affordable
    if (maxMultiplier === 0) {
        const errorEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('❌ Insufficient Ki')
            .setDescription('You don\'t have enough ki to perform any ki attacks with the current effort level and modifiers!')
            .addFields(
                { name: 'Current Ki', value: attackerCurrentKi.toString(), inline: true },
                { name: 'Effort Level', value: `${effort}/5`, inline: true },
                { name: 'Suggestion', value: 'Try lowering your effort level or use a physical attack instead.', inline: false }
            );
        return interaction.update({ embeds: [errorEmbed], components: [] });
    }
    
    const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('⚡ Ki Attack')
        .setDescription('Please type your multiplier (minimum 1.5, intervals of 0.5):\nExamples: 1.5, 2.0, 2.5, 3.0, etc.')
        .addFields({ name: 'Max Affordable Multiplier', value: `With your current ki, you can afford up to **${maxMultiplier}x**`, inline: false });

    await interaction.update({ embeds: [embed], components: [] });

    // Wait for user input
    const filter = (msg) => msg.author.id === interaction.user.id;
    const collected = await interaction.channel.awaitMessages({ 
        filter, 
        max: 1, 
        time: 30000 
    });

    if (collected.size === 0) {
        const timeoutEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('⏰ Attack Timed Out')
            .setDescription('Attack timed out.');
        return interaction.editReply({ embeds: [timeoutEmbed], components: [] });
    }

    const multiplierInput = collected.first().content;
    const multiplier = parseFloat(multiplierInput);

    // Validate multiplier
    if (isNaN(multiplier) || multiplier < 1.5) {
        const errorEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('❌ Invalid Multiplier')
            .setDescription('Multiplier must be at least 1.5!');
        return interaction.editReply({ embeds: [errorEmbed], components: [] });
    }

    // Check if multiplier is in valid 0.5 intervals
    const remainder = (multiplier - 1.0) % 0.5;
    if (Math.abs(remainder) > 0.001) { // Small tolerance for floating point precision
        const errorEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('❌ Invalid Interval')
            .setDescription('Multiplier must be in 0.5 intervals! (e.g., 1.5, 2.0, 2.5, 3.0, etc.)');
        return interaction.editReply({ embeds: [errorEmbed], components: [] });
    }

    // Calculate ki cost using new system
    const kiCost = calculateKiSpecialCost(multiplier, attackerData.control);
    const currentKi = attackerData.current_ki || attackerData.endurance;

    // Calculate damage and accuracy
    const baseDamage = calculateKiAttack(attackerEffectivePL, multiplier);
    const baseAccuracy = calculateAccuracy(attackerEffectivePL, attackerData.agility, 0, false);
    
    // Apply effort
    const damage = rollWithEffort(baseDamage, effort);
    const accuracy = rollWithEffort(baseAccuracy * accuracyMultiplier, effort);

    // Calculate total ki cost with effort and accuracy multiplier
    const effortKiCost = getEffortKiCost(effort);
    let totalKiCost = kiCost;
    
    // Add accuracy multiplier ki cost if used
    if (accuracyMultiplier > 1) {
        const accuracyKiCost = calculateKiSpecialCost(accuracyMultiplier, attackerData.control);
        totalKiCost += accuracyKiCost;
    }
    
    // Add effort ki cost
    if (effortKiCost > 0) {
        totalKiCost += Math.floor(attackerData.endurance * (effortKiCost / 100));
    }
    
    // Check if attacker has enough ki for all costs
    if (totalKiCost > currentKi) {
        const errorEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('❌ Insufficient Ki')
            .setDescription(`Not enough ki! Need ${totalKiCost}, have ${currentKi}.`);
        return interaction.editReply({ embeds: [errorEmbed], components: [] });
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
        
        // Update ki cap based on new health percentage - automatically enforce cap
        const { enforceKiCap } = require('../utils/calculations');
        await enforceKiCap(database, attackerData.active_character_id);
    }

    // Get attacker's username for mention
    const attackerUser = await interaction.client.users.fetch(attackerData.owner_id);

    // Create final result embed
    const resultEmbed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('⚡ Ki Attack Launched')
        .setDescription(`**${attackerData.name}** launched a ki attack against **${targetData.name}**!\n\n*${targetData.name} must use \`!defend @${attackerUser.username}\` to respond!*`)
        .addFields(
            { name: 'Attack Damage', value: damage.toString(), inline: true },
            { name: 'Accuracy', value: accuracy.toString(), inline: true },
            { name: 'Multiplier', value: `${multiplier}x`, inline: true },
            { name: 'Ki Cost', value: totalKiCost.toString(), inline: true }
        )
        .setFooter({ text: 'Target must defend within 5 minutes or take full damage!' });

    if (blowbackDamage > 0) {
        resultEmbed.addFields({ 
            name: 'Blowback Damage', 
            value: blowbackDamage.toString(), 
            inline: true 
        });
    }

    // Add turn management footer and buttons
    resultEmbed.setFooter({ text: 'Would you like to end your turn?' });
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

    // Store the pending attack
    const attackData = {
        multiplier: multiplier,
        effort: effort,
        accuracyMultiplier: accuracyMultiplier,
        totalKiCost: totalKiCost,
        blowbackDamage: blowbackDamage
    };
    
    await storePendingAttack(
        database,
        interaction.channel.id,
        interaction.user.id,
        targetData.owner_id,
        attackerData.active_character_id,
        targetData.active_character_id,
        'ki',
        damage,
        accuracy,
        attackData
    );

    // Edit the original message with the final result
    const attackMessage = await interaction.editReply({ embeds: [resultEmbed], components: [turnRow] });
    
    // Handle turn management button interaction
    const turnFilter = (buttonInteraction) => {
        return (buttonInteraction.customId === 'end_turn_yes' || buttonInteraction.customId === 'end_turn_no') && 
               buttonInteraction.user.id === interaction.user.id;
    };

    try {
        const turnInteraction = await attackMessage.awaitMessageComponent({ 
            filter: turnFilter, 
            time: 60000 
        });

        if (turnInteraction.customId === 'end_turn_yes') {
            const { advanceTurnFromInteraction } = require('../../helper_functions');
            await advanceTurnFromInteraction(turnInteraction, database);
        } else {
            // User chose not to end turn
            await turnInteraction.update({ 
                embeds: [resultEmbed], 
                components: [] 
            });
        }
    } catch (error) {
        // Timeout or error - remove buttons
        try {
            await interaction.editReply({ embeds: [resultEmbed], components: [] });
        } catch (e) {
            // Ignore edit errors
        }
    }
    
    // Delete the user's multiplier input message
    try {
        await collected.first().delete();
    } catch (error) {
        // Might not have permission to delete
    }
}
