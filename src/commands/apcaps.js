const { EmbedBuilder } = require('discord.js');
const { calculateStatCaps } = require('../utils/calculations');
const { racialCaps } = require('../utils/config');

module.exports = {
    name: 'apcaps',
    description: 'View detailed attribute caps and AP system information',
    async execute(message, args, database) {
        try {
            // Get user's active character
            const userData = await database.getUserWithActiveCharacter(message.author.id);
            if (!userData || !userData.active_character_id) {
                return message.reply("You don't have an active character.");
            }

            const characterName = userData.name;
            const race = userData.race;
            const baseCaps = racialCaps[race];
            const currentCaps = calculateStatCaps(userData);

            // Calculate advanced ki control multiplier
            const hasAdvancedKi = userData.ki_control >= 2;
            
            // Build the embed
            const embed = new EmbedBuilder()
                .setColor(0xe67e22)
                .setTitle(`${characterName}'s Attribute Caps`)
                .setDescription('Detailed breakdown of your attribute caps and modifiers')
                .addFields(
                    { 
                        name: '📊 Current Stats vs Caps', 
                        value: `**Strength:** ${userData.strength}/${currentCaps.strength}\n**Defense:** ${userData.defense}/${currentCaps.defense}\n**Agility:** ${userData.agility}/${currentCaps.agility}\n**Endurance:** ${userData.endurance}/${currentCaps.endurance}\n**Control:** ${userData.control}/${currentCaps.control}`, 
                        inline: true 
                    },
                    { 
                        name: '🧬 Base Racial Caps', 
                        value: `**Strength:** ${baseCaps.strength}\n**Defense:** ${baseCaps.defense}\n**Agility:** ${baseCaps.agility}\n**Endurance:** ${baseCaps.endurance}\n**Control:** ${baseCaps.control}`, 
                        inline: true 
                    },
                    { 
                        name: '⚡ Advanced Ki Control', 
                        value: hasAdvancedKi ? '✅ Active\n(2x caps except control)' : '❌ Not unlocked\n(Requires ki_control ≥ 2)', 
                        inline: false 
                    }
                );

            // Add specialization information
            if (userData.primary_specialization || userData.secondary_specialization) {
                // Check if character has enhanced specialization (Otherworlder)
                const isOtherworlder = userData.race === 'Otherworlder';
                const primaryMultiplier = isOtherworlder ? 0.8 : 0.2;
                const secondaryMultiplier = isOtherworlder ? 0.4 : 0.1;
                const primaryPercent = isOtherworlder ? '80%' : '20%';
                const secondaryPercent = isOtherworlder ? '40%' : '10%';
                
                let specializationText = '';
                if (userData.primary_specialization) {
                    const primaryCap = baseCaps[userData.primary_specialization];
                    const bonusCap = Math.floor(primaryCap * primaryMultiplier);
                    specializationText += `**Primary ${userData.primary_specialization.charAt(0).toUpperCase() + userData.primary_specialization.slice(1)}:** +${bonusCap} cap (+${primaryPercent})`;
                }
                if (userData.secondary_specialization) {
                    if (specializationText) specializationText += '\n';
                    const secondaryCap = baseCaps[userData.secondary_specialization];
                    const bonusCap = Math.floor(secondaryCap * secondaryMultiplier);
                    specializationText += `**Secondary ${userData.secondary_specialization.charAt(0).toUpperCase() + userData.secondary_specialization.slice(1)}:** +${bonusCap} cap (+${secondaryPercent})`;
                }
                
                // Add enhanced specialization note for Otherworlder
                if (isOtherworlder) {
                    specializationText += '\n\n✨ **Enhanced Specialization** (Otherworlder)';
                }
                
                embed.addFields({ name: '🎯 Specialization Bonuses', value: specializationText, inline: false });
            } else {
                embed.addFields({ name: '🎯 Specializations', value: 'None set\nUse `!specialize` to set specializations', inline: false });
            }

            // Add AP information
            embed.addFields(
                { 
                    name: '💎 Attribute Points (AP)', 
                    value: `**Available:** ${userData.ap || 0}\n**Use:** \`!ap <stat> <amount>\`\n**Example:** \`!ap str 5\``, 
                    inline: false 
                }
            );

            // Add footer with helpful information
            embed.setFooter({ 
                text: 'Staff can bypass caps with !sadd commands. These caps only apply to !ap usage.' 
            }).setTimestamp();

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in apcaps command:', error);
            await message.reply('There was an error processing your request. Please try again.');
        }
    }
};