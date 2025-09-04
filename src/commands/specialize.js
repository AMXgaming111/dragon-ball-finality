const { EmbedBuilder } = require('discord.js');
const { calculateStatCaps } = require('../utils/calculations');

module.exports = {
    name: 'specialize',
    description: 'Set your attribute specializations',
    async execute(message, args, database) {
        if (args.length === 0) {
            // Show current specializations and available options
            try {
                const userData = await database.getUserWithActiveCharacter(message.author.id);
                if (!userData || !userData.active_character_id) {
                    return message.reply("You don't have an active character.");
                }

                const caps = calculateStatCaps(userData);
                
                const embed = new EmbedBuilder()
                    .setColor(0x9b59b6)
                    .setTitle(`${userData.name}'s Specializations`)
                    .setDescription('Specializations increase your attribute caps:\n**Primary:** +20% cap bonus\n**Secondary:** +10% cap bonus')
                    .addFields(
                        { 
                            name: 'Current Specializations', 
                            value: `**Primary:** ${userData.primary_specialization || 'None'}\n**Secondary:** ${userData.secondary_specialization || 'None'}`, 
                            inline: false 
                        },
                        { 
                            name: 'Current Caps', 
                            value: `**Strength:** ${caps.strength}\n**Defense:** ${caps.defense}\n**Agility:** ${caps.agility}\n**Endurance:** ${caps.endurance}\n**Control:** ${caps.control}`, 
                            inline: true 
                        },
                        { 
                            name: 'Available Attributes', 
                            value: 'strength, defense, agility, endurance, control', 
                            inline: true 
                        },
                        { 
                            name: 'Usage', 
                            value: '`!specialize primary <attribute>` - Set primary specialization\n`!specialize secondary <attribute>` - Set secondary specialization\n`!specialize clear` - Clear all specializations', 
                            inline: false 
                        }
                    );

                return message.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error in specialize command:', error);
                return message.reply('There was an error processing your request.');
            }
        }

        if (args.length < 1) {
            return message.reply('Usage: `!specialize <primary/secondary/clear> [attribute]`\nExample: `!specialize primary strength`');
        }

        const action = args[0].toLowerCase();
        const attributeInput = args[1] ? args[1].toLowerCase() : null;

        // Validate attribute if provided
        const validAttributes = ['strength', 'defense', 'agility', 'endurance', 'control'];
        let attribute = null;

        if (attributeInput && action !== 'clear') {
            attribute = validAttributes.find(attr => attr.startsWith(attributeInput));
            if (!attribute) {
                return message.reply('Invalid attribute! Use: strength, defense, agility, endurance, control');
            }
        }

        try {
            const userData = await database.getUserWithActiveCharacter(message.author.id);
            if (!userData || !userData.active_character_id) {
                return message.reply("You don't have an active character.");
            }

            const characterId = userData.active_character_id;
            const characterName = userData.name;

            if (action === 'clear') {
                // Clear both specializations
                await database.run(
                    'UPDATE characters SET primary_specialization = NULL, secondary_specialization = NULL WHERE id = ?',
                    [characterId]
                );

                const clearEmbed = new EmbedBuilder()
                    .setColor(0x95a5a6)
                    .setTitle('Specializations Cleared')
                    .setDescription(`**${characterName}**'s specializations have been cleared.`)
                    .setFooter({ text: 'You can set new specializations at any time!' })
                    .setTimestamp();

                return message.reply({ embeds: [clearEmbed] });

            } else if (action === 'primary') {
                if (!attribute) {
                    return message.reply('Please specify an attribute for primary specialization.\nExample: `!specialize primary strength`');
                }

                // Check if they're trying to set the same attribute as secondary
                if (userData.secondary_specialization === attribute) {
                    return message.reply('You cannot set the same attribute as both primary and secondary specialization.');
                }

                await database.run(
                    'UPDATE characters SET primary_specialization = ? WHERE id = ?',
                    [attribute, characterId]
                );

                const caps = calculateStatCaps({ ...userData, primary_specialization: attribute });
                const newCap = caps[attribute];

                const primaryEmbed = new EmbedBuilder()
                    .setColor(0xf39c12)
                    .setTitle('Primary Specialization Set')
                    .setDescription(`**${characterName}** is now specialized in **${attribute}** (Primary)`)
                    .addFields(
                        { name: 'Bonus', value: '+20% attribute cap', inline: true },
                        { name: 'New Cap', value: newCap.toString(), inline: true }
                    )
                    .setFooter({ text: 'Use !stats to see your updated caps' })
                    .setTimestamp();

                return message.reply({ embeds: [primaryEmbed] });

            } else if (action === 'secondary') {
                if (!attribute) {
                    return message.reply('Please specify an attribute for secondary specialization.\nExample: `!specialize secondary defense`');
                }

                // Check if they're trying to set the same attribute as primary
                if (userData.primary_specialization === attribute) {
                    return message.reply('You cannot set the same attribute as both primary and secondary specialization.');
                }

                await database.run(
                    'UPDATE characters SET secondary_specialization = ? WHERE id = ?',
                    [attribute, characterId]
                );

                const caps = calculateStatCaps({ ...userData, secondary_specialization: attribute });
                const newCap = caps[attribute];

                const secondaryEmbed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle('Secondary Specialization Set')
                    .setDescription(`**${characterName}** is now specialized in **${attribute}** (Secondary)`)
                    .addFields(
                        { name: 'Bonus', value: '+10% attribute cap', inline: true },
                        { name: 'New Cap', value: newCap.toString(), inline: true }
                    )
                    .setFooter({ text: 'Use !stats to see your updated caps' })
                    .setTimestamp();

                return message.reply({ embeds: [secondaryEmbed] });

            } else {
                return message.reply('Invalid action! Use: `primary`, `secondary`, or `clear`');
            }

        } catch (error) {
            console.error('Error in specialize command:', error);
            await message.reply('There was an error processing your request. Please try again.');
        }
    }
};

                const embed = new EmbedBuilder()
                    .setColor(0xff9900)
                    .setTitle('Specializations Cleared')
                    .setDescription(`${userData.name} no longer has any specializations set.`)
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            if (args.length < 2) {
                return message.reply('Usage: `!specialize <primary> <secondary>`\n\nValid attributes: strength, defense, agility, endurance, control\n\nExample: `!specialize agility endurance`\n\nOther commands:\n• `!specialize` - View current specializations\n• `!specialize clear` - Remove specializations\n\n*Note: This is for character bookkeeping and roleplay purposes.*');
            }

            const primarySpec = args[0].toLowerCase();
            const secondarySpec = args[1].toLowerCase();

            // Valid attribute names
            const validAttributes = ['strength', 'defense', 'agility', 'endurance', 'control'];

            // Validate input
            if (!validAttributes.includes(primarySpec)) {
                return message.reply(`Invalid primary specialization "${primarySpec}". Valid attributes: ${validAttributes.join(', ')}`);
            }

            if (!validAttributes.includes(secondarySpec)) {
                return message.reply(`Invalid secondary specialization "${secondarySpec}". Valid attributes: ${validAttributes.join(', ')}`);
            }

            if (primarySpec === secondarySpec) {
                return message.reply('Primary and secondary specializations must be different attributes!');
            }

            // Update specializations
            await database.run(
                'UPDATE characters SET primary_specialization = ?, secondary_specialization = ? WHERE id = ?',
                [primarySpec, secondarySpec, userData.active_character_id]
            );

            // Create success embed
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('Specializations Set!')
                .setDescription(`${userData.name} has specialized in:`)
                .addFields(
                    { 
                        name: 'Primary Specialization', 
                        value: `**${primarySpec.charAt(0).toUpperCase() + primarySpec.slice(1)}**\nCharacter Focus`, 
                        inline: true 
                    },
                    { 
                        name: 'Secondary Specialization', 
                        value: `**${secondarySpec.charAt(0).toUpperCase() + secondarySpec.slice(1)}**\nSecondary Focus`, 
                        inline: true 
                    }
                )
                .setFooter({ text: 'These specializations are for character bookkeeping and roleplay purposes!' })
                .setTimestamp();

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error handling specializations:', error);
            return message.reply('An error occurred while handling your specializations. Please try again.');
        }
    }
};
