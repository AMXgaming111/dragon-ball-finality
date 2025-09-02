const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { 
    calculateEffectivePL,
    calculateEffectivePLWithRelease,
    calculateMaxAffordableMultiplier,
    calculatePhysicalDefense, 
    calculateKiDefense, 
    calculateAccuracy,
    rollWithEffort,
    getEffortKiCost,
    calculateKiCost,
    calculateKiSpecialCost,
    getCombatBonuses,
    getCurrentKiCap,
    generateHealthBar,
    calculateMaxHealthForCharacter
} = require('../utils/calculations');
const { getPendingAttack, resolveCombat, createCombatResultEmbed, cleanupExpiredAttacks, addKiDisplay } = require('../utils/combat');
const { autoManageTurnOrder, advanceTurnFromInteraction, applyEndOfTurnEffects } = require('../../helper_functions');

module.exports = {
    name: 'defend',
    description: 'Defend against an attack',
    async execute(message, args, database) {
        let targetMention;
        let effort = 2; // Default normal effort
        
        // New no-cost modifiers
        let mainStatModifier = 0; // m+/- modifier for main stat (defense)
        let rollMultiplier = 1; // m*/ modifier for final roll
        let accuracyAgilityModifier = 0; // ma+/- modifier for agility in accuracy
        let accuracyRollMultiplier = 1; // ma*/ modifier for accuracy roll

        // Parse modifiers
        args.forEach(arg => {
            if (arg.startsWith('ma') && !arg.startsWith('<@')) {
                // ma modifiers - accuracy-specific no-cost modifiers
                const modifierPart = arg.slice(2); // Get everything after 'ma'
                
                if (modifierPart.startsWith('+')) {
                    const agBonus = parseInt(modifierPart.slice(1));
                    if (!isNaN(agBonus) && agBonus > 0) {
                        accuracyAgilityModifier = agBonus;
                    }
                } else if (modifierPart.startsWith('-')) {
                    const agPenalty = parseInt(modifierPart.slice(1));
                    if (!isNaN(agPenalty) && agPenalty > 0) {
                        accuracyAgilityModifier = -agPenalty;
                    }
                } else if (modifierPart.startsWith('*')) {
                    const mult = parseFloat(modifierPart.slice(1));
                    if (!isNaN(mult) && mult > 0) {
                        accuracyRollMultiplier = mult;
                    }
                } else if (modifierPart.startsWith('/')) {
                    const div = parseFloat(modifierPart.slice(1));
                    if (!isNaN(div) && div > 0) {
                        accuracyRollMultiplier = 1 / div;
                    }
                }
            } else if (arg.startsWith('m') && !arg.startsWith('<@') && !arg.startsWith('ma')) {
                // m modifiers - main stat no-cost modifiers (defense stat for defend)
                const modifierPart = arg.slice(1); // Get everything after 'm'
                
                if (modifierPart.startsWith('+')) {
                    const statBonus = parseInt(modifierPart.slice(1));
                    if (!isNaN(statBonus) && statBonus > 0) {
                        mainStatModifier = statBonus;
                    }
                } else if (modifierPart.startsWith('-')) {
                    const statPenalty = parseInt(modifierPart.slice(1));
                    if (!isNaN(statPenalty) && statPenalty > 0) {
                        mainStatModifier = -statPenalty;
                    }
                } else if (modifierPart.startsWith('*')) {
                    const mult = parseFloat(modifierPart.slice(1));
                    if (!isNaN(mult) && mult > 0) {
                        rollMultiplier = mult;
                    }
                } else if (modifierPart.startsWith('/')) {
                    const div = parseFloat(modifierPart.slice(1));
                    if (!isNaN(div) && div > 0) {
                        rollMultiplier = 1 / div;
                    }
                }
            } else if (arg.startsWith('e')) {
                const eff = parseInt(arg.slice(1));
                if (!isNaN(eff) && eff >= 1 && eff <= 5) {
                    effort = eff;
                }
            }
        });

        // Find target user mention
        const mentionArg = args.find(arg => arg.startsWith('<@'));
        if (!mentionArg) {
            return message.reply('You must mention the attacking user!');
        }
        targetMention = mentionArg;

        // Parse target user
        const attackerUserId = targetMention.replace(/[<@!>]/g, '');
        const attackerUser = await message.client.users.fetch(attackerUserId).catch(() => null);
        if (!attackerUser) {
            return message.reply('Attacker user not found!');
        }

        try {
            // Clean up expired attacks
            await cleanupExpiredAttacks(database);
            // Get defender's character
            const defenderData = await database.getUserWithActiveCharacter(message.author.id);
            if (!defenderData || !defenderData.active_character_id) {
                return message.reply('You don\'t have an active character.');
            }

            // Get attacker's character (for display purposes)
            const attackerData = await database.getUserWithActiveCharacter(attackerUserId);
            if (!attackerData || !attackerData.active_character_id) {
                return message.reply(`${attackerUser.username} doesn't have an active character.`);
            }

            // Check for pending attack
            const pendingAttack = await getPendingAttack(database, message.channel.id, attackerUserId, message.author.id);
            if (!pendingAttack) {
                return message.reply(`No pending attack found from ${attackerUser.username}. They need to attack you first!`);
            }

            // Auto-manage turn order (add defender if not already in)
            const turnOrderResult = await autoManageTurnOrder(
                message.channel.id, 
                attackerUserId, 
                message.author.id, 
                message.client, 
                database
            );
            
            if (turnOrderResult.success && turnOrderResult.message) {
                await message.channel.send(turnOrderResult.message);
            }

            // Calculate defender's effective PL
            const defenderKiPercentage = defenderData.current_ki ? (defenderData.current_ki / defenderData.endurance) * 100 : 100;
            // Check for Arcosian Resilience racial
            const hasArcosianResilience = await database.get(`
                SELECT is_active FROM character_racials 
                WHERE character_id = ? AND racial_tag = 'aresist' AND is_active = 1
            `, [defenderData.active_character_id]);
            // Get combat bonuses (Zenkai and Majin Magic)
            const combatBonuses = await getCombatBonuses(database, defenderData.active_character_id, message.channel.id);
            const defenderEffectivePL = await calculateEffectivePLWithRelease(
                database,
                defenderData.active_character_id,
                defenderData.base_pl, 
                defenderKiPercentage, 
                1, 
                !!hasArcosianResilience,
                combatBonuses.zenkaiBonus,
                combatBonuses.majinMagicBonus
            );

            // Create defense type selection embed
            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🛡 How would you like to react?')
                .setDescription(`**${defenderData.name}** is defending against **${attackerData.name}**`)
                .addFields(
                    { name: 'Defender', value: `${defenderData.name} (PL: ${defenderEffectivePL})`, inline: true },
                    { name: 'Attacker', value: `${attackerData.name}`, inline: true },
                    { name: 'Effort Level', value: `${effort}/5`, inline: true }
                );

            const blockButton = new ButtonBuilder()
                .setCustomId('defend_block')
                .setLabel('Block')
                .setStyle(ButtonStyle.Secondary);

            const dodgeButton = new ButtonBuilder()
                .setCustomId('defend_dodge')
                .setLabel('Dodge')
                .setStyle(ButtonStyle.Primary);

            const magicButton = new ButtonBuilder()
                .setCustomId('defend_magic')
                .setLabel('Magic')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder()
                .addComponents(blockButton, dodgeButton, magicButton);

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
                        content: 'Only the defender can choose the defense type.', 
                        ephemeral: true 
                    });
                }

                let defenseType = interaction.customId.split('_')[1];
                if (defenseType === 'magic') {
                    await handleMagicDefense(interaction, defenderData, attackerData, defenderEffectivePL, effort, database, pendingAttack);
                    return;
                }

                if (defenseType === 'block') {
                    await handleBlock(interaction, defenderData, attackerData, defenderEffectivePL, effort, database, pendingAttack);
                } else if (defenseType === 'dodge') {
                    await handleDodge(interaction, defenderData, attackerData, defenderEffectivePL, effort, database, pendingAttack);
                }
            });

            collector.on('end', async (collected) => {
                if (collected.size === 0) {
                    try {
                        await response.edit({ 
                            components: [], 
                            content: 'Defense timed out.' 
                        });
                    } catch (error) {
                        // Message might have been deleted
                    }
                }
            });

        } catch (error) {
            console.error('Error in defend command:', error);
            await message.reply('An error occurred while processing the defense.');
        }
    }
};

