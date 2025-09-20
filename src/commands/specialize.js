const { EmbedBuilder } = require('discord.js');
const { calculateStatCaps } = require('../utils/calculations');

module.exports = {
    name: 'specialize',
    description: 'Set, view, or clear your character\'s attribute specializations to increase caps and unlock progression',
    async execute(message, args, database) {
        try {
            // Get user's active character
            const userData = await database.getUserWithActiveCharacter(message.author.id);
            if (!userData || !userData.active_character_id) {
                return message.reply('You don\'t have an active character.');
            }

            // Handle different argument patterns
            if (args.length === 0) {
                // View current specializations with cap information
                const caps = calculateStatCaps(
                    userData.race,
                    userData.primary_specialization,
                    userData.secondary_specialization,
                    userData.control
                );

                const embed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle(`${userData.name}'s Specializations & Attribute Caps`)
                    .setDescription('Current character focus areas and training limits:');

                if (userData.primary_specialization || userData.secondary_specialization) {
                    let specializationText = '';
                    
                    if (userData.primary_specialization) {
                        const primaryCap = caps[userData.primary_specialization];
                        specializationText += `**Primary:** ${userData.primary_specialization.charAt(0).toUpperCase() + userData.primary_specialization.slice(1)}\n`;
                        specializationText += `• Training Cap: **${primaryCap}**\n`;
                        specializationText += `• Bonus: +20 cap over racial limit\n\n`;
                    }
                    
                    if (userData.secondary_specialization) {
                        const secondaryCap = caps[userData.secondary_specialization];
                        specializationText += `**Secondary:** ${userData.secondary_specialization.charAt(0).toUpperCase() + userData.secondary_specialization.slice(1)}\n`;
                        specializationText += `• Training Cap: **${secondaryCap}**\n`;
                        specializationText += `• Bonus: +10 cap over racial limit\n`;
                    }

                    embed.setDescription(specializationText);
                } else {
                    embed.setDescription('No specializations set. Choose specializations to increase your training caps!');
                }

                // Add current attribute caps
                const capFields = [];
                const attributes = ['strength', 'defense', 'agility', 'endurance', 'control'];
                
                for (const attr of attributes) {
                    const current = userData[attr] || 0;
                    const cap = caps[attr];
                    let status = current >= cap ? '✅ **AT CAP**' : `${cap - current} points remaining`;
                    
                    // Highlight specialized attributes
                    let name = attr.charAt(0).toUpperCase() + attr.slice(1);
                    if (userData.primary_specialization === attr) {
                        name += ' 🥇 (Primary)';
                        status = current >= cap ? '🏆 **MAXED PRIMARY**' : status;
                    } else if (userData.secondary_specialization === attr) {
                        name += ' 🥈 (Secondary)';
                        status = current >= cap ? '🎖️ **MAXED SECONDARY**' : status;
                    }
                    
                    capFields.push({
                        name: name,
                        value: `${current}/${cap} - ${status}`,
                        inline: true
                    });
                }

                embed.addFields(capFields);
                
                // Add Ki Control multiplier information if applicable
                if (userData.control >= 10) {
                    const multiplier = userData.control >= 40 ? 1.5 : userData.control >= 25 ? 1.25 : 1.1;
                    embed.addFields({
                        name: '🔥 Advanced Ki Control Bonus',
                        value: `Your ${userData.control} Control grants **${multiplier}x** cap multiplier to all attributes!`,
                        inline: false
                    });
                }

                embed.setFooter({ text: 'Use !specialize <primary> <secondary> to set, or !specialize clear to remove' });
                return message.reply({ embeds: [embed] });
            }

            if (args.length === 1 && args[0].toLowerCase() === 'clear') {
                // Calculate caps before and after clearing
                const currentCaps = calculateStatCaps(
                    userData.race,
                    userData.primary_specialization,
                    userData.secondary_specialization,
                    userData.control
                );

                const newCaps = calculateStatCaps(
                    userData.race,
                    null,
                    null,
                    userData.control
                );

                // Clear specializations
                await database.run(
                    'UPDATE characters SET primary_specialization = NULL, secondary_specialization = NULL WHERE id = ?',
                    [userData.active_character_id]
                );

                const embed = new EmbedBuilder()
                    .setColor(0xff9900)
                    .setTitle('⚠️ Specializations Cleared')
                    .setDescription(`${userData.name} no longer has any specializations set.\n\n**Warning:** Your attribute caps have been reduced!`)
                    .setTimestamp();

                // Show the impact of clearing specializations
                const attributes = ['strength', 'defense', 'agility', 'endurance', 'control'];
                const impactFields = [];

                for (const attr of attributes) {
                    const oldCap = currentCaps[attr];
                    const newCap = newCaps[attr];
                    const current = userData[attr] || 0;

                    if (oldCap !== newCap) {
                        let status = '';
                        if (current > newCap) {
                            status = '❌ **OVER NEW CAP**';
                        } else if (current === newCap) {
                            status = '⚠️ Now at cap';
                        } else {
                            status = '✓ Within cap';
                        }

                        impactFields.push({
                            name: attr.charAt(0).toUpperCase() + attr.slice(1),
                            value: `${oldCap} → ${newCap} (${status})`,
                            inline: true
                        });
                    }
                }

                if (impactFields.length > 0) {
                    embed.addFields(impactFields);
                    embed.addFields({
                        name: '💡 Note',
                        value: 'Attributes over the new cap limit can\'t be trained further until you respecialize!',
                        inline: false
                    });
                }

                return message.reply({ embeds: [embed] });
            }

            if (args.length < 2) {
                const caps = calculateStatCaps(userData.race, null, null, userData.control);
                
                let helpText = '**Usage:** `!specialize <primary> <secondary>`\n\n';
                helpText += '**Valid attributes:** strength, defense, agility, endurance, control\n\n';
                helpText += '**Benefits:**\n';
                helpText += '• **Primary Specialization:** +20 to attribute cap\n';
                helpText += '• **Secondary Specialization:** +10 to attribute cap\n\n';
                helpText += '**Current Base Caps:**\n';

                const attributes = ['strength', 'defense', 'agility', 'endurance', 'control'];
                for (const attr of attributes) {
                    const current = userData[attr] || 0;
                    const cap = caps[attr];
                    helpText += `• ${attr.charAt(0).toUpperCase() + attr.slice(1)}: ${current}/${cap}\n`;
                }

                if (userData.control >= 10) {
                    const multiplier = userData.control >= 40 ? 1.5 : userData.control >= 25 ? 1.25 : 1.1;
                    helpText += `\n🔥 **Advanced Ki Control Bonus:** ${multiplier}x multiplier active!\n`;
                }

                helpText += '\n**Example:** `!specialize agility endurance`\n';
                helpText += '**Other commands:**\n';
                helpText += '• `!specialize` - View current specializations & caps\n';
                helpText += '• `!specialize clear` - Remove specializations\n';

                return message.reply(helpText);
            }

            const primarySpec = args[0].toLowerCase();
            const secondarySpec = args[1].toLowerCase();

            // Valid attribute names
            const validAttributes = ['strength', 'defense', 'agility', 'endurance', 'control'];

            // Validate input
            if (!validAttributes.includes(primarySpec)) {
                return message.reply(`❌ Invalid primary specialization "${primarySpec}". Valid attributes: ${validAttributes.join(', ')}`);
            }

            if (!validAttributes.includes(secondarySpec)) {
                return message.reply(`❌ Invalid secondary specialization "${secondarySpec}". Valid attributes: ${validAttributes.join(', ')}`);
            }

            if (primarySpec === secondarySpec) {
                return message.reply('❌ Primary and secondary specializations must be different attributes!');
            }

            // Calculate caps before and after specialization
            const oldCaps = calculateStatCaps(
                userData.race,
                userData.primary_specialization,
                userData.secondary_specialization,
                userData.control
            );

            const newCaps = calculateStatCaps(
                userData.race,
                primarySpec,
                secondarySpec,
                userData.control
            );

            // Update specializations
            await database.run(
                'UPDATE characters SET primary_specialization = ?, secondary_specialization = ? WHERE id = ?',
                [primarySpec, secondarySpec, userData.active_character_id]
            );

            // Create success embed with detailed feedback
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('🎯 Specializations Set!')
                .setDescription(`${userData.name} has specialized in advanced training techniques!`)
                .addFields(
                    { 
                        name: '🥇 Primary Specialization', 
                        value: `**${primarySpec.charAt(0).toUpperCase() + primarySpec.slice(1)}**\n+20 training cap bonus`, 
                        inline: true 
                    },
                    { 
                        name: '🥈 Secondary Specialization', 
                        value: `**${secondarySpec.charAt(0).toUpperCase() + secondarySpec.slice(1)}**\n+10 training cap bonus`, 
                        inline: true 
                    },
                    { 
                        name: '\u200B', 
                        value: '\u200B', 
                        inline: true 
                    }
                )
                .setTimestamp();

            // Show cap changes
            const attributes = ['strength', 'defense', 'agility', 'endurance', 'control'];
            const changeFields = [];

            for (const attr of attributes) {
                const oldCap = oldCaps[attr];
                const newCap = newCaps[attr];
                const current = userData[attr] || 0;

                if (oldCap !== newCap) {
                    const change = newCap - oldCap;
                    const changeText = change > 0 ? `+${change}` : `${change}`;
                    let status = '';

                    if (attr === primarySpec) {
                        status = ' 🥇';
                    } else if (attr === secondarySpec) {
                        status = ' 🥈';
                    }

                    changeFields.push({
                        name: `${attr.charAt(0).toUpperCase() + attr.slice(1)}${status}`,
                        value: `${current}/${oldCap} → ${current}/${newCap} (${changeText})`,
                        inline: true
                    });
                }
            }

            if (changeFields.length > 0) {
                embed.addFields({ name: '📊 Training Cap Changes', value: '\u200B', inline: false });
                embed.addFields(changeFields);
            }

            // Add Ki Control bonus reminder if applicable
            if (userData.control >= 10) {
                const multiplier = userData.control >= 40 ? 1.5 : userData.control >= 25 ? 1.25 : 1.1;
                embed.addFields({
                    name: '🔥 Advanced Ki Control Active',
                    value: `Your ${userData.control} Control provides **${multiplier}x** multiplier to all training caps!`,
                    inline: false
                });
            }

            embed.setFooter({ 
                text: 'Specializations unlock advanced training! Use !stats to see your current progress.' 
            });

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error handling specializations:', error);
            return message.reply('❌ An error occurred while handling your specializations. Please try again.');
        }
    }
};
