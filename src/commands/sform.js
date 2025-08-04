const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { staffRoleName } = require('../utils/config');
const { hasStaffRole } = require('../utils/calculations');

module.exports = {
    name: 'sform',
    description: 'Create or delete forms (Staff only)',
    async execute(message, args, database) {
        // Check staff permissions
        const member = message.guild.members.cache.get(message.author.id);
        if (!hasStaffRole(member, staffRoleName)) {
            return message.reply('This command requires the Staff role.');
        }

        if (args.length === 0) {
            return message.reply('Usage: `!sform <form_key> <modifiers...>` or `!sform delete <form_key>`\n\nModifiers:\n`-n <name>` - Form name\n`-s <modifier>` - Strength\n`-d <modifier>` - Defense\n`-a <modifier>` - Agility\n`-e <modifier>` - Endurance\n`-c <modifier>` - Control\n`-p <modifier>` - PL multiplier\n`-sk` - Stackable form\n`-ka <cost>` - Ki activation cost\n`-ha <cost>` - Health activation cost\n`-k <drain>` - Ki drain per turn\n`-h <drain>` - Health drain per turn\n\nExample: `!sform ssj -n "Super Saiyan" -p *5 -c -50 -k -4`');
        }

        const formKey = args[0].toLowerCase();

        // Handle delete command
        if (formKey === 'delete') {
            if (args.length < 2) {
                return message.reply('Usage: `!sform delete <form_key>`');
            }

            const deleteKey = args[1].toLowerCase();

            try {
                // Check if form exists
                const existingForm = await database.get('SELECT * FROM forms WHERE form_key = ?', [deleteKey]);
                if (!existingForm) {
                    return message.reply('Form not found!');
                }

                // Create confirmation embed
                const embed = new EmbedBuilder()
                    .setColor(0xff6b6b)
                    .setTitle('⚠️ Confirm Form Deletion')
                    .setDescription(`Are you sure you want to delete the form **${existingForm.name}** (${deleteKey})?`)
                    .addFields(
                        { name: 'Form Key', value: deleteKey, inline: true },
                        { name: 'Form Name', value: existingForm.name, inline: true }
                    )
                    .setFooter({ text: 'This will remove the form from all characters who have it!' })
                    .setTimestamp();

                const confirmButton = new ButtonBuilder()
                    .setCustomId(`delete_form_${deleteKey}`)
                    .setLabel('Delete Form')
                    .setStyle(ButtonStyle.Danger);

                const cancelButton = new ButtonBuilder()
                    .setCustomId('cancel_delete')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder()
                    .addComponents(confirmButton, cancelButton);

                const response = await message.reply({ 
                    embeds: [embed], 
                    components: [row] 
                });

                // Handle button interactions
                const collector = response.createMessageComponentCollector({ 
                    time: 30000 
                });

                collector.on('collect', async (interaction) => {
                    if (interaction.user.id !== message.author.id) {
                        return interaction.reply({ 
                            content: 'Only the person who initiated this command can respond.', 
                            ephemeral: true 
                        });
                    }

                    if (interaction.customId === `delete_form_${deleteKey}`) {
                        try {
                            // Delete form and related data
                            await database.run('DELETE FROM character_current_form WHERE form_key = ?', [deleteKey]);
                            await database.run('DELETE FROM character_forms WHERE form_key = ?', [deleteKey]);
                            await database.run('DELETE FROM forms WHERE form_key = ?', [deleteKey]);

                            const successEmbed = new EmbedBuilder()
                                .setColor(0x00ff00)
                                .setTitle('Form Deleted')
                                .setDescription(`**${existingForm.name}** has been successfully deleted.`)
                                .setTimestamp();

                            await interaction.update({ 
                                embeds: [successEmbed], 
                                components: [] 
                            });

                        } catch (error) {
                            console.error('Error deleting form:', error);
                            await interaction.update({ 
                                content: 'An error occurred while deleting the form.', 
                                embeds: [], 
                                components: [] 
                            });
                        }
                    } else if (interaction.customId === 'cancel_delete') {
                        const cancelEmbed = new EmbedBuilder()
                            .setColor(0x95a5a6)
                            .setTitle('Deletion Cancelled')
                            .setDescription('Form deletion has been cancelled.')
                            .setTimestamp();

                        await interaction.update({ 
                            embeds: [cancelEmbed], 
                            components: [] 
                        });
                    }
                });

                collector.on('end', async (collected) => {
                    if (collected.size === 0) {
                        const timeoutEmbed = new EmbedBuilder()
                            .setColor(0x95a5a6)
                            .setTitle('Deletion Cancelled')
                            .setDescription('Deletion timed out - form was not deleted.')
                            .setTimestamp();

                        await response.edit({ 
                            embeds: [timeoutEmbed], 
                            components: [] 
                        });
                    }
                });

                return;

            } catch (error) {
                console.error('Error in form deletion:', error);
                return message.reply('An error occurred while processing the deletion request.');
            }
        }

        // Handle form creation
        try {
            // Check if form already exists
            const existingForm = await database.get('SELECT * FROM forms WHERE form_key = ?', [formKey]);
            if (existingForm) {
                return message.reply('A form with that key already exists!');
            }

            // Parse modifiers
            const modifiers = {
                name: null,
                strength_modifier: null,
                defense_modifier: null,
                agility_modifier: null,
                endurance_modifier: null,
                control_modifier: null,
                pl_modifier: null,
                ki_activation_cost: null,
                health_activation_cost: null,
                ki_drain: null,
                health_drain: null,
                is_stackable: false
            };

            // Parse arguments for modifiers
            for (let i = 1; i < args.length; i++) {
                const arg = args[i];
                
                if (arg.startsWith('-')) {
                    const flag = arg.slice(1);
                    const value = args[i + 1];

                    switch (flag) {
                        case 'n':
                            modifiers.name = value?.replace(/"/g, '');
                            i++;
                            break;
                        case 's':
                            modifiers.strength_modifier = value;
                            i++;
                            break;
                        case 'd':
                            modifiers.defense_modifier = value;
                            i++;
                            break;
                        case 'a':
                            modifiers.agility_modifier = value;
                            i++;
                            break;
                        case 'e':
                            modifiers.endurance_modifier = value;
                            i++;
                            break;
                        case 'c':
                            modifiers.control_modifier = value;
                            i++;
                            break;
                        case 'p':
                            modifiers.pl_modifier = value;
                            i++;
                            break;
                        case 'ka':
                            modifiers.ki_activation_cost = value;
                            i++;
                            break;
                        case 'ha':
                            modifiers.health_activation_cost = value;
                            i++;
                            break;
                        case 'k':
                            modifiers.ki_drain = value;
                            i++;
                            break;
                        case 'h':
                            modifiers.health_drain = value;
                            i++;
                            break;
                        case 'sk':
                            modifiers.is_stackable = true;
                            break;
                    }
                }
            }

            if (!modifiers.name) {
                return message.reply('Forms must have a name! Use `-n "Form Name"`');
            }

            // Insert the form
            await database.run(`
                INSERT INTO forms (
                    form_key, name, strength_modifier, defense_modifier, 
                    agility_modifier, endurance_modifier, control_modifier, 
                    pl_modifier, ki_activation_cost, health_activation_cost, 
                    ki_drain, health_drain, is_stackable
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                formKey, modifiers.name, modifiers.strength_modifier,
                modifiers.defense_modifier, modifiers.agility_modifier,
                modifiers.endurance_modifier, modifiers.control_modifier,
                modifiers.pl_modifier, modifiers.ki_activation_cost,
                modifiers.health_activation_cost, modifiers.ki_drain,
                modifiers.health_drain, modifiers.is_stackable
            ]);

            // Create success embed
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('Form Created!')
                .setDescription(`Successfully created **${modifiers.name}**`)
                .addFields(
                    { name: 'Form Key', value: formKey, inline: true },
                    { name: 'Form Name', value: modifiers.name, inline: true },
                    { name: 'Stackable', value: modifiers.is_stackable ? 'Yes' : 'No', inline: true }
                )
                .setTimestamp();

            // Add modifier fields
            const modifierFields = [];
            if (modifiers.strength_modifier) modifierFields.push(`STR: ${modifiers.strength_modifier}`);
            if (modifiers.defense_modifier) modifierFields.push(`DEF: ${modifiers.defense_modifier}`);
            if (modifiers.agility_modifier) modifierFields.push(`AGI: ${modifiers.agility_modifier}`);
            if (modifiers.endurance_modifier) modifierFields.push(`END: ${modifiers.endurance_modifier}`);
            if (modifiers.control_modifier) modifierFields.push(`CON: ${modifiers.control_modifier}`);
            if (modifiers.pl_modifier) modifierFields.push(`PL: ${modifiers.pl_modifier}`);

            if (modifierFields.length > 0) {
                embed.addFields({ name: 'Stat Modifiers', value: modifierFields.join('\n'), inline: false });
            }

            const drainFields = [];
            if (modifiers.ki_activation_cost) drainFields.push(`Ki Activation: ${modifiers.ki_activation_cost}`);
            if (modifiers.health_activation_cost) drainFields.push(`Health Activation: ${modifiers.health_activation_cost}`);
            if (modifiers.ki_drain) drainFields.push(`Ki Drain: ${modifiers.ki_drain}`);
            if (modifiers.health_drain) drainFields.push(`Health Drain: ${modifiers.health_drain}`);

            if (drainFields.length > 0) {
                embed.addFields({ name: 'Costs & Drains', value: drainFields.join('\n'), inline: false });
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error creating form:', error);
            await message.reply('An error occurred while creating the form.');
        }
    }
};
