const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'r',
    description: 'Roll dice or character stats',
    async execute(message, args, database) {
        if (args.length === 0) {
            return message.reply('Usage: `!r <stat/number>` or `!r <stat/number> <modifier>` or `!r <stat/number> -d <count>`\nStats: str, def, agi, end, cont');
        }

        try {
            // Parse arguments
            let target = args[0].toLowerCase();
            let modifier = 0;
            let isMultiplier = false;
            let diceCount = 1;

            // Check for dice count (-d flag)
            const diceIndex = args.findIndex(arg => arg === '-d');
            if (diceIndex !== -1 && args[diceIndex + 1]) {
                diceCount = parseInt(args[diceIndex + 1]);
                if (isNaN(diceCount) || diceCount < 1 || diceCount > 20) {
                    return message.reply('Dice count must be between 1 and 20.');
                }
                // Remove -d and count from args
                args.splice(diceIndex, 2);
            }

            // Check for modifier
            if (args.length > 1 && !args.includes('-d')) {
                const modifierStr = args[1];
                if (modifierStr.startsWith('*')) {
                    modifier = parseFloat(modifierStr.slice(1));
                    isMultiplier = true;
                } else if (modifierStr.startsWith('+')) {
                    modifier = parseFloat(modifierStr.slice(1));
                } else if (modifierStr.startsWith('-')) {
                    modifier = -parseFloat(modifierStr.slice(1));
                } else {
                    modifier = parseFloat(modifierStr);
                }

                if (isNaN(modifier)) {
                    return message.reply('Invalid modifier!');
                }
            }

            const statMap = {
                'str': 'strength',
                'def': 'defense', 
                'agi': 'agility',
                'end': 'endurance',
                'cont': 'control'
            };

            let rollResults = [];
            let rollDescription = '';

            if (statMap[target]) {
                // Rolling a character stat
                const userData = await database.getUserWithActiveCharacter(message.author.id);
                if (!userData || !userData.active_character_id) {
                    return message.reply('You don\'t have an active character.');
                }

                const statName = statMap[target];
                const statValue = userData[statName];
                rollDescription = `${statName.charAt(0).toUpperCase() + statName.slice(1)} (${statValue})`;

                for (let i = 0; i < diceCount; i++) {
                    let roll = Math.floor(Math.random() * statValue) + 1;
                    
                    if (isMultiplier) {
                        roll = Math.max(1, Math.floor(roll * modifier)); // Ensure minimum roll of 1
                    } else if (modifier !== 0) {
                        roll = Math.max(1, roll + modifier); // Ensure minimum roll of 1
                    }
                    
                    rollResults.push(roll);
                }

            } else {
                // Rolling a number
                const maxValue = parseInt(target);
                if (isNaN(maxValue) || maxValue < 1) {
                    return message.reply('Invalid number! Must be a positive integer.');
                }

                rollDescription = `d${maxValue}`;

                for (let i = 0; i < diceCount; i++) {
                    let roll = Math.floor(Math.random() * maxValue) + 1;
                    
                    if (isMultiplier) {
                        roll = Math.max(1, Math.floor(roll * modifier)); // Ensure minimum roll of 1
                    } else if (modifier !== 0) {
                        roll = Math.max(1, roll + modifier); // Ensure minimum roll of 1
                    }
                    
                    rollResults.push(roll);
                }
            }

            // Create embed
            const embed = new EmbedBuilder()
                .setColor(0xe67e22)
                .setTitle('🎲 Dice Roll')
                .addFields(
                    { name: 'Roller', value: message.author.username, inline: true },
                    { name: 'Roll Type', value: rollDescription, inline: true },
                    { name: 'Count', value: diceCount.toString(), inline: true }
                );

            // Add modifier info if present
            if (modifier !== 0) {
                const modifierText = isMultiplier ? `×${modifier}` : (modifier > 0 ? `+${modifier}` : modifier.toString());
                embed.addFields({ name: 'Modifier', value: modifierText, inline: true });
            }

            // Display results
            if (diceCount === 1) {
                embed.addFields({ name: 'Result', value: `**${rollResults[0]}**`, inline: false });
            } else {
                const total = rollResults.reduce((sum, roll) => sum + roll, 0);
                const average = Math.round(total / rollResults.length * 100) / 100;
                
                let resultsText = rollResults.join(', ');
                if (resultsText.length > 1000) {
                    resultsText = resultsText.substring(0, 997) + '...';
                }
                
                embed.addFields(
                    { name: 'Results', value: resultsText, inline: false },
                    { name: 'Total', value: total.toString(), inline: true },
                    { name: 'Average', value: average.toString(), inline: true },
                    { name: 'Highest', value: Math.max(...rollResults).toString(), inline: true }
                );
            }

            embed.setTimestamp();

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error rolling dice:', error);
            await message.reply('An error occurred while rolling dice.');
        }
    }
};
