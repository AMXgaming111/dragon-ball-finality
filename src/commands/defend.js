const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { 
    calculateEffectivePL, 
    calculatePhysicalDefense, 
    calculateKiDefense, 
    calculateAccuracy,
    rollWithEffort,
    getEffortKiCost,
    calculateKiCost
} = require('../utils/calculations');

module.exports = {
    name: 'defend',
    description: 'Defend against an attack',
    async execute(message, args, database) {
        let targetMention;
        let effort = 2; // Default normal effort

        // Parse effort modifier
        args.forEach(arg => {
            if (arg.startsWith('e')) {
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

            // Calculate defender's effective PL
            const defenderKiPercentage = defenderData.current_ki ? (defenderData.current_ki / defenderData.endurance) * 100 : 100;
            const defenderEffectivePL = calculateEffectivePL(defenderData.base_pl, defenderKiPercentage);

            // Create defense type selection embed
            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🛡️ How would you like to react?')
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
                    return interaction.reply({
                        content: 'Magic defense is not fully implemented yet.',
                        ephemeral: true
                    });
                }

                if (defenseType === 'block') {
                    await handleBlock(interaction, defenderData, attackerData, defenderEffectivePL, effort, database);
                } else if (defenseType === 'dodge') {
                    await handleDodge(interaction, defenderData, attackerData, defenderEffectivePL, effort, database);
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

async function handleBlock(interaction, defenderData, attackerData, defenderEffectivePL, effort, database) {
    const embed = new EmbedBuilder()
        .setColor(0x95a5a6)
        .setTitle('🛡️ Block Defense')
        .setDescription('How would you like to modify your block?\n(Enter a number, use * for multiplier, or 0 for basic):');

    await interaction.update({ embeds: [embed], components: [] });

    // Wait for user input
    const filter = (msg) => msg.author.id === interaction.user.id;
    const collected = await interaction.channel.awaitMessages({ 
        filter, 
        max: 1, 
        time: 30000 
    });

    if (collected.size === 0) {
        return interaction.followUp('Defense timed out.');
    }

    const modifierInput = collected.first().content;
    let modifier = 0;
    let isMultiplier = false;
    let isBasic = false;

    // Parse modifier
    if (modifierInput.includes('*')) {
        const mult = parseFloat(modifierInput.replace('*', ''));
        if (!isNaN(mult)) {
            if (mult === 1) {
                isBasic = true;
            } else {
                modifier = mult;
                isMultiplier = true;
            }
        } else {
            isBasic = true;
        }
    } else {
        const add = parseFloat(modifierInput);
        if (!isNaN(add)) {
            if (add === 0) {
                isBasic = true;
            } else {
                modifier = add;
                isMultiplier = false;
            }
        } else {
            isBasic = true;
        }
    }

    // Calculate ki cost for multiplied blocks
    let kiChange = 0;
    if (isMultiplier && !isBasic) {
        const baseCost = Math.floor((modifier - 1) * 10); // 1 ki per 0.1 multiplier
        const kiCost = calculateKiCost(baseCost, defenderData.control);
        kiChange = -kiCost;
    }

    // Apply effort ki cost/gain
    const effortKiCost = getEffortKiCost(effort);
    if (effortKiCost > 0) {
        kiChange -= Math.floor(defenderData.endurance * (effortKiCost / 100));
    } else if (effortKiCost < 0) {
        kiChange += Math.floor(defenderData.endurance * (Math.abs(effortKiCost) / 100));
    }

    // Apply ki changes before rolling
    const currentKi = defenderData.current_ki || defenderData.endurance;
    const newKi = Math.max(0, currentKi + kiChange);
    
    if (kiChange !== 0) {
        await database.run(
            'UPDATE characters SET current_ki = ? WHERE id = ?',
            [newKi, defenderData.active_character_id]
        );
    }

    // Calculate updated effective PL after ki loss
    const updatedKiPercentage = (newKi / defenderData.endurance) * 100;
    const updatedEffectivePL = calculateEffectivePL(defenderData.base_pl, updatedKiPercentage);

    // Calculate block value
    let blockValue;
    if (isBasic) {
        blockValue = calculatePhysicalDefense(updatedEffectivePL, defenderData.defense, 0);
    } else if (isMultiplier) {
        blockValue = calculatePhysicalDefense(updatedEffectivePL, defenderData.defense, 0) * modifier;
    } else {
        blockValue = calculatePhysicalDefense(updatedEffectivePL, defenderData.defense, modifier);
    }

    // Apply effort to block roll
    const finalBlockValue = rollWithEffort(blockValue, effort);

    // Gain ki for basic blocks (after roll)
    if (isBasic) {
        const basicKiGain = Math.floor(defenderData.endurance * 0.05);
        const finalKi = Math.min(defenderData.endurance, newKi + basicKiGain);
        await database.run(
            'UPDATE characters SET current_ki = ? WHERE id = ?',
            [finalKi, defenderData.active_character_id]
        );
        kiChange += basicKiGain;
    }

    // Create result embed
    const resultEmbed = new EmbedBuilder()
        .setColor(0x95a5a6)
        .setTitle('🛡️ Block Defense Result')
        .setDescription(`**${defenderData.name}** defended with a value of **${finalBlockValue}**!`)
        .addFields(
            { name: 'Block Value', value: finalBlockValue.toString(), inline: true },
            { name: 'Block Type', value: isBasic ? 'Basic' : (isMultiplier ? `${modifier}x` : `+${modifier}`), inline: true }
        );

    if (kiChange !== 0) {
        resultEmbed.addFields({ 
            name: 'Ki Change', 
            value: `${kiChange > 0 ? '+' : ''}${kiChange}`, 
            inline: true 
        });
    }

    await interaction.followUp({ embeds: [resultEmbed] });
    
    // Delete the user's modifier input message
    try {
        await collected.first().delete();
    } catch (error) {
        // Might not have permission to delete
    }
}

async function handleDodge(interaction, defenderData, attackerData, defenderEffectivePL, effort, database) {
    const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('💨 Dodge Defense')
        .setDescription('How would you like to modify your dodge?\n(Enter a number, use * for multiplier, or 0 for basic):');

    await interaction.update({ embeds: [embed], components: [] });

    // Wait for user input
    const filter = (msg) => msg.author.id === interaction.user.id;
    const collected = await interaction.channel.awaitMessages({ 
        filter, 
        max: 1, 
        time: 30000 
    });

    if (collected.size === 0) {
        return interaction.followUp('Defense timed out.');
    }

    const modifierInput = collected.first().content;
    let modifier = 0;
    let isMultiplier = false;
    let isBasic = false;

    // Parse modifier
    if (modifierInput.includes('*')) {
        const mult = parseFloat(modifierInput.replace('*', ''));
        if (!isNaN(mult)) {
            if (mult === 1) {
                isBasic = true;
            } else {
                modifier = mult;
                isMultiplier = true;
            }
        } else {
            isBasic = true;
        }
    } else {
        const add = parseFloat(modifierInput);
        if (!isNaN(add)) {
            if (add === 0) {
                isBasic = true;
            } else {
                modifier = add;
                isMultiplier = false;
            }
        } else {
            isBasic = true;
        }
    }

    // Calculate ki cost for multiplied dodges
    let kiChange = 0;
    if (isMultiplier && !isBasic) {
        const baseCost = Math.floor((modifier - 1) * 10); // 1 ki per 0.1 multiplier
        const kiCost = calculateKiCost(baseCost, defenderData.control);
        kiChange = -kiCost;
    }

    // Apply effort ki cost/gain
    const effortKiCost = getEffortKiCost(effort);
    if (effortKiCost > 0) {
        kiChange -= Math.floor(defenderData.endurance * (effortKiCost / 100));
    } else if (effortKiCost < 0) {
        kiChange += Math.floor(defenderData.endurance * (Math.abs(effortKiCost) / 100));
    }

    // Apply ki changes before rolling
    const currentKi = defenderData.current_ki || defenderData.endurance;
    const newKi = Math.max(0, currentKi + kiChange);
    
    if (kiChange !== 0) {
        await database.run(
            'UPDATE characters SET current_ki = ? WHERE id = ?',
            [newKi, defenderData.active_character_id]
        );
    }

    // Calculate updated effective PL after ki loss
    const updatedKiPercentage = (newKi / defenderData.endurance) * 100;
    const updatedEffectivePL = calculateEffectivePL(defenderData.base_pl, updatedKiPercentage);

    // Calculate dodge value
    let dodgeValue;
    if (isBasic) {
        dodgeValue = calculateAccuracy(updatedEffectivePL, defenderData.agility, 0, false);
    } else if (isMultiplier) {
        dodgeValue = calculateAccuracy(updatedEffectivePL, defenderData.agility, 0, false) * modifier;
    } else {
        dodgeValue = calculateAccuracy(updatedEffectivePL, defenderData.agility, modifier, false);
    }

    // Apply effort to dodge roll
    const finalDodgeValue = rollWithEffort(dodgeValue, effort);

    // Note: In a real implementation, this would be compared against the attacker's accuracy
    // For now, we'll just show the dodge result
    
    // Gain ki for basic dodges (after roll)
    if (isBasic) {
        const basicKiGain = Math.floor(defenderData.endurance * 0.05);
        const finalKi = Math.min(defenderData.endurance, newKi + basicKiGain);
        await database.run(
            'UPDATE characters SET current_ki = ? WHERE id = ?',
            [finalKi, defenderData.active_character_id]
        );
        kiChange += basicKiGain;
    }

    // Create result embed
    const resultEmbed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('💨 Dodge Defense Result')
        .setDescription(`**${defenderData.name}** attempted to dodge with a value of **${finalDodgeValue}**!`)
        .addFields(
            { name: 'Dodge Value', value: finalDodgeValue.toString(), inline: true },
            { name: 'Dodge Type', value: isBasic ? 'Basic' : (isMultiplier ? `${modifier}x` : `+${modifier}`), inline: true }
        );

    if (kiChange !== 0) {
        resultEmbed.addFields({ 
            name: 'Ki Change', 
            value: `${kiChange > 0 ? '+' : ''}${kiChange}`, 
            inline: true 
        });
    }

    await interaction.followUp({ embeds: [resultEmbed] });
    
    // Delete the user's modifier input message
    try {
        await collected.first().delete();
    } catch (error) {
        // Might not have permission to delete
    }
}
