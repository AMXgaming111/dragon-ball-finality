const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'help',
    description: 'Display help information for all commands',
    async execute(message, args, database) {
        try {
            // Define command categories with their commands
            const commandCategories = {
                'Character Management': {
                    emoji: '👤',
                    commands: {
                        'cc': {
                            usage: '!cc "<name>" <race> or !cc <name> <race>',
                            description: 'Create a new character with specified name and race',
                            examples: ['!cc "Kazurai Sakada" saiyan', '!cc Goku saiyan'],
                            aliases: []
                        },
                        'dc': {
                            usage: '!dc "<character_name>" or !dc <character_name>',
                            description: 'Delete a character (owner or staff only)',
                            examples: ['!dc "Kazurai Sakada"', '!dc Goku'],
                            aliases: []
                        },
                        'sw': {
                            usage: '!sw "<character_name>" or !sw <character_name>',
                            description: 'Switch to another character (owner or staff only)',
                            examples: ['!sw "Kazurai Sakada"', '!sw Goku'],
                            aliases: []
                        },
                        'cl': {
                            usage: '!cl [@user]',
                            description: 'List characters (own characters or another user\'s if staff)',
                            examples: ['!cl', '!cl @user'],
                            aliases: []
                        },
                        'stats': {
                            usage: '!stats [@user]',
                            description: 'Display character stats with interactive buttons for skills/forms',
                            examples: ['!stats', '!stats @user'],
                            aliases: []
                        },
                        'addstats': {
                            usage: '!addstats pic "<character_name>" <image_url>',
                            description: 'Add or update a character\'s image',
                            examples: ['!addstats pic "Kazurai Sakada" https://example.com/image.png'],
                            aliases: []
                        }
                    }
                },
                'Combat System': {
                    emoji: '⚔️',
                    commands: {
                        'attack': {
                            usage: '!attack @target',
                            description: 'Attack another character with physical, ki, or magic attacks',
                            examples: ['!attack @opponent'],
                            aliases: []
                        },
                        'defend': {
                            usage: '!defend',
                            description: 'Defend against incoming attacks with block, dodge, or magic defense',
                            examples: ['!defend'],
                            aliases: []
                        },
                        'turn': {
                            usage: '!turn <action> [parameters]',
                            description: 'Manage turn-based combat (create, add, remove, advance, show, end)',
                            examples: ['!turn create @user1 @user2', '!turn advance', '!turn show'],
                            aliases: []
                        },
                        'pending': {
                            usage: '!pending',
                            description: 'Check pending attacks in the current channel',
                            examples: ['!pending'],
                            aliases: []
                        }
                    }
                },
                'Character Stats': {
                    emoji: '📊',
                    commands: {
                        'pl': {
                            usage: '!pl [@user]',
                            description: 'Display effective power level and combat stats',
                            examples: ['!pl', '!pl @user'],
                            aliases: []
                        },
                        'health': {
                            usage: '!health [@user] [modifier]',
                            description: 'Display or modify character health',
                            examples: ['!health', '!health +50', '!health @user -20%'],
                            aliases: []
                        },
                        'ki': {
                            usage: '!ki [@user] [modifier]',
                            description: 'Display or modify character ki',
                            examples: ['!ki', '!ki +10', '!ki @user set 50'],
                            aliases: []
                        },
                        'release': {
                            usage: '!release <percentage>%',
                            description: 'Adjust effective power level percentage for uncoded abilities',
                            examples: ['!release 75%', '!release 100%'],
                            aliases: []
                        }
                    }
                },
                'Forms & Abilities': {
                    emoji: '🔥',
                    commands: {
                        'form': {
                            usage: '!form <form_name>',
                            description: 'Activate or deactivate character forms',
                            examples: ['!form "Super Saiyan"', '!form base'],
                            aliases: []
                        },
                        'currentform': {
                            usage: '!currentform',
                            description: 'Check your currently active form and its modifiers',
                            examples: ['!currentform'],
                            aliases: []
                        },
                        'race': {
                            usage: '!race <on/off>',
                            description: 'Toggle passive racial abilities on/off',
                            examples: ['!race on', '!race off'],
                            aliases: []
                        },
                        'mregen': {
                            usage: '!mregen <on/off>',
                            description: 'Toggle enhanced Majin Regeneration (20% healing)',
                            examples: ['!mregen on', '!mregen off'],
                            aliases: []
                        },
                        'ngiant': {
                            usage: '!ngiant <on/off>',
                            description: 'Toggle Namekian Giant Form',
                            examples: ['!ngiant on', '!ngiant off'],
                            aliases: []
                        },
                        'nregen': {
                            usage: '!nregen',
                            description: 'Use Namekian Regeneration ability',
                            examples: ['!nregen'],
                            aliases: []
                        }
                    }
                },
                'Utility Commands': {
                    emoji: '🛠️',
                    commands: {
                        'r': {
                            usage: '!r <stat/number> [modifier] [-d count]',
                            description: 'Roll dice or character stats with optional modifiers',
                            examples: ['!r 20', '!r str', '!r 100 +50', '!r 20 -d 3'],
                            aliases: []
                        },
                        'help': {
                            usage: '!help [category]',
                            description: 'Display this help information',
                            examples: ['!help', '!help combat'],
                            aliases: []
                        }
                    }
                },
                'Staff Commands': {
                    emoji: '👑',
                    commands: {
                        'spl': {
                            usage: '!spl @user <+/-/*/set> <value>',
                            description: 'Modify character base power level (Staff only)',
                            examples: ['!spl @user + 100', '!spl @user set 500'],
                            aliases: []
                        },
                        'sadd': {
                            usage: '!sadd @user <stat> <+/-/*/set> <value>',
                            description: 'Modify character attributes (Staff only)',
                            examples: ['!sadd @user str + 10', '!sadd @user end set 20'],
                            aliases: []
                        },
                        'saddall': {
                            usage: '!saddall @user <+/-/*/set> <value>',
                            description: 'Modify all character attributes at once (Staff only)',
                            examples: ['!saddall @user + 5', '!saddall @user set 15'],
                            aliases: []
                        },
                        'sskill': {
                            usage: '!sskill @user <skill> <+/-/*/set> <value>',
                            description: 'Modify character skill levels (Staff only)',
                            examples: ['!sskill @user kic set 2', '!sskill @user mm + 1'],
                            aliases: []
                        },
                        'saffinity': {
                            usage: '!saffinity @user <affinity> <1/2/0>',
                            description: 'Manage character magic affinities (Staff only)',
                            examples: ['!saffinity @user fire 1', '!saffinity @user water 2'],
                            aliases: []
                        },
                        'sform': {
                            usage: '!sform @user <form_name>',
                            description: 'Activate forms for other characters (Staff only)',
                            examples: ['!sform @user "Super Saiyan"'],
                            aliases: []
                        },
                        'formset': {
                            usage: '!formset @user <add/remove> <form_name>',
                            description: 'Grant or remove form access (Staff only)',
                            examples: ['!formset @user add "Super Saiyan"'],
                            aliases: []
                        },
                        'rc': {
                            usage: '!rc @user <add/remove> <racial>',
                            description: 'Add or remove racial abilities (Staff only)',
                            examples: ['!rc @user add zenkai', '!rc @user remove mmagic'],
                            aliases: []
                        },
                        'heal': {
                            usage: '!heal @user',
                            description: 'Restore character health and ki to 100% (Staff only)',
                            examples: ['!heal @user'],
                            aliases: []
                        },
                        'say': {
                            usage: '!say <message>',
                            description: 'Create embedded announcements (Staff only)',
                            examples: ['!say Welcome to the server!'],
                            aliases: []
                        },
                        'resolve': {
                            usage: '!resolve',
                            description: 'Manually resolve expired attacks (Staff only)',
                            examples: ['!resolve'],
                            aliases: []
                        }
                    }
                }
            };

            // If specific category requested
            if (args.length > 0) {
                const requestedCategory = args[0].toLowerCase();
                const categoryMatch = Object.keys(commandCategories).find(cat => 
                    cat.toLowerCase().includes(requestedCategory) || 
                    requestedCategory.includes(cat.toLowerCase())
                );

                if (categoryMatch) {
                    const category = commandCategories[categoryMatch];
                    const embed = createCategoryEmbed(categoryMatch, category);
                    return message.reply({ embeds: [embed] });
                } else {
                    return message.reply(`Category not found! Available categories: ${Object.keys(commandCategories).join(', ')}`);
                }
            }

            // Create main help embed
            const createMainEmbed = () => {
                const embed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle('🤖 Shenron - Command Help')
                    .setDescription('Welcome to the Dragon Ball RPG bot! Use the buttons below to explore different command categories, or use `!help <category>` for specific information.')
                    .addFields(
                        { 
                            name: '📚 Quick Start', 
                            value: '• Create a character: `!cc "Your Name" saiyan`\n• Check stats: `!stats`\n• Roll dice: `!r 20`\n• Get help: `!help <category>`', 
                            inline: false 
                        },
                        { 
                            name: '💡 Tips', 
                            value: '• Use quotes for names with spaces: `!cc "Son Goku" saiyan`\n• Staff commands require the Staff role\n• Most commands work on your active character', 
                            inline: false 
                        }
                    )
                    .setFooter({ text: 'Click the buttons below to explore command categories!' })
                    .setTimestamp();

                // Add category overview
                let categoryList = '';
                Object.entries(commandCategories).forEach(([name, data]) => {
                    const commandCount = Object.keys(data.commands).length;
                    categoryList += `${data.emoji} **${name}** (${commandCount} commands)\n`;
                });
                
                embed.addFields({ name: '📋 Available Categories', value: categoryList, inline: false });

                return embed;
            };

            const createCategoryEmbed = (categoryName, categoryData) => {
                const embed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle(`${categoryData.emoji} ${categoryName} Commands`)
                    .setDescription(`Detailed information about ${categoryName.toLowerCase()} commands:`)
                    .setFooter({ text: 'Use !help to return to the main menu' })
                    .setTimestamp();

                Object.entries(categoryData.commands).forEach(([commandName, commandInfo]) => {
                    let fieldValue = `**Usage:** \`${commandInfo.usage}\`\n${commandInfo.description}`;
                    
                    if (commandInfo.examples.length > 0) {
                        fieldValue += `\n**Examples:** ${commandInfo.examples.map(ex => `\`${ex}\``).join(', ')}`;
                    }

                    embed.addFields({
                        name: `!${commandName}`,
                        value: fieldValue,
                        inline: false
                    });
                });

                return embed;
            };

            const createButtons = () => {
                const rows = [];
                const categories = Object.keys(commandCategories);
                
                // Create rows of buttons (max 5 buttons per row)
                for (let i = 0; i < categories.length; i += 5) {
                    const row = new ActionRowBuilder();
                    const slice = categories.slice(i, i + 5);
                    
                    slice.forEach(categoryName => {
                        const categoryData = commandCategories[categoryName];
                        const buttonId = `help_${categoryName.toLowerCase().replace(/\s+/g, '_')}`;
                        console.log(`Creating button: ${buttonId} for category: ${categoryName}`); // Debug log
                        row.addComponents(
                            new ButtonBuilder()
                                .setCustomId(buttonId)
                                .setLabel(categoryName)
                                .setEmoji(categoryData.emoji)
                                .setStyle(ButtonStyle.Primary)
                        );
                    });
                    
                    rows.push(row);
                }

                // Add a "Back to Main" button on the last row
                if (rows.length > 0) {
                    rows[rows.length - 1].addComponents(
                        new ButtonBuilder()
                            .setCustomId('help_main')
                            .setLabel('Main Menu')
                            .setEmoji('🏠')
                            .setStyle(ButtonStyle.Secondary)
                    );
                }

                return rows;
            };

            // Send initial help message
            const response = await message.reply({
                embeds: [createMainEmbed()],
                components: createButtons()
            });

            // Handle button interactions
            const collector = response.createMessageComponentCollector({ 
                time: 600000 // 10 minutes
            });

            collector.on('collect', async (interaction) => {
                console.log(`Button clicked: ${interaction.customId} by ${interaction.user.tag}`); // Debug log
                
                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({ 
                        content: 'Only the person who requested help can navigate the menu.', 
                        ephemeral: true 
                    });
                }

                const customId = interaction.customId;
                console.log(`Processing customId: ${customId}`); // Debug log

                if (customId === 'help_main') {
                    console.log('Navigating to main menu'); // Debug log
                    await interaction.update({
                        embeds: [createMainEmbed()],
                        components: createButtons()
                    });
                } else if (customId.startsWith('help_')) {
                    const categoryKey = customId.replace('help_', '');
                    console.log(`Looking for category with key: ${categoryKey}`); // Debug log
                    
                    const categoryMatch = Object.keys(commandCategories).find(cat => 
                        cat.toLowerCase().replace(/\s+/g, '_') === categoryKey
                    );
                    console.log(`Found category match: ${categoryMatch}`); // Debug log

                    if (categoryMatch) {
                        const category = commandCategories[categoryMatch];
                        await interaction.update({
                            embeds: [createCategoryEmbed(categoryMatch, category)],
                            components: [
                                new ActionRowBuilder().addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('help_main')
                                        .setLabel('← Back to Main Menu')
                                        .setStyle(ButtonStyle.Secondary)
                                )
                            ]
                        });
                    } else {
                        console.log(`No category match found for: ${categoryKey}`); // Debug log
                        await interaction.reply({ 
                            content: 'Category not found!', 
                            ephemeral: true 
                        });
                    }
                } else {
                    console.log(`Unknown customId: ${customId}`); // Debug log
                }
            });

            collector.on('error', (error) => {
                console.error('Collector error:', error);
            });

            collector.on('end', async () => {
                try {
                    await response.edit({ components: [] });
                } catch (error) {
                    // Message might have been deleted
                }
            });

        } catch (error) {
            console.error('Error in help command:', error);
            await message.reply('An error occurred while displaying help information.');
        }
    }
};
