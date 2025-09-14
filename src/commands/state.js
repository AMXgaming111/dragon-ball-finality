const { EmbedBuilder } = require('discord.js');
const { calculateMaxHealthForCharacter } = require('../utils/calculations');

module.exports = {
    name: 'state',
    description: 'Transform into or revert from an ascended state',
    async execute(message, args, database) {
        if (args.length < 2) {
            return message.reply('Usage: `!state <state_key> <transform/revert>`');
        }

        const stateKey = args[0].toLowerCase();
        const action = args[1].toLowerCase();

        if (!['transform', 'revert'].includes(action)) {
            return message.reply('Action must be either `transform` or `revert`');
        }

        try {
            // Get user's active character
            const userData = await database.getUserWithActiveCharacter(message.author.id);
            if (!userData || !userData.active_character_id) {
                return message.reply('You don\'t have an active character.');
            }

            // Check if character has access to this state
            const characterState = await database.get(
                'SELECT * FROM character_forms WHERE character_id = ? AND form_key = ?',
                [userData.active_character_id, stateKey]
            );

            if (!characterState) {
                return message.reply('Your character doesn\'t have access to this ascended state.');
            }

            // Get state data
            const state = await database.get(
                'SELECT * FROM forms WHERE form_key = ?',
                [stateKey]
            );

            if (!state) {
                return message.reply('Ascended state not found.');
            }

            // Parse state modifiers from individual columns
            const stateData = {
                pl_multiplier: state.pl_modifier ? parseFloat(state.pl_modifier.replace('*', '')) : null,
                endurance_modifier: state.endurance_modifier ? parseInt(state.endurance_modifier.replace(/[+-]/, '')) * (state.endurance_modifier.startsWith('-') ? -1 : 1) : null,
                ki_activation_cost: state.ki_activation_cost ? parseInt(state.ki_activation_cost.replace(/[^\d]/g, '')) : null,
                health_activation_cost: state.health_activation_cost ? parseInt(state.health_activation_cost.replace(/[^\d]/g, '')) : null,
                stackable: state.is_stackable === 1
            };

            if (action === 'transform') {
                // Check if already in this state
                if (characterState.is_active) {
                    return message.reply(`You are already transformed into ${state.name}.`);
                }

                // Check if in another state (unless this state is stackable)
                if (!stateData.stackable) {
                    const activeState = await database.get(
                        'SELECT f.name FROM character_forms cf JOIN forms f ON cf.form_key = f.form_key WHERE cf.character_id = ? AND cf.is_active = 1',
                        [userData.active_character_id]
                    );

                    if (activeState) {
                        return message.reply(`You must revert from ${activeState.name} first.`);
                    }
                }

                // Calculate transformation costs
                let kiCost = 0;
                let healthCost = 0;

                if (stateData.ki_activation_cost) {
                    kiCost = stateData.ki_activation_cost;
                    if (stateData.ki_activation_cost_percentage) {
                        kiCost = Math.floor(userData.endurance * (kiCost / 100));
                    }
                    // Apply control modifier
                    kiCost = Math.max(1, Math.floor(kiCost * (100 / userData.control)));
                }

                if (stateData.health_activation_cost) {
                    healthCost = stateData.health_activation_cost;
                    if (stateData.health_activation_cost_percentage) {
                        const maxHealth = await calculateMaxHealthForCharacter(database, userData.active_character_id, userData.base_pl, userData.endurance);
                        healthCost = Math.floor(maxHealth * (healthCost / 100));
                    }
                }

                // Check if character has enough resources
                const currentKi = userData.current_ki !== null ? userData.current_ki : userData.endurance;
                const maxHealth = await calculateMaxHealthForCharacter(database, userData.active_character_id, userData.base_pl, userData.endurance);
                const currentHealth = userData.current_health || maxHealth;

                if (kiCost > 0 && currentKi < kiCost) {
                    return message.reply(`Not enough ki to transform! Need ${kiCost}, have ${currentKi}.`);
                }

                if (healthCost > 0 && currentHealth < healthCost) {
                    return message.reply(`Not enough health to transform! Need ${healthCost}, have ${currentHealth}.`);
                }

                // Activate the state
                await database.run(
                    'UPDATE character_forms SET is_active = 1 WHERE character_id = ? AND form_key = ?',
                    [userData.active_character_id, stateKey]
                );

                // Deduct transformation costs
                if (kiCost > 0) {
                    const newKi = Math.max(0, currentKi - kiCost);
                    await database.run(
                        'UPDATE characters SET current_ki = ? WHERE id = ?',
                        [newKi, userData.active_character_id]
                    );
                }

                if (healthCost > 0) {
                    const newHealth = Math.max(1, currentHealth - healthCost);
                    await database.run(
                        'UPDATE characters SET current_health = ? WHERE id = ?',
                        [newHealth, userData.active_character_id]
                    );
                }

                // Create success embed
                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('✨ State Transformation')
                    .setDescription(`**${userData.name}** has transformed into **${state.name}**!`)
                    .setThumbnail(userData.image_url || require('../utils/config').defaultCharacterImage);

                if (kiCost > 0 || healthCost > 0) {
                    const costs = [];
                    if (kiCost > 0) costs.push(`${kiCost} Ki`);
                    if (healthCost > 0) costs.push(`${healthCost} Health`);
                    embed.addFields({ name: 'Transformation Cost', value: costs.join(', '), inline: false });
                }

                await message.reply({ embeds: [embed] });

            } else if (action === 'revert') {
                // Check if currently in this state
                if (!characterState.is_active) {
                    return message.reply(`You are not currently in the ${state.name} state.`);
                }

                // Deactivate the state
                await database.run(
                    'UPDATE character_forms SET is_active = 0 WHERE character_id = ? AND form_key = ?',
                    [userData.active_character_id, stateKey]
                );

                // Create success embed
                const embed = new EmbedBuilder()
                    .setColor(0x95a5a6)
                    .setTitle('🔄 State Reversion')
                    .setDescription(`**${userData.name}** has reverted from **${state.name}** back to base state.`)
                    .setThumbnail(userData.image_url || require('../utils/config').defaultCharacterImage);

                await message.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in state command:', error);
            await message.reply('An error occurred while transforming state.');
        }
    }
};
