const { EmbedBuilder } = require('discord.js');
const { calculateEffectivePL, calculateEffectivePLWithRelease, calculateHealthPercentage, calculateMaxHealth, calculateMaxKi, getCombatBonuses } = require('../utils/calculations');

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
            
            // Check for active Arcosian Resilience racial
            const hasArcosianResilience = await database.get(`
                SELECT is_active FROM character_racials 
                WHERE character_id = ? AND racial_tag = 'aresist' AND is_active = 1
            `, [userData.active_character_id]);

            // Get current form if any
            const currentForm = await database.get(
                'SELECT f.* FROM character_forms cf JOIN forms f ON cf.form_key = f.form_key WHERE cf.character_id = ? AND cf.is_active = 1',
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

            // Get combat bonuses (Zenkai and Majin Magic)
            const combatBonuses = await getCombatBonuses(database, userData.active_character_id, message.channel.id);

            // Calculate effective PL with release percentage
            const effectivePL = await calculateEffectivePLWithRelease(
                database,
                userData.active_character_id,
                userData.base_pl, 
                kiPercentage, 
                formMultiplier, 
                !!hasArcosianResilience,
                combatBonuses.zenkaiBonus,
                combatBonuses.majinMagicBonus
            );

            // Get release percentage for display
            const releaseData = await database.get(
                'SELECT release_percentage FROM characters WHERE id = ?',
                [userData.active_character_id]
            );
            const releasePercentage = releaseData?.release_percentage || 100;

            // Create embed
            const embed = new EmbedBuilder()
                .setColor(0xf39c12)
                .setTitle(`${userData.name}'s Power Level`)
                .setThumbnail(userData.image_url || require('../utils/config').defaultCharacterImage)
                .addFields(
                    { name: 'Base PL', value: userData.base_pl.toString(), inline: true },
                    { name: 'Effective PL', value: effectivePL.toString(), inline: true },
                    { name: 'Release Level', value: `${releasePercentage}%`, inline: true },
                    { name: 'Form Multiplier', value: `${formMultiplier}x`, inline: true },
                    { name: 'Health', value: `${Math.round(healthPercentage)}% (${currentHealth}/${maxHealth})`, inline: true },
                    { name: 'Ki', value: `${Math.round(kiPercentage)}% (${currentKi}/${maxKi})`, inline: true },
                    { name: 'Race', value: userData.race, inline: true }
                )
                .setFooter({ text: `Owner: ${targetUser.username}` })
                .setTimestamp();

            // Add Zenkai bonus if active
            if (combatBonuses.zenkaiBonus > 0) {
                embed.addFields({ 
                    name: 'Zenkai Boost', 
                    value: `+${combatBonuses.zenkaiBonus} PL`, 
                    inline: true 
                });
            }

            // Add Majin Magic bonus if active
            if (combatBonuses.majinMagicBonus > 0) {
                embed.addFields({ 
                    name: 'Majin Magic Boost', 
                    value: `+${combatBonuses.majinMagicBonus} PL`, 
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