async function handleBlock(interaction, defenderData, attackerData, defenderEffectivePL, effort, database, pendingAttack) {
    // Check for Namekian Giant Form bonus for max additive calculation
    let effectiveStrength = defenderData.strength;
    const giantForm = await database.get(`
        SELECT is_active FROM character_racials 
        WHERE character_id = ? AND racial_tag = 'ngiant' AND is_active = 1
    `, [defenderData.active_character_id]);
    
    if (giantForm) {
        effectiveStrength += 40; // Giant form grants +40 strength
    }
    
    const maxAdditive = ((effectiveStrength + defenderData.endurance + defenderData.control) / 6).toFixed(2);
    
    // Calculate maximum affordable multiplier
    const defenderCurrentKi = defenderData.current_ki || defenderData.endurance;
    const maxMultiplier = calculateMaxAffordableMultiplier(defenderCurrentKi, defenderData.control, effort, 1, defenderData.endurance);
    
    const embed = new EmbedBuilder()
        .setColor(0x95a5a6)
        .setTitle('🛡 Block Defense')
        .setDescription('How would you like to modify your block?\n(Use `+<number>` for additive, `*<number>` for multiplier, or `0` for basic)\nMultipliers: minimum *1.5, intervals of 0.5 (e.g., *1.5, *2.0, *2.5):')
        .addFields(
            { name: 'Max Additive', value: `Your maximum additive is **+${maxAdditive}**`, inline: true },
            { name: 'Max Affordable Multiplier', value: maxMultiplier > 0 ? `With your current ki, you can afford up to **×${maxMultiplier}**` : '**No multipliers affordable** (insufficient ki)', inline: true }
        );

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
            .setTitle('⏰ Defense Timed Out')
            .setDescription('Defense timed out.');
        return interaction.editReply({ embeds: [timeoutEmbed], components: [] });
    }

    const modifierInput = collected.first().content;
    let modifier = 0;
    let isMultiplier = false;
    let isBasic = false;

    // Parse modifier using standardized system
    if (modifierInput.startsWith('+')) {
        const add = parseFloat(modifierInput.slice(1));
        if (!isNaN(add) && add > 0) {
            modifier = add;
            isMultiplier = false;
        } else {
            isBasic = true;
        }
    } else if (modifierInput.startsWith('*')) {
        const mult = parseFloat(modifierInput.slice(1));
        if (!isNaN(mult)) {
            if (mult === 1) {
                isBasic = true;
            } else if (mult >= 1.5) {
                // Check if multiplier is in valid 0.5 intervals
                const remainder = (mult - 1.0) % 0.5;
                if (Math.abs(remainder) <= 0.001) { // Small tolerance for floating point precision
                    modifier = mult;
                    isMultiplier = true;
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
            isBasic = true;
        }
    } else if (modifierInput === '0') {
        isBasic = true;
    } else {
        isBasic = true; // Default to basic for any other input
    }

    // Calculate ki cost for multiplied blocks
    let kiChange = 0;
    if (isMultiplier && !isBasic) {
        const kiCost = calculateKiSpecialCost(modifier, defenderData.control);
        kiChange = -kiCost;
    }

    // Apply effort ki cost/gain with minimum 1 ki
    const effortKiCost = getEffortKiCost(effort);
    if (effortKiCost > 0) {
        kiChange -= Math.max(1, Math.floor(defenderData.endurance * (effortKiCost / 100)));
    } else if (effortKiCost < 0) {
        kiChange += Math.max(1, Math.floor(defenderData.endurance * (Math.abs(effortKiCost) / 100)));
    }

    // Check if defender has enough ki for the costs
    const currentKi = defenderData.current_ki || defenderData.endurance;
    const totalKiCost = Math.abs(Math.min(0, kiChange)); // Get the total cost (negative changes)
    if (totalKiCost > currentKi) {
        const errorEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('❌ Insufficient Ki')
            .setDescription(`Not enough ki! Need ${totalKiCost}, have ${currentKi}.`);
        return interaction.editReply({ embeds: [errorEmbed], components: [] });
    }

    // Apply ki changes before rolling
    const newKi = Math.max(0, currentKi + kiChange);
    if (kiChange !== 0) {
        await database.run(
            'UPDATE characters SET current_ki = ? WHERE id = ?',
            [newKi, defenderData.active_character_id]
        );
    }

    // Calculate updated effective PL after ki loss
    const updatedKiPercentage = (newKi / defenderData.endurance) * 100;
    // Check for Arcosian Resilience racial
    const hasArcosianResilience = await database.get(`
        SELECT is_active FROM character_racials 
        WHERE character_id = ? AND racial_tag = 'aresist' AND is_active = 1
    `, [defenderData.active_character_id]);
    // Get combat bonuses (Zenkai and Majin Magic)
    const combatBonuses = await getCombatBonuses(database, defenderData.active_character_id, pendingAttack.channel_id);
    const updatedEffectivePL = await calculateEffectivePLWithRelease(
        database,
        defenderData.active_character_id,
        defenderData.base_pl, 
        updatedKiPercentage, 
        1, 
        !!hasArcosianResilience,
        combatBonuses.zenkaiBonus,
        combatBonuses.majinMagicBonus
    );

    // Calculate block value with new modifiers
    const effectiveDefenseWithModifier = Math.max(1, defenderData.defense + mainStatModifier);
    let blockValue;
    if (isBasic) {
        blockValue = await calculatePhysicalDefense(updatedEffectivePL, effectiveDefenseWithModifier, 0, database, defenderData.active_character_id);
    } else if (isMultiplier) {
        blockValue = await calculatePhysicalDefense(updatedEffectivePL, effectiveDefenseWithModifier, 0, database, defenderData.active_character_id) * modifier;
    } else {
        blockValue = await calculatePhysicalDefense(updatedEffectivePL, effectiveDefenseWithModifier, modifier, database, defenderData.active_character_id);
    }

    // Apply effort to block roll, then apply roll multiplier
    const finalBlockValue = rollWithEffort(blockValue, effort) * rollMultiplier;

    // Gain ki for basic blocks (after roll)
    let finalKiAfterAll = newKi;
    if (isBasic) {
        const basicKiGain = Math.max(1, Math.floor(defenderData.endurance * 0.05));
        const kiCap = await getCurrentKiCap(database, defenderData.active_character_id);
        const finalKi = Math.min(kiCap, newKi + basicKiGain); // Respect health cap
        await database.run(
            'UPDATE characters SET current_ki = ? WHERE id = ?',
            [finalKi, defenderData.active_character_id]
        );
        kiChange += basicKiGain;
        finalKiAfterAll = finalKi;
    }

    // Resolve combat
    const combatResult = await resolveCombat(database, pendingAttack, 'block', finalBlockValue);
    
    // Handle different combat result types
    let defenseEmbed;
    
    if (combatResult.type === 'weakpoint_block') {
        // Use the specialized combat result embed for weakpoint
        defenseEmbed = createCombatResultEmbed(attackerData.name, defenderData.name, combatResult, pendingAttack.attack_type);
    } else if (combatResult.type === 'double_strike') {
        // Handle Double Strike blocking
        const strike1Block = combatResult.strike1.block || 0;
        const strike2Block = combatResult.strike2.block || 0;
        const totalBlockValue = strike1Block + strike2Block;
        
        defenseEmbed = new EmbedBuilder()
            .setColor(0x95a5a6)
            .setTitle('🛡 Combat Result - Block vs Double Strike')
            .setDescription(`**${defenderData.name}** blocked **${attackerData.name}**'s double strike attack!`)
            .addFields(
                { name: 'Total Attack Damage', value: combatResult.totalDamage.toString(), inline: true },
                { name: 'Total Block Value', value: totalBlockValue.toString(), inline: true },
                { name: 'Final Damage', value: combatResult.finalDamage.toString(), inline: true },
                { name: 'Strike 1', value: `${combatResult.strike1.damage} dmg → ${combatResult.strike1.finalDamage} final`, inline: true },
                { name: 'Strike 2', value: `${combatResult.strike2.damage} dmg → ${combatResult.strike2.finalDamage} final`, inline: true },
                { name: 'Block Type', value: isBasic ? 'Basic' : (isMultiplier ? `*${modifier}` : `+${modifier}`), inline: true }
            )
            .setTimestamp();
    } else {
        // Create detailed defense result embed for regular attacks
        defenseEmbed = new EmbedBuilder()
            .setColor(0x95a5a6)
            .setTitle('🛡 Combat Result - Block')
            .setDescription(`**${defenderData.name}** blocked **${attackerData.name}**'s ${pendingAttack.attack_type} attack!`)
            .addFields(
                { name: 'Attack Damage', value: (combatResult.attackDamage || pendingAttack.damage).toString(), inline: true },
                { name: 'Block Value', value: (combatResult.defenseValue || 0).toString(), inline: true },
                { name: 'Final Damage', value: (combatResult.finalDamage || 0).toString(), inline: true },
                { name: 'Block Type', value: isBasic ? 'Basic' : (isMultiplier ? `*${modifier}` : `+${modifier}`), inline: true }
            )
            .setTimestamp();
    }
    
    // Add health information if damage was taken
    if (combatResult.healthUpdate && combatResult.finalDamage > 0) {
        const { newHealth, maxHealth } = combatResult.healthUpdate;
        const healthPercentage = (newHealth / maxHealth) * 100;
        const healthBar = generateHealthBar(healthPercentage);
        
        defenseEmbed.addFields({
            name: `${defenderData.name}'s Health`,
            value: `${healthBar}\n${newHealth}/${maxHealth} (${Math.round(healthPercentage)}%)`,
            inline: false
        });
        
        // Only show critical status if health is positive but below 20%
        if (newHealth > 0 && healthPercentage < 20) {
            defenseEmbed.addFields({ name: 'Status', value: '⚠️ **CRITICAL**', inline: false });
        }
    }

    if (kiChange !== 0) {
        defenseEmbed.addFields({ 
            name: 'Defender Ki Change', 
            value: `${kiChange > 0 ? '+' : ''}${kiChange}`, 
            inline: true 
        });
        
        // Add ki bar display
        addKiDisplay(defenseEmbed, defenderData.name, finalKiAfterAll, defenderData.endurance);
    }

    // Edit the original message with the final combat result
    await interaction.editReply({ embeds: [defenseEmbed], components: [] });

    // Delete the user's modifier input message
    try {
        await collected.first().delete();
    } catch (error) {
        // Might not have permission to delete
    }
}

async function handleDodge(interaction, defenderData, attackerData, defenderEffectivePL, effort, database, pendingAttack) {
    // Check for Namekian Giant Form bonus for max additive calculation
    let effectiveStrength = defenderData.strength;
    const giantForm = await database.get(`
        SELECT is_active FROM character_racials 
        WHERE character_id = ? AND racial_tag = 'ngiant' AND is_active = 1
    `, [defenderData.active_character_id]);
    
    if (giantForm) {
        effectiveStrength += 40; // Giant form grants +40 strength
    }
    
    const maxAdditive = ((effectiveStrength + defenderData.endurance + defenderData.control) / 6).toFixed(2);
    
    // Calculate maximum affordable multiplier
    const defenderCurrentKi = defenderData.current_ki || defenderData.endurance;
    const maxMultiplier = calculateMaxAffordableMultiplier(defenderCurrentKi, defenderData.control, effort, 1, defenderData.endurance);
    
    const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('💨 Dodge Defense')
        .setDescription('How would you like to modify your dodge?\n(Use `+<number>` for additive, `*<number>` for multiplier, or `0` for basic)\nMultipliers: minimum *1.5, intervals of 0.5 (e.g., *1.5, *2.0, *2.5):')
        .addFields(
            { name: 'Max Additive', value: `Your maximum additive is **+${maxAdditive}**`, inline: true },
            { name: 'Max Affordable Multiplier', value: maxMultiplier > 0 ? `With your current ki, you can afford up to **×${maxMultiplier}**` : '**No multipliers affordable** (insufficient ki)', inline: true }
        );

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
            .setTitle('⏰ Defense Timed Out')
            .setDescription('Defense timed out.');
        return interaction.editReply({ embeds: [timeoutEmbed], components: [] });
    }

    const modifierInput = collected.first().content;
    let modifier = 0;
    let isMultiplier = false;
    let isBasic = false;

    // Parse modifier using standardized system
    if (modifierInput.startsWith('+')) {
        const add = parseFloat(modifierInput.slice(1));
        if (!isNaN(add) && add > 0) {
            modifier = add;
            isMultiplier = false;
        } else {
            isBasic = true;
        }
    } else if (modifierInput.startsWith('*')) {
        const mult = parseFloat(modifierInput.slice(1));
        if (!isNaN(mult)) {
            if (mult === 1) {
                isBasic = true;
            } else if (mult >= 1.5) {
                // Check if multiplier is in valid 0.5 intervals
                const remainder = (mult - 1.0) % 0.5;
                if (Math.abs(remainder) <= 0.001) { // Small tolerance for floating point precision
                    modifier = mult;
                    isMultiplier = true;
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
            isBasic = true;
        }
    } else if (modifierInput === '0') {
        isBasic = true;
    } else {
        isBasic = true; // Default to basic for any other input
    }

    // Calculate ki cost for multiplied dodges
    let kiChange = 0;
    if (isMultiplier && !isBasic) {
        const kiCost = calculateKiSpecialCost(modifier, defenderData.control);
        kiChange = -kiCost;
    }

    // Apply effort ki cost/gain with minimum 1 ki
    const effortKiCost = getEffortKiCost(effort);
    if (effortKiCost > 0) {
        kiChange -= Math.max(1, Math.floor(defenderData.endurance * (effortKiCost / 100)));
    } else if (effortKiCost < 0) {
        kiChange += Math.max(1, Math.floor(defenderData.endurance * (Math.abs(effortKiCost) / 100)));
    }

    // Check if defender has enough ki for the costs
    const currentKi = defenderData.current_ki || defenderData.endurance;
    const totalKiCost = Math.abs(Math.min(0, kiChange)); // Get the total cost (negative changes)
    if (totalKiCost > currentKi) {
        const errorEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('❌ Insufficient Ki')
            .setDescription(`Not enough ki! Need ${totalKiCost}, have ${currentKi}.`);
        return interaction.editReply({ embeds: [errorEmbed], components: [] });
    }

    // Apply ki changes before rolling
    const newKi = Math.max(0, currentKi + kiChange);
    if (kiChange !== 0) {
        await database.run(
            'UPDATE characters SET current_ki = ? WHERE id = ?',
            [newKi, defenderData.active_character_id]
        );
    }

    // Calculate updated effective PL after ki loss
    const updatedKiPercentage = (newKi / defenderData.endurance) * 100;
    // Check for Arcosian Resilience racial (recheck since this might be a different function)
    const hasArcosianResilience2 = await database.get(`
        SELECT is_active FROM character_racials 
        WHERE character_id = ? AND racial_tag = 'aresist' AND is_active = 1
    `, [defenderData.active_character_id]);
    // Get combat bonuses (Zenkai and Majin Magic)
    const combatBonuses = await getCombatBonuses(database, defenderData.active_character_id, pendingAttack.channel_id);
    const updatedEffectivePL = await calculateEffectivePLWithRelease(
        database,
        defenderData.active_character_id,
        defenderData.base_pl, 
        updatedKiPercentage, 
        1, 
        !!hasArcosianResilience2,
        combatBonuses.zenkaiBonus,
        combatBonuses.majinMagicBonus
    );

    // Calculate dodge value with accuracy agility modifier
    const effectiveAgilityWithModifier = Math.max(1, defenderData.agility + accuracyAgilityModifier);
    let dodgeValue;
    if (isBasic) {
        dodgeValue = calculateAccuracy(updatedEffectivePL, effectiveAgilityWithModifier, 0, false);
    } else if (isMultiplier) {
        dodgeValue = calculateAccuracy(updatedEffectivePL, effectiveAgilityWithModifier, 0, false) * modifier;
    } else {
        dodgeValue = calculateAccuracy(updatedEffectivePL, effectiveAgilityWithModifier, modifier, false);
    }

    // Apply feint penalty if the attack is a feint
    if (pendingAttack.attack_data && pendingAttack.attack_data.technique === 'feint') {
        const feintPenalty = pendingAttack.attack_data.dodgePenalty || 0.5; // Default to 0.5x penalty
        dodgeValue = Math.floor(dodgeValue * feintPenalty);
    }

    // Apply effort to dodge roll, then apply accuracy roll multiplier, then roll multiplier
    const finalDodgeValue = rollWithEffort(dodgeValue, effort) * accuracyRollMultiplier * rollMultiplier;

    // For dodge, we also need the defender's defense stat for potential failed dodge pity block (with modifier)
    const effectiveDefenseWithModifier = Math.max(1, defenderData.defense + mainStatModifier);
    const defenseValue = await calculatePhysicalDefense(updatedEffectivePL, effectiveDefenseWithModifier, 0, database, defenderData.active_character_id);

    // Gain ki for basic dodges (after roll)
    let finalKiAfterAll = newKi;
    if (isBasic) {
        const basicKiGain = Math.max(1, Math.floor(defenderData.endurance * 0.05));
        const kiCap = await getCurrentKiCap(database, defenderData.active_character_id);
        const finalKi = Math.min(kiCap, newKi + basicKiGain); // Respect health cap
        await database.run(
            'UPDATE characters SET current_ki = ? WHERE id = ?',
            [finalKi, defenderData.active_character_id]
        );
        kiChange += basicKiGain;
        finalKiAfterAll = finalKi;
    }

    // Resolve combat with dodge
    const combatResult = await resolveCombat(database, pendingAttack, 'dodge', defenseValue, finalDodgeValue);
    
    // Create detailed defense result embed instead of basic combat embed
    const defenseEmbed = new EmbedBuilder()
        .setTimestamp();
    
    if (combatResult.type === 'dodge') {
        defenseEmbed.setColor(0x3498db)
            .setTitle('💨 Combat Result - Successful Dodge')
            .setDescription(`**${defenderData.name}** successfully dodged **${attackerData.name}**'s ${pendingAttack.attack_type} attack!`)
            .addFields(
                { name: 'Attack Accuracy', value: (combatResult.attackAccuracy || 0).toString(), inline: true },
                { name: 'Dodge Value', value: (combatResult.dodgeValue || 0).toString(), inline: true },
                { name: 'Final Damage', value: '0', inline: true },
                { name: 'Dodge Type', value: isBasic ? 'Basic' : (isMultiplier ? `*${modifier}` : `+${modifier}`), inline: true }
            );
    } else if (combatResult.type === 'failed_dodge') {
        defenseEmbed.setColor(0xe67e22)
            .setTitle('⚔️ Combat Result - Failed Dodge')
            .setDescription(`**${defenderData.name}** failed to dodge **${attackerData.name}**'s ${pendingAttack.attack_type} attack but managed a last-second block!`)
            .addFields(
                { name: 'Attack Accuracy', value: (combatResult.attackAccuracy || 0).toString(), inline: true },
                { name: 'Dodge Value', value: (combatResult.dodgeValue || 0).toString(), inline: true },
                { name: 'Pity Block', value: (combatResult.pityBlockValue || 0).toString(), inline: true },
                { name: 'Final Damage', value: (combatResult.finalDamage || 0).toString(), inline: true },
                { name: 'Dodge Type', value: isBasic ? 'Basic' : (isMultiplier ? `*${modifier}` : `+${modifier}`), inline: true }
            );
    } else if (combatResult.type === 'double_strike') {
        const strike1Hit = combatResult.strike1.hit;
        const strike2Hit = combatResult.strike2.hit;
        const totalHits = (strike1Hit ? 1 : 0) + (strike2Hit ? 1 : 0);
        
        if (totalHits === 0) {
            // Both strikes dodged
            defenseEmbed.setColor(0x3498db)
                .setTitle('💨 Combat Result - Double Strike Completely Dodged')
                .setDescription(`**${defenderData.name}** successfully dodged both strikes of **${attackerData.name}**'s ${pendingAttack.attack_type} attack!`)
                .addFields(
                    { name: 'Strike 1 Accuracy', value: combatResult.strike1.accuracy.toString(), inline: true },
                    { name: 'Strike 2 Accuracy', value: combatResult.strike2.accuracy.toString(), inline: true },
                    { name: 'Dodge Value', value: combatResult.strike1.dodge.toString(), inline: true },
                    { name: 'Final Damage', value: '0', inline: true },
                    { name: 'Dodge Type', value: isBasic ? 'Basic' : (isMultiplier ? `*${modifier}` : `+${modifier}`), inline: true }
                );
        } else {
            // Some strikes hit
            defenseEmbed.setColor(0xe67e22)
                .setTitle(`⚔️ Combat Result - Double Strike (${totalHits}/2 Hits)`)
                .setDescription(`**${defenderData.name}** ${totalHits === 1 ? 'partially defended against' : 'failed to defend against'} **${attackerData.name}**'s ${pendingAttack.attack_type} attack!`)
                .addFields(
                    { name: 'Strike 1', value: `Acc: ${combatResult.strike1.accuracy} | ${strike1Hit ? `Hit for ${combatResult.strike1.finalDamage}` : 'Dodged'}`, inline: true },
                    { name: 'Strike 2', value: `Acc: ${combatResult.strike2.accuracy} | ${strike2Hit ? `Hit for ${combatResult.strike2.finalDamage}` : 'Dodged'}`, inline: true },
                    { name: 'Dodge Value', value: combatResult.strike1.dodge.toString(), inline: true },
                    { name: 'Total Damage', value: combatResult.finalDamage.toString(), inline: true },
                    { name: 'Dodge Type', value: isBasic ? 'Basic' : (isMultiplier ? `*${modifier}` : `+${modifier}`), inline: true }
                );
        }
    } else if (combatResult.type === 'weakpoint_dodge') {
        defenseEmbed.setColor(0x3498db)
            .setTitle('🎯 Weakpoint Strike - Dodged!')
            .setDescription(`**${defenderData.name}** successfully dodged **${attackerData.name}**'s weakpoint strike!`)
            .addFields(
                { name: 'Attack Accuracy', value: combatResult.attackAccuracy.toString(), inline: true },
                { name: 'Dodge Value', value: combatResult.dodgeValue.toString(), inline: true },
                { name: 'Final Damage', value: '0 (Fully Avoided)', inline: true },
                { name: 'Dodge Type', value: isBasic ? 'Basic' : (isMultiplier ? `*${modifier}` : `+${modifier}`), inline: true }
            );
    } else if (combatResult.type === 'weakpoint_failed_dodge') {
        defenseEmbed.setColor(0x8e44ad)
            .setTitle('🎯 Weakpoint Strike - Critical Hit!')
            .setDescription(`**${defenderData.name}** failed to dodge **${attackerData.name}**'s weakpoint strike! The attack struck a vital point!`)
            .addFields(
                { name: 'Attack Accuracy', value: combatResult.attackAccuracy.toString(), inline: true },
                { name: 'Dodge Value', value: combatResult.dodgeValue.toString(), inline: true },
                { name: 'Weakpoint Damage', value: `${combatResult.actualDamage} (7% max health)`, inline: true },
                { name: 'Final Damage', value: combatResult.finalDamage.toString(), inline: true },
                { name: 'Dodge Type', value: isBasic ? 'Basic' : (isMultiplier ? `*${modifier}` : `+${modifier}`), inline: true }
            );
    } else {
        // Fallback for unexpected combat result types
        defenseEmbed.setColor(0x95a5a6)
            .setTitle('⚔️ Combat Result')
            .setDescription(`**${defenderData.name}** attempted to dodge **${attackerData.name}**'s ${pendingAttack.attack_type} attack!`)
            .addFields(
                { name: 'Final Damage', value: combatResult.finalDamage ? combatResult.finalDamage.toString() : '0', inline: true },
                { name: 'Dodge Type', value: isBasic ? 'Basic' : (isMultiplier ? `*${modifier}` : `+${modifier}`), inline: true }
            );
    }
    
    // Add health information if damage was taken
    if ((combatResult.healthUpdate && combatResult.finalDamage > 0) || 
        (combatResult.type === 'double_strike' && combatResult.finalDamage > 0)) {
        
        let newHealth, maxHealth;
        
        if (combatResult.healthUpdate) {
            // Regular combat result with health update
            ({ newHealth, maxHealth } = combatResult.healthUpdate);
        } else {
            // Double strike - need to fetch current health
            const updatedDefenderData = await database.getUserWithActiveCharacter(defenderData.user_id);
            if (updatedDefenderData) {
                newHealth = updatedDefenderData.current_health;
                maxHealth = await calculateMaxHealthForCharacter(
                    database,
                    defenderData.active_character_id,
                    defenderData.base_pl,
                    defenderData.endurance
                );
            }
        }
        
        if (newHealth !== undefined && maxHealth !== undefined) {
            const healthPercentage = (newHealth / maxHealth) * 100;
            const healthBar = generateHealthBar(healthPercentage);
            
            defenseEmbed.addFields({
                name: `${defenderData.name}'s Health`,
                value: `${healthBar}\n${newHealth}/${maxHealth} (${Math.round(healthPercentage)}%)`,
                inline: false
            });
            
            // Only show critical status if health is positive but below 20%
            if (newHealth > 0 && healthPercentage < 20) {
                defenseEmbed.addFields({ name: 'Status', value: '⚠️ **CRITICAL**', inline: false });
            }
        }
    }

    if (kiChange !== 0) {
        defenseEmbed.addFields({ 
            name: 'Defender Ki Change', 
            value: `${kiChange > 0 ? '+' : ''}${kiChange}`, 
            inline: true 
        });
        
        // Add ki bar display when any ki actions occurred
        addKiDisplay(defenseEmbed, defenderData.name, finalKiAfterAll, defenderData.endurance);
    }

    // Edit the original message with the final combat result
    await interaction.editReply({ embeds: [defenseEmbed], components: [] });

    // Delete the user's modifier input message
    try {
        await collected.first().delete();
    } catch (error) {
        // Might not have permission to delete
    }
}

async function handleMagicDefense(interaction, defenderData, attackerData, defenderEffectivePL, effort, database, pendingAttack) {
    const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('✨ Magic Defense')
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
            .setTitle('⏰ Defense Timed Out')
            .setDescription('Defense timed out.');
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
        kiCost = baseCost * (100 / defenderData.control);
    } else if (affinity === 's') {
        // Secondary Loss Formula: (Technique Cost * (100 / Control)) * 2
        kiCost = (baseCost * (100 / defenderData.control)) * 2;
    }

    kiCost = Math.floor(kiCost); // Round down to integer

    // Check if defender has enough ki
    const currentKi = defenderData.current_ki || defenderData.endurance;
    if (kiCost > currentKi) {
        const errorEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('❌ Insufficient Ki')
            .setDescription(`Not enough ki! Need ${kiCost}, have ${currentKi}.`);
        return interaction.editReply({ embeds: [errorEmbed], components: [] });
    }

    // Update defender's ki
    const newKi = Math.max(0, currentKi - kiCost);
    await database.run(
        'UPDATE characters SET current_ki = ? WHERE id = ?',
        [newKi, defenderData.active_character_id]
    );

    // Clean up the pending attack since magic defense doesn't block/dodge traditionally
    await database.run(`
        DELETE FROM pending_attacks 
        WHERE channel_id = ? AND attacker_user_id = ? AND defender_user_id = ?
    `, [pendingAttack.channel_id, pendingAttack.attacker_user_id, pendingAttack.defender_user_id]);

    // Create final result embed
    const resultEmbed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('✨ Magic Spell Cast')
        .setDescription(`**${defenderData.name}** has cast a spell!`)
        .addFields(
            { name: 'Affinity Type', value: affinity === 'p' ? 'Primary' : 'Secondary', inline: true },
            { name: 'Base Cost', value: baseCost.toString(), inline: true },
            { name: 'Ki Cost', value: kiCost.toString(), inline: true }
        );

    // Add ki bar display
    addKiDisplay(resultEmbed, defenderData.name, newKi, defenderData.endurance);

    // Edit the original message with the final result
    await interaction.editReply({ embeds: [resultEmbed], components: [] });
    
    // Delete the user's magic input message
    try {
        await collected.first().delete();
    } catch (error) {
        // Might not have permission to delete
    }
}
