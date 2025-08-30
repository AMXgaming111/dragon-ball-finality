const { EmbedBuilder } = require('discord.js');
const { staffRoleName } = require('../utils/config');
const { hasStaffRole, calculateMaxHealthForCharacter, calculateMaxKi } = require('../utils/calculations');

module.exports = {
    name: 'heal',
    description: 'Restore a character\'s health and ki to 100% (Staff only)',
    async execute(message, args, database) {
        // Check staff permissions
        const member = message.guild.members.cache.get(message.author.id);
        if (!hasStaffRole(member, staffRoleName)) {
            return message.reply('This command requires the Staff role.');
        }

        if (args.length < 1) {
            return message.reply('Usage: `!heal <@user>`\nExample: `!heal @user`');
        }

        // Parse user mention
        const userMention = args[0];
        const userId = userMention.replace(/[<@!>]/g, '');
        const targetUser = await message.client.users.fetch(userId).catch(() => null);
        if (!targetUser) {
            return message.reply('User not found!');
        }

        try {
            // Get user's active character with form data
            const userData = await database.getUserWithActiveCharacter(userId);
            if (!userData || !userData.active_character_id) {
                return message.reply(`${targetUser.username} doesn't have an active character.`);
            }

            // Get active form data for health/ki calculations
            const activeForm = await database.get(`
                SELECT f.name, f.pl_modifier, f.endurance_modifier, cf.is_active
                FROM character_forms cf
                JOIN forms f ON cf.form_key = f.form_key
                WHERE cf.character_id = ? AND cf.is_active = 1
                LIMIT 1
            `, [userData.active_character_id]);

            let enduranceModifier = 0;
            let basePLModifier = 1;
            let formName = null;

            if (activeForm) {
                formName = activeForm.name;
                // Parse the old-style form modifiers
                if (activeForm.pl_modifier) {
                    // Parse modifier like "*5" or "+100"
                    const plMod = activeForm.pl_modifier;
                    if (plMod.startsWith('*')) {
                        basePLModifier = parseFloat(plMod.substring(1)) || 1;
                    } else if (plMod.startsWith('+')) {
                        basePLModifier = 1 + (parseFloat(plMod.substring(1)) || 0);
                    }
                }
                if (activeForm.endurance_modifier) {
                    // Parse modifier like "+40" or "-10"
                    const endMod = activeForm.endurance_modifier;
                    if (endMod.startsWith('+')) {
                        enduranceModifier = parseFloat(endMod.substring(1)) || 0;
                    } else if (endMod.startsWith('-')) {
                        enduranceModifier = -(parseFloat(endMod.substring(1)) || 0);
                    }
                }
            }

            // Calculate modified stats
            const modifiedBasePL = userData.base_pl * basePLModifier;
            const modifiedEndurance = userData.endurance + enduranceModifier;
            
            // Calculate max health and ki with form modifications using new system
            const maxHealth = await calculateMaxHealthForCharacter(database, userData.active_character_id, modifiedBasePL, modifiedEndurance, basePLModifier);
            const maxKi = modifiedEndurance;

            // Update health and ki to 100%
            await database.run(
                'UPDATE characters SET current_health = ?, current_ki = ? WHERE id = ?',
                [maxHealth, maxKi, userData.active_character_id]
            );

            // Create success embed
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🌟 Character Healed')
                .addFields(
                    { name: 'Character', value: userData.name, inline: true },
                    { name: 'Player', value: targetUser.username, inline: true },
                    { name: 'Form', value: formName || 'Base Form', inline: true },
                    { name: 'Health', value: `${maxHealth.toLocaleString()}/${maxHealth.toLocaleString()} (100%)`, inline: true },
                    { name: 'Ki', value: `${maxKi.toLocaleString()}/${maxKi.toLocaleString()} (100%)`, inline: true },
                    { name: 'Healed By', value: message.author.username, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Character fully restored' });

            await message.reply({ embeds: [embed] });
            console.log(`Staff ${message.author.username} healed ${targetUser.username}'s character ${userData.name} to full health and ki`);

        } catch (error) {
            console.error('Error in heal command:', error);
            await message.reply('An error occurred while healing the character.');
        }
    }
};
