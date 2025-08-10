const { EmbedBuilder } = require('discord.js');
const { calculateEffectivePL, calculateHealthPercentage, calculateMaxHealth, calculateMaxKi } = require('../utils/calculations');

module.exports = {
    name: 'pl',
    description: 'Display effective power level',
    async execute(message, args, database) {
        let targetUserId = message.author.id;
        let targetUser = message.author;

        // Check if querying another user
        if (args.length > 0) {
            const userMention = args[0];
            const userId = userMention.replace(/[<@!>]/g, '');
            
            targetUser = await message.client.users.fetch(userId).catch(() => null);
            if (!targetUser) {
                return message.reply('User not found!');
            }
            targetUserId = targetUser.id;
        }

        try {
            // Get user's active character with racials
            const userData = await database.getUserWithActiveCharacter(targetUserId);
            if (!userData || !userData.active_character_id) {
                const pronoun = targetUserId === message.author.id ? 'You don\'t' : `${targetUser.username} doesn't`;
                return message.reply(`${pronoun} have an active character.`);
            }

            // Get character racials
            const characterData = await database.getCharacterWithRacials(userData.active_character_id);
            const racials = characterData.racials ? characterData.racials.split(',') : [];
            const hasArcosianResilience = racials.includes('aresist');

            // Get current form if any
            const currentForm = await database.get(
                'SELECT f.* FROM character_current_form ccf JOIN forms f ON ccf.form_key = f.form_key WHERE ccf.character_id = ?',
                [userData.active_character_id]
            );

            // Calculate current health and ki values
            let currentHealth = userData.current_health;
            let currentKi = userData.current_ki;
            let maxHealth = calculateMaxHealth(userData.base_pl, userData.endurance);
            let maxKi = calculateMaxKi(userData.endurance);

            // Apply form modifiers if in a form
            let formMultiplier = 1;
            if (currentForm) {
                // Parse PL modifier
                if (currentForm.pl_modifier) {
                    const plModStr = currentForm.pl_modifier.toString();
                    if (plModStr.startsWith('*')) {
                        formMultiplier = parseFloat(plModStr.slice(1));
                    }
                }
                
                // Recalculate max health with form
                maxHealth = calculateMaxHealth(userData.base_pl, userData.endurance, formMultiplier);
            }

            // Set default values if null
            if (currentHealth === null) currentHealth = maxHealth;
            if (currentKi === null) currentKi = maxKi;

            // Calculate percentages
            const healthPercentage = calculateHealthPercentage(currentHealth, maxHealth);
            const kiPercentage = calculateHealthPercentage(currentKi, maxKi);

            // Check for Zenkai bonus
            let zenkaiBonus = 0;
            if (racials.includes('zenkai')) {
                const zenkaiState = await database.get(`
                    SELECT zenkai_bonus FROM combat_state 
                    WHERE character_id = ? AND channel_id = ?
                `, [userData.active_character_id, message.channel.id]);
                
                if (zenkaiState) {
                    zenkaiBonus = zenkaiState.zenkai_bonus || 0;
                }
            }

            // Calculate effective PL
            const effectivePL = calculateEffectivePL(
                userData.base_pl, 
                kiPercentage, 
                formMultiplier, 
                hasArcosianResilience,
                zenkaiBonus
            );

            // Create embed
            const embed = new EmbedBuilder()
                .setColor(0xf39c12)
                .setTitle(`${userData.name}'s Power Level`)
                .setThumbnail(userData.image_url || require('../utils/config').defaultCharacterImage)
                .addFields(
                    { name: 'Base PL', value: userData.base_pl.toString(), inline: true },
                    { name: 'Effective PL', value: effectivePL.toString(), inline: true },
                    { name: 'Form Multiplier', value: `${formMultiplier}x`, inline: true },
                    { name: 'Health', value: `${Math.round(healthPercentage)}% (${currentHealth}/${maxHealth})`, inline: true },
                    { name: 'Ki', value: `${Math.round(kiPercentage)}% (${currentKi}/${maxKi})`, inline: true },
                    { name: 'Race', value: userData.race, inline: true }
                )
                .setFooter({ text: `Owner: ${targetUser.username}` })
                .setTimestamp();

            // Add Zenkai bonus if active
            if (zenkaiBonus > 0) {
                embed.addFields({ 
                    name: 'Zenkai Boost', 
                    value: `+${zenkaiBonus}% PL`, 
                    inline: true 
                });
            }

            // Add current form if any
            if (currentForm) {
                embed.addFields({ 
                    name: 'Current Form', 
                    value: currentForm.name, 
                    inline: false 
                });
            }

            // Add ki debuff explanation if applicable
            if (kiPercentage < 100) {
                const kiDebuffPercentage = ((userData.base_pl * formMultiplier - effectivePL) / (userData.base_pl * formMultiplier) * 100);
                embed.addFields({ 
                    name: 'Ki Debuff', 
                    value: `${Math.round(kiDebuffPercentage)}% PL reduction from ki loss`, 
                    inline: false 
                });
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error displaying power level:', error);
            await message.reply('An error occurred while retrieving power level information.');
        }
    }
};
