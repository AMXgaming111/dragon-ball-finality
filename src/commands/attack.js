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
    getCurrentKiCap,
    calculateMaxHealthForCharacter,
    addTechniqueEffect,
    getTechniqueEffects,
    calculateEffectiveStats
} = require('../utils/calculations');
const { storePendingAttack, cleanupExpiredAttacks, addKiDisplay } = require('../utils/combat');
const { autoManageTurnOrder } = require('../../helper_functions');

module.exports = {
    name: 'attack',
    description: 'Attack another character',
    async execute(message, args, database) {
        if (args.length < 1) {
            return message.reply('Usage: `!attack <@target>` or `!attack <modifiers> <@target>`\nModifiers: `a<multiplier>` (accuracy), `e<effort>` (1-5)\nAttack modifiers: Use `+<number>` for additive (physical), `*<number>` for multiplier (ki)');
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
                    await handleMagicAttack(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database);
                    return;
                }

                if (attackType === 'physical') {
                    await handlePhysicalAttack(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database);
                } else if (attackType === 'ki') {
                    await handleKiAttack(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database);
                } else if (attackType === 'magic') {
                    await handleMagicAttack(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database);
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
        .setTitle('💪 Physical Combat')
        .setDescription('How would you like to proceed?')
        .addFields({ name: 'Max Additive', value: `Your maximum additive is **+${maxAdditive}**`, inline: false });

    const attackButton = new ButtonBuilder()
        .setCustomId('physical_attack')
        .setLabel('Attack')
        .setStyle(ButtonStyle.Primary);

    const techniqueButton = new ButtonBuilder()
        .setCustomId('physical_technique')
        .setLabel('Technique')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder()
        .addComponents(attackButton, techniqueButton);

    await interaction.update({ embeds: [embed], components: [row] });

    // Handle button interactions
    const collector = interaction.message.createMessageComponentCollector({ 
        time: 60000 
    });

    collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
            return buttonInteraction.reply({ 
                content: 'Only the attacker can choose the action type.', 
                ephemeral: true 
            });
        }

        if (buttonInteraction.customId === 'physical_attack') {
            await handleBasicPhysicalAttack(buttonInteraction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database, maxAdditive);
        } else if (buttonInteraction.customId === 'physical_technique') {
            await handleTechniqueSelection(buttonInteraction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database);
        }
    });

    collector.on('end', async (collected) => {
        if (collected.size === 0) {
            try {
                await interaction.editReply({ 
                    components: [], 
                    content: 'Combat action timed out.' 
                });
            } catch (error) {
                // Message might have been deleted
            }
        }
    });
}

async function handleBasicPhysicalAttack(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database, maxAdditive) {
    const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('💪 Physical Attack')
        .setDescription('How would you like to modify your physical attack?\n(Use `+<number>` for additive, or `0` for basic):')
        .addFields({ name: 'Max Additive', value: `Your maximum additive is **+${maxAdditive}**`, inline: false });    await interaction.update({ embeds: [embed], components: [] });

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
    let additive = 0;
    let isBasic = false;

    // Parse modifier using standardized system
    if (additiveInput.startsWith('+')) {
        const add = parseFloat(additiveInput.slice(1));
        if (!isNaN(add) && add > 0) {
            additive = add;
        } else {
            isBasic = true;
        }
    } else if (additiveInput.startsWith('*')) {
        const errorEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('❌ Invalid Modifier Type')
            .setDescription('Physical attacks only support additive modifiers! Use `+<number>` for additive or `0` for basic.');
        return interaction.editReply({ embeds: [errorEmbed], components: [] });
    } else if (additiveInput === '0') {
        isBasic = true;
    } else {
        isBasic = true; // Default to basic for any other input
    }

    // Calculate damage and accuracy
    const baseDamage = await calculatePhysicalAttack(attackerEffectivePL, attackerData.strength, additive, database, attackerData.active_character_id);
    const baseAccuracy = calculateAccuracy(attackerEffectivePL, attackerData.agility, 0, false);
    
    // Apply effort and accuracy multiplier
    const damage = rollWithEffort(baseDamage, effort);
    const accuracy = rollWithEffort(baseAccuracy * accuracyMultiplier, effort);

    // Apply ki costs and gains
    const effortKiCost = getEffortKiCost(effort);
    let kiChange = 0;

    if ((additive === 0 || isBasic) && accuracyMultiplier === 1) {
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
    let finalKi = attackerData.current_ki || attackerData.endurance;
    if (kiChange !== 0) {
        const currentKi = attackerData.current_ki || attackerData.endurance;
        let newKi = Math.max(0, currentKi + kiChange);
        
        // For basic attacks, respect health cap
        if ((additive === 0 || isBasic) && accuracyMultiplier === 1 && kiChange > 0) {
            const kiCap = await getCurrentKiCap(database, attackerData.active_character_id);
            newKi = Math.min(kiCap, newKi);
        }
        
        await database.run(
            'UPDATE characters SET current_ki = ? WHERE id = ?',
            [newKi, attackerData.active_character_id]
        );
        finalKi = newKi;
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
            { name: 'Attack Type', value: isBasic ? 'Basic' : `+${additive}`, inline: true }
        )
        .setFooter({ text: 'Target must defend within 5 minutes or take full damage!' });

    if (kiChange !== 0) {
        resultEmbed.addFields({ 
            name: 'Ki Change', 
            value: `${kiChange > 0 ? '+' : ''}${kiChange}`, 
            inline: true 
        });
        
        // Add ki bar display
        addKiDisplay(resultEmbed, attackerData.name, finalKi, attackerData.endurance);
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
        isBasic: isBasic || additive === 0
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

async function handleTechniqueSelection(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database) {
    const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('⚡ Common Techniques')
        .setDescription('Select a technique to use:\n\n' +
            '**Clear Mind** (`cmind`) - +30 Control until end of next turn\n' +
            '**Guard** (`guard`) - 20% damage reduction until next turn\n' +
            '**Heavy Blow** (`hblow`) - Enemy gets -20% agility if damaged\n' +
            '**Feint** (`feint`) - Enemy dodge rolls get -0.5x penalty\n' +
            '**Weakpoint** (`wpoint`) - 7% max health damage if not fully defended (4 ki)\n' +
            '**Double Strike** (`dstrike`) - Roll twice, add together (4 ki)\n' +
            '**Counter** (`counter`) - Unblockable/undodgeable vs last attacker (4 ki)\n' +
            '**Chokehold** (`chold`) - Enemy loses 8% ki if damaged (4 ki)\n' +
            '**Grab** (`grab`) - Force strength vs dodge attempts (4 ki)')
        .setFooter({ text: 'Type the technique key (e.g., "cmind" for Clear Mind)' });

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
            .setTitle('⏰ Technique Selection Timed Out')
            .setDescription('Technique selection timed out.');
        return interaction.editReply({ embeds: [timeoutEmbed], components: [] });
    }

    const techniqueKey = collected.first().content.toLowerCase();
    
    // Delete the user's input message
    try {
        await collected.first().delete();
    } catch (error) {
        // Might not have permission to delete
    }

    // Handle technique based on key
    switch (techniqueKey) {
        case 'cmind':
            await handleClearMind(interaction, attackerData, targetData, database);
            break;
        case 'guard':
            await handleGuard(interaction, attackerData, targetData, database);
            break;
        case 'hblow':
            await handleHeavyBlow(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database);
            break;
        case 'feint':
            await handleFeint(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database);
            break;
        case 'wpoint':
            await handleWeakpoint(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database);
            break;
        case 'dstrike':
            await handleDoubleStrike(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database);
            break;
        case 'counter':
            await handleCounter(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database);
            break;
        case 'chold':
            await handleChokehold(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database);
            break;
        case 'grab':
            await handleGrab(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database);
            break;
        default:
            const errorEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ Unknown Technique')
                .setDescription(`Unknown technique key: "${techniqueKey}"\n\nValid keys: cmind, guard, hblow, feint, wpoint, dstrike, counter, chold, grab`);
            return interaction.editReply({ embeds: [errorEmbed], components: [] });
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
        .setDescription('Please type your multiplier using `*<number>` format (minimum *1.5, intervals of 0.5):\nExamples: *1.5, *2.0, *2.5, *3.0, etc.\n**Note: Ki attacks require a multiplier - no basic option available.**')
        .addFields({ name: 'Max Affordable Multiplier', value: `With your current ki, you can afford up to **×${maxMultiplier}**`, inline: false });

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
    let multiplier = 0;

    // Parse modifier using standardized system - ki attacks require explicit multipliers
    if (multiplierInput.startsWith('*')) {
        const mult = parseFloat(multiplierInput.slice(1));
        if (!isNaN(mult)) {
            if (mult >= 1.5) {
                // Check if multiplier is in valid 0.5 intervals
                const remainder = (mult - 1.0) % 0.5;
                if (Math.abs(remainder) <= 0.001) { // Small tolerance for floating point precision
                    multiplier = mult;
                } else {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(0xe74c3c)
                        .setTitle('❌ Invalid Interval')
                        .setDescription('Multiplier must be in 0.5 intervals! (e.g., *1.5, *2.0, *2.5, *3.0, etc.)');
                    return interaction.editReply({ embeds: [errorEmbed], components: [] });
                }
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle('❌ Invalid Multiplier')
                    .setDescription('Multiplier must be at least *1.5!');
                return interaction.editReply({ embeds: [errorEmbed], components: [] });
            }
        } else {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ Invalid Input')
                .setDescription('Please enter a valid multiplier using `*<number>` format (e.g., *1.5, *2.0).');
            return interaction.editReply({ embeds: [errorEmbed], components: [] });
        }
    } else if (multiplierInput.startsWith('+')) {
        const errorEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('❌ Invalid Modifier Type')
            .setDescription('Ki attacks only support multiplier modifiers! Use `*<number>` for multiplier (minimum *1.5).');
        return interaction.editReply({ embeds: [errorEmbed], components: [] });
    } else {
        const errorEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('❌ Invalid Input')
            .setDescription('Ki attacks require a multiplier! Use `*<number>` format (e.g., *1.5, *2.0, *2.5).');
        return interaction.editReply({ embeds: [errorEmbed], components: [] });
    }

    // Validate multiplier
    if (multiplier < 1.5) {
        const errorEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('❌ Invalid Multiplier')
            .setDescription('Ki attacks require a minimum multiplier of *1.5!');
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
        const maxHealth = await calculateMaxHealthForCharacter(database, attackerData.active_character_id, attackerData.base_pl, attackerData.endurance);
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
            { name: 'Multiplier', value: `*${multiplier}`, inline: true },
            { name: 'Ki Cost', value: totalKiCost.toString(), inline: true }
        )
        .setFooter({ text: 'Target must defend within 5 minutes or take full damage!' });

    // Add ki bar display
    addKiDisplay(resultEmbed, attackerData.name, newKi, attackerData.endurance);

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

async function handleMagicAttack(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database) {
    const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('✨ Magic Attack')
        .setDescription('Please type your technique cost and affinity type (type p for primary and s for secondary).\nExamples: p10 for primary with base cost of 10, s5 for secondary with base cost of 5.');

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

    const magicInput = collected.first().content.toLowerCase();
    let affinity = '';
    let baseCost = 0;
    let isValid = false;

    // Parse input (p10, s5, etc.)
    if (magicInput.startsWith('p') || magicInput.startsWith('s')) {
        affinity = magicInput.charAt(0);
        const costStr = magicInput.slice(1);
        const cost = parseInt(costStr);
        
        if (!isNaN(cost) && cost > 0) {
            baseCost = cost;
            isValid = true;
        }
    }

    if (!isValid) {
        const errorEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('❌ Invalid Input')
            .setDescription('Please enter a valid format: p<number> for primary or s<number> for secondary.\nExamples: p10, s5');
        return interaction.editReply({ embeds: [errorEmbed], components: [] });
    }

    // Calculate ki cost based on affinity
    let kiCost = 0;
    if (affinity === 'p') {
        // Primary Loss Formula: Technique Cost * (100 / Control)
        kiCost = baseCost * (100 / attackerData.control);
    } else if (affinity === 's') {
        // Secondary Loss Formula: (Technique Cost * (100 / Control)) * 2
        kiCost = (baseCost * (100 / attackerData.control)) * 2;
    }

    kiCost = Math.floor(kiCost); // Round down to integer

    // Check if attacker has enough ki
    const currentKi = attackerData.current_ki || attackerData.endurance;
    if (kiCost > currentKi) {
        const errorEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('❌ Insufficient Ki')
            .setDescription(`Not enough ki! Need ${kiCost}, have ${currentKi}.`);
        return interaction.editReply({ embeds: [errorEmbed], components: [] });
    }

    // Update attacker's ki
    const newKi = Math.max(0, currentKi - kiCost);
    await database.run(
        'UPDATE characters SET current_ki = ? WHERE id = ?',
        [newKi, attackerData.active_character_id]
    );

    // Create final result embed
    const resultEmbed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('✨ Magic Spell Cast')
        .setDescription(`**${attackerData.name}** has cast a spell!`)
        .addFields(
            { name: 'Affinity Type', value: affinity === 'p' ? 'Primary' : 'Secondary', inline: true },
            { name: 'Base Cost', value: baseCost.toString(), inline: true },
            { name: 'Ki Cost', value: kiCost.toString(), inline: true }
        );

    // Add ki bar display
    addKiDisplay(resultEmbed, attackerData.name, newKi, attackerData.endurance);

    // Edit the original message with the final result
    await interaction.editReply({ embeds: [resultEmbed], components: [] });
    
    // Delete the user's magic input message
    try {
        await collected.first().delete();
    } catch (error) {
        // Might not have permission to delete
    }
}

// Technique Handlers

async function handleClearMind(interaction, attackerData, targetData, database) {
    // Clear Mind - +30 Control until end of next turn
    await addTechniqueEffect(
        database, 
        attackerData.active_character_id, 
        interaction.channel.id, 
        'clear_mind', 
        'control_bonus', 
        '30', 
        null, 
        2 // Lasts until end of next turn (current turn + 1 more)
    );

    const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🧘 Clear Mind')
        .setDescription(`**${attackerData.name}** clears their mind and focuses!\n\n+30 Control until the end of their next turn.`)
        .setFooter({ text: 'This effect will automatically be applied to rolls.' });

    await interaction.editReply({ embeds: [embed], components: [] });
}

async function handleGuard(interaction, attackerData, targetData, database) {
    // Guard - 20% damage reduction until next turn
    await addTechniqueEffect(
        database, 
        attackerData.active_character_id, 
        interaction.channel.id, 
        'guard', 
        'damage_reduction', 
        '0.2', 
        null, 
        1 // Lasts until start of next turn
    );

    const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('🛡️ Guard')
        .setDescription(`**${attackerData.name}** takes a defensive stance!\n\nAll incoming damage reduced by 20% until the start of their next turn.`)
        .setFooter({ text: 'This effect will automatically be applied to incoming attacks.' });

    await interaction.editReply({ embeds: [embed], components: [] });
}

async function handleHeavyBlow(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database) {
    // Heavy Blow - Normal attack + agility debuff if damage dealt
    const baseDamage = await calculatePhysicalAttack(attackerEffectivePL, attackerData.strength, 0, database, attackerData.active_character_id);
    const baseAccuracy = calculateAccuracy(attackerEffectivePL, attackerData.agility, 0, false);
    
    const damage = rollWithEffort(baseDamage, effort);
    const accuracy = rollWithEffort(baseAccuracy * accuracyMultiplier, effort);

    const attackerUser = await interaction.client.users.fetch(attackerData.owner_id);

    const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('💥 Heavy Blow')
        .setDescription(`**${attackerData.name}** throws a heavy blow at **${targetData.name}**!\n\n*${targetData.name} must use \`!defend @${attackerUser.username}\` to respond!*\n\n**Effect:** If damage is dealt, target gets -20% agility until start of your next turn.`)
        .addFields(
            { name: 'Attack Damage', value: damage.toString(), inline: true },
            { name: 'Accuracy', value: accuracy.toString(), inline: true },
            { name: 'Special Effect', value: '-20% Agility if damaged', inline: true }
        )
        .setFooter({ text: 'Target must defend within 5 minutes or take full damage!' });

    // Store pending attack with technique data
    const attackData = {
        technique: 'heavy_blow',
        effort: effort,
        accuracyMultiplier: accuracyMultiplier,
        onDamageEffect: {
            type: 'agility_debuff',
            value: '0.8', // -20% = 0.8x multiplier
            turns: 1
        }
    };
    
    await storePendingAttack(
        database,
        interaction.channel.id,
        interaction.user.id,
        targetData.owner_id,
        attackerData.active_character_id,
        targetData.active_character_id,
        'technique',
        damage,
        accuracy,
        attackData
    );

    await interaction.editReply({ embeds: [embed], components: [] });
}

async function handleFeint(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database) {
    // Feint - Attack with dodge penalty
    const baseDamage = await calculatePhysicalAttack(attackerEffectivePL, attackerData.strength, 0, database, attackerData.active_character_id);
    const baseAccuracy = calculateAccuracy(attackerEffectivePL, attackerData.agility, 0, false);
    
    const damage = rollWithEffort(baseDamage, effort);
    const accuracy = rollWithEffort(baseAccuracy * accuracyMultiplier, effort);

    const attackerUser = await interaction.client.users.fetch(attackerData.owner_id);

    const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('🎭 Feint')
        .setDescription(`**${attackerData.name}** attempts a tricky feint against **${targetData.name}**!\n\n*${targetData.name} must use \`!defend @${attackerUser.username}\` to respond!*\n\n**Effect:** If target attempts to dodge, their agility roll gets -0.5x penalty.`)
        .addFields(
            { name: 'Attack Damage', value: damage.toString(), inline: true },
            { name: 'Accuracy', value: accuracy.toString(), inline: true },
            { name: 'Special Effect', value: 'Dodge rolls -0.5x', inline: true }
        )
        .setFooter({ text: 'Target must defend within 5 minutes or take full damage!' });

    // Store pending attack with technique data
    const attackData = {
        technique: 'feint',
        effort: effort,
        accuracyMultiplier: accuracyMultiplier,
        dodgePenalty: 0.5 // -0.5x penalty to dodge attempts
    };
    
    await storePendingAttack(
        database,
        interaction.channel.id,
        interaction.user.id,
        targetData.owner_id,
        attackerData.active_character_id,
        targetData.active_character_id,
        'technique',
        damage,
        accuracy,
        attackData
    );

    await interaction.editReply({ embeds: [embed], components: [] });
}

async function handleWeakpoint(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database) {
    // Check ki cost (4 ki, unaffected by control)
    const currentKi = attackerData.current_ki || attackerData.endurance;
    if (currentKi < 4) {
        const errorEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('❌ Insufficient Ki')
            .setDescription('Not enough ki! Weakpoint requires 4 ki.');
        return interaction.editReply({ embeds: [errorEmbed], components: [] });
    }

    // Weakpoint - Reduced strength roll, but 7% health damage if not fully defended
    const baseDamage = await calculatePhysicalAttack(attackerEffectivePL, attackerData.strength * 0.7, 0, database, attackerData.active_character_id); // -0.3x penalty
    const baseAccuracy = calculateAccuracy(attackerEffectivePL, attackerData.agility, 0, false);
    
    const damage = rollWithEffort(baseDamage, effort);
    const accuracy = rollWithEffort(baseAccuracy * accuracyMultiplier, effort);

    // Deduct ki cost
    const newKi = currentKi - 4;
    await database.run(
        'UPDATE characters SET current_ki = ? WHERE id = ?',
        [newKi, attackerData.active_character_id]
    );

    const attackerUser = await interaction.client.users.fetch(attackerData.owner_id);

    const embed = new EmbedBuilder()
        .setColor(0x8e44ad)
        .setTitle('🎯 Weakpoint Strike')
        .setDescription(`**${attackerData.name}** targets a weakpoint on **${targetData.name}**!\n\n*${targetData.name} must use \`!defend @${attackerUser.username}\` to respond!*\n\n**Effect:** If not fully blocked/dodged, deals 7% of max health as damage instead of normal calculation.`)
        .addFields(
            { name: 'Attack Damage', value: `${damage} (reduced)`, inline: true },
            { name: 'Accuracy', value: accuracy.toString(), inline: true },
            { name: 'Ki Cost', value: '4 ki', inline: true },
            { name: 'Special Effect', value: '7% Max Health if not fully defended', inline: false }
        )
        .setFooter({ text: 'Target must defend within 5 minutes or take full damage!' });

    // Store pending attack with technique data
    const attackData = {
        technique: 'weakpoint',
        effort: effort,
        accuracyMultiplier: accuracyMultiplier,
        percentageDamage: 0.07 // 7% of max health if not fully defended
    };
    
    await storePendingAttack(
        database,
        interaction.channel.id,
        interaction.user.id,
        targetData.owner_id,
        attackerData.active_character_id,
        targetData.active_character_id,
        'technique',
        damage,
        accuracy,
        attackData
    );

    await interaction.editReply({ embeds: [embed], components: [] });
}

async function handleDoubleStrike(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database) {
    // Check ki cost (4 ki, unaffected by control)
    const currentKi = attackerData.current_ki || attackerData.endurance;
    if (currentKi < 4) {
        const errorEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('❌ Insufficient Ki')
            .setDescription('Not enough ki! Double Strike requires 4 ki.');
        return interaction.editReply({ embeds: [errorEmbed], components: [] });
    }

    // Double Strike - Roll twice and add together
    const baseDamage = await calculatePhysicalAttack(attackerEffectivePL, attackerData.strength, 0, database, attackerData.active_character_id);
    const baseAccuracy = calculateAccuracy(attackerEffectivePL, attackerData.agility, 0, false);
    
    const damage1 = rollWithEffort(baseDamage, effort);
    const damage2 = rollWithEffort(baseDamage, effort);
    const totalDamage = damage1 + damage2;
    
    const accuracy = rollWithEffort(baseAccuracy * accuracyMultiplier, effort);

    // Deduct ki cost
    const newKi = currentKi - 4;
    await database.run(
        'UPDATE characters SET current_ki = ? WHERE id = ?',
        [newKi, attackerData.active_character_id]
    );

    const attackerUser = await interaction.client.users.fetch(attackerData.owner_id);

    const embed = new EmbedBuilder()
        .setColor(0xe67e22)
        .setTitle('⚡ Double Strike')
        .setDescription(`**${attackerData.name}** launches a rapid double strike at **${targetData.name}**!\n\n*${targetData.name} must use \`!defend @${attackerUser.username}\` to respond!*\n\n**Effect:** Each missed dodge roll reduces damage by one damage dice.`)
        .addFields(
            { name: 'Strike 1', value: damage1.toString(), inline: true },
            { name: 'Strike 2', value: damage2.toString(), inline: true },
            { name: 'Total Damage', value: totalDamage.toString(), inline: true },
            { name: 'Accuracy', value: accuracy.toString(), inline: true },
            { name: 'Ki Cost', value: '4 ki', inline: true }
        )
        .setFooter({ text: 'Target must defend within 5 minutes or take full damage!' });

    // Store pending attack with technique data
    const attackData = {
        technique: 'double_strike',
        effort: effort,
        accuracyMultiplier: accuracyMultiplier,
        damage1: damage1,
        damage2: damage2
    };
    
    await storePendingAttack(
        database,
        interaction.channel.id,
        interaction.user.id,
        targetData.owner_id,
        attackerData.active_character_id,
        targetData.active_character_id,
        'technique',
        totalDamage,
        accuracy,
        attackData
    );

    await interaction.editReply({ embeds: [embed], components: [] });
}

async function handleCounter(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database) {
    // Check ki cost (4 ki, unaffected by control)
    const currentKi = attackerData.current_ki || attackerData.endurance;
    if (currentKi < 4) {
        const errorEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('❌ Insufficient Ki')
            .setDescription('Not enough ki! Counter requires 4 ki.');
        return interaction.editReply({ embeds: [errorEmbed], components: [] });
    }

    // TODO: Check if target attacked this character last turn and dealt no damage
    // For now, we'll implement the basic counter attack

    // Counter - Reduced strength, unblockable/undodgeable
    const baseDamage = await calculatePhysicalAttack(attackerEffectivePL, attackerData.strength * 0.8, 0, database, attackerData.active_character_id); // -0.2x debuff
    const baseAccuracy = calculateAccuracy(attackerEffectivePL, attackerData.agility, 0, false);
    
    const damage = rollWithEffort(baseDamage, effort);
    const accuracy = rollWithEffort(baseAccuracy * accuracyMultiplier, effort);

    // Deduct ki cost
    const newKi = currentKi - 4;
    await database.run(
        'UPDATE characters SET current_ki = ? WHERE id = ?',
        [newKi, attackerData.active_character_id]
    );

    const attackerUser = await interaction.client.users.fetch(attackerData.owner_id);

    const embed = new EmbedBuilder()
        .setColor(0x34495e)
        .setTitle('↩️ Counter Attack')
        .setDescription(`**${attackerData.name}** counters **${targetData.name}**!\n\n*This attack cannot be blocked or dodged!*`)
        .addFields(
            { name: 'Attack Damage', value: `${damage} (reduced)`, inline: true },
            { name: 'Accuracy', value: accuracy.toString(), inline: true },
            { name: 'Ki Cost', value: '4 ki', inline: true },
            { name: 'Special Effect', value: 'Unblockable & Undodgeable', inline: false }
        )
        .setFooter({ text: 'Counter attacks cannot be defended against!' });

    // Store pending attack with technique data
    const attackData = {
        technique: 'counter',
        effort: effort,
        accuracyMultiplier: accuracyMultiplier
    };
    
    await storePendingAttack(
        database,
        interaction.channel.id,
        interaction.user.id,
        targetData.owner_id,
        attackerData.active_character_id,
        targetData.active_character_id,
        'technique',
        damage,
        accuracy,
        attackData
    );

    await interaction.editReply({ embeds: [embed], components: [] });
}

async function handleChokehold(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database) {
    // Check ki cost (4 ki, unaffected by control)
    const currentKi = attackerData.current_ki || attackerData.endurance;
    if (currentKi < 4) {
        const errorEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('❌ Insufficient Ki')
            .setDescription('Not enough ki! Chokehold requires 4 ki.');
        return interaction.editReply({ embeds: [errorEmbed], components: [] });
    }

    // Chokehold - Normal attack + ki drain if damage dealt
    const baseDamage = await calculatePhysicalAttack(attackerEffectivePL, attackerData.strength, 0, database, attackerData.active_character_id);
    const baseAccuracy = calculateAccuracy(attackerEffectivePL, attackerData.agility, 0, false);
    
    const damage = rollWithEffort(baseDamage, effort);
    const accuracy = rollWithEffort(baseAccuracy * accuracyMultiplier, effort);

    // Deduct ki cost
    const newKi = currentKi - 4;
    await database.run(
        'UPDATE characters SET current_ki = ? WHERE id = ?',
        [newKi, attackerData.active_character_id]
    );

    const attackerUser = await interaction.client.users.fetch(attackerData.owner_id);

    const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🤏 Chokehold')
        .setDescription(`**${attackerData.name}** attempts to grab **${targetData.name}** in a chokehold!\n\n*${targetData.name} must use \`!defend @${attackerUser.username}\` to respond!*\n\n**Effect:** If damage is dealt, target loses 8% of their ki.`)
        .addFields(
            { name: 'Attack Damage', value: damage.toString(), inline: true },
            { name: 'Accuracy', value: accuracy.toString(), inline: true },
            { name: 'Ki Cost', value: '4 ki', inline: true },
            { name: 'Special Effect', value: '8% Ki drain if damaged', inline: false }
        )
        .setFooter({ text: 'Target must defend within 5 minutes or take full damage!' });

    // Store pending attack with technique data
    const attackData = {
        technique: 'chokehold',
        effort: effort,
        accuracyMultiplier: accuracyMultiplier,
        onDamageEffect: {
            type: 'ki_drain',
            value: '0.08', // 8% ki drain
            turns: 0 // Immediate effect
        }
    };
    
    await storePendingAttack(
        database,
        interaction.channel.id,
        interaction.user.id,
        targetData.owner_id,
        attackerData.active_character_id,
        targetData.active_character_id,
        'technique',
        damage,
        accuracy,
        attackData
    );

    await interaction.editReply({ embeds: [embed], components: [] });
}

async function handleGrab(interaction, attackerData, targetData, attackerEffectivePL, accuracyMultiplier, effort, database) {
    // Check ki cost (4 ki, unaffected by control)
    const currentKi = attackerData.current_ki || attackerData.endurance;
    if (currentKi < 4) {
        const errorEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('❌ Insufficient Ki')
            .setDescription('Not enough ki! Grab requires 4 ki.');
        return interaction.editReply({ embeds: [errorEmbed], components: [] });
    }

    // Deduct ki cost
    const newKi = currentKi - 4;
    await database.run(
        'UPDATE characters SET current_ki = ? WHERE id = ?',
        [newKi, attackerData.active_character_id]
    );

    // Grab - Special technique that doesn't take your turn
    await addTechniqueEffect(
        database, 
        attackerData.active_character_id, 
        interaction.channel.id, 
        'grab', 
        'grab_effect', 
        attackerData.strength.toString(), 
        targetData.active_character_id, 
        1 // Until start of next turn
    );

    const embed = new EmbedBuilder()
        .setColor(0x16a085)
        .setTitle('🤲 Grab')
        .setDescription(`**${attackerData.name}** grabs **${targetData.name}**!\n\n**Effect:** Until the beginning of your next turn, whenever ${targetData.name} tries to dodge, they must roll their Strength against yours first. If they fail, their dodge is unsuccessful regardless of agility roll.\n\n**Note:** This technique doesn't end your turn!`)
        .addFields(
            { name: 'Your Strength', value: attackerData.strength.toString(), inline: true },
            { name: 'Target', value: targetData.name, inline: true },
            { name: 'Ki Cost', value: '4 ki', inline: true },
            { name: 'Special', value: 'Does not end turn', inline: false }
        )
        .setFooter({ text: 'Grab effect will be applied to all dodge attempts until your next turn.' });

    await interaction.editReply({ embeds: [embed], components: [] });
}
