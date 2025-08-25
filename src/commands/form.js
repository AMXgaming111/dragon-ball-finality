const { EmbedBuilder } = require('discord.js');
const { calculateMaxHealthForCharacter } = require('../utils/calculations');

module.exports = {
    name: 'form',
    description: 'Transform into or revert from a form',
    async execute(message, args, database) {
        if (args.length < 2) {
            return message.reply('Usage: `!form <form_key> <transform/revert>`');
        }

        const formKey = args[0].toLowerCase();
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

            // Check if character has access to this form
            const characterForm = await database.get(
                'SELECT * FROM character_forms WHERE character_id = ? AND form_key = ?',
                [userData.active_character_id, formKey]
            );

            if (!characterForm) {
                return message.reply('Your character doesn\'t have access to this form.');
            }

            // Get form data
            const form = await database.get(
                'SELECT * FROM forms WHERE form_key = ?',
                [formKey]
            );

            if (!form) {
                return message.reply('Form not found.');
            }

            // Parse form modifiers from individual columns
            const formData = {
                pl_multiplier: form.pl_modifier ? parseFloat(form.pl_modifier.replace('*', '')) : null,
                endurance_modifier: form.endurance_modifier ? parseInt(form.endurance_modifier.replace(/[+-]/, '')) * (form.endurance_modifier.startsWith('-') ? -1 : 1) : null,
                ki_activation_cost: form.ki_activation_cost ? parseInt(form.ki_activation_cost.replace(/[^\d]/g, '')) : null,
                health_activation_cost: form.health_activation_cost ? parseInt(form.health_activation_cost.replace(/[^\d]/g, '')) : null,
                stackable: form.is_stackable === 1
            };

            if (action === 'transform') {
                // Check if already in this form
                if (characterForm.is_active) {
                    return message.reply(`You are already transformed into ${form.form_name}.`);
                }

                // Check if in another form (unless this form is stackable)
                if (!formData.stackable) {
                    const activeForm = await database.get(
                        'SELECT f.name FROM character_forms cf JOIN forms f ON cf.form_key = f.form_key WHERE cf.character_id = ? AND cf.is_active = 1',
                        [userData.active_character_id]
                    );

                    if (activeForm) {
                        return message.reply(`You must revert from ${activeForm.name} first.`);
                    }
                }

                // Calculate transformation costs
                let kiCost = 0;
                let healthCost = 0;

                if (formData.ki_activation_cost) {
                    kiCost = formData.ki_activation_cost;
                    if (formData.ki_activation_cost_percentage) {
                        kiCost = Math.floor(userData.endurance * (kiCost / 100));
                    }
                    // Apply control modifier
                    kiCost = Math.max(1, Math.floor(kiCost * (100 / userData.control)));
                }

                if (formData.health_activation_cost) {
                    healthCost = formData.health_activation_cost;
                    if (formData.health_activation_cost_percentage) {
                        const maxHealth = await calculateMaxHealthForCharacter(userData.id);
                        healthCost = Math.floor(maxHealth * (healthCost / 100));
                    }
                }

                // Check if character has enough resources
                const currentKi = userData.current_ki || userData.endurance;
                const maxHealth = await calculateMaxHealthForCharacter(userData.id);
                const currentHealth = userData.current_health || maxHealth;

                if (kiCost > 0 && currentKi < kiCost) {
                    return message.reply(`Not enough ki to transform! Need ${kiCost}, have ${currentKi}.`);
                }

                if (healthCost > 0 && currentHealth < healthCost) {
                    return message.reply(`Not enough health to transform! Need ${healthCost}, have ${currentHealth}.`);
                }

                // Apply transformation costs
                const newKi = Math.max(0, currentKi - kiCost);
                const newHealth = currentHealth - healthCost;

                await database.run(
                    'UPDATE characters SET current_ki = ?, current_health = ? WHERE id = ?',
                    [newKi, newHealth, userData.active_character_id]
                );

                // Activate form
                await database.run(
                    'UPDATE character_forms SET is_active = 1 WHERE character_id = ? AND form_key = ?',
                    [userData.active_character_id, formKey]
                );

                const embed = new EmbedBuilder()
                    .setColor(0xf39c12)
                    .setTitle('✨ Transformation!')
                    .setDescription(`**${userData.name}** has transformed into **${form.name}**!`)
                    .addFields(
                        { name: 'Form', value: form.name, inline: true }
                    );

                if (kiCost > 0) {
                    embed.addFields({ name: 'Ki Cost', value: kiCost.toString(), inline: true });
                }

                if (healthCost > 0) {
                    embed.addFields({ name: 'Health Cost', value: healthCost.toString(), inline: true });
                }

                await message.reply({ embeds: [embed] });

            } else if (action === 'revert') {
                // Check if currently in this form
                if (!characterForm.is_active) {
                    return message.reply(`You are not currently in ${form.name}.`);
                }

                // Deactivate form
                await database.run(
                    'UPDATE character_forms SET is_active = 0 WHERE character_id = ? AND form_key = ?',
                    [userData.active_character_id, formKey]
                );

                const embed = new EmbedBuilder()
                    .setColor(0x95a5a6)
                    .setTitle('🔄 Reversion')
                    .setDescription(`**${userData.name}** has reverted from **${form.name}**.`)
                    .addFields(
                        { name: 'Current Form', value: 'Base', inline: true }
                    );

                await message.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in form command:', error);
            await message.reply('An error occurred while processing the form change.');
        }
    }
};
