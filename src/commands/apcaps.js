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
            
            // Calculate current caps with all bonuses applied
            const currentCaps = calculateStatCaps(
                userData.race,
                userData.primary_specialization,
                userData.secondary_specialization,
                userData.control
            );

            // Determine advanced ki control multiplier
            let kiControlMultiplier = 1;
            let kiControlStatus = '❌ Not unlocked';
            
            if (userData.control >= 40) {
                kiControlMultiplier = 1.5;
                kiControlStatus = '🔥 **Master Level** (1.5x multiplier)';
            } else if (userData.control >= 25) {
                kiControlMultiplier = 1.25;
                kiControlStatus = '⚡ **Advanced Level** (1.25x multiplier)';
            } else if (userData.control >= 10) {
                kiControlMultiplier = 1.1;
                kiControlStatus = '✨ **Basic Level** (1.1x multiplier)';
            } else {
                kiControlStatus = '❌ Not unlocked (Requires 10+ Control)';
            }
            
            // Build the embed
            const embed = new EmbedBuilder()
                .setColor(0xe67e22)
                .setTitle(`${characterName}'s Attribute Caps & AP System`)
                .setDescription('Comprehensive breakdown of your training limits and progression system')
                .setTimestamp();

            // Current stats vs caps
            const attributes = ['strength', 'defense', 'agility', 'endurance', 'control'];
            let statsText = '';
            let baseText = '';
            let finalText = '';

            for (const attr of attributes) {
                const current = userData[attr] || 0;
                const baseCap = baseCaps[attr];
                const finalCap = currentCaps[attr];
                const atCap = current >= finalCap ? '🔴' : current >= finalCap * 0.8 ? '🟡' : '🟢';
                
                const attrName = attr.charAt(0).toUpperCase() + attr.slice(1);
                statsText += `${atCap} **${attrName}:** ${current}/${finalCap}\n`;
                baseText += `**${attrName}:** ${baseCap}\n`;
                finalText += `**${attrName}:** ${finalCap}\n`;
            }

            embed.addFields(
                { 
                    name: '📊 Current Progress', 
                    value: statsText.trim(), 
                    inline: true 
                },
                { 
                    name: `🧬 ${race} Base Caps`, 
                    value: baseText.trim(), 
                    inline: true 
                },
                { 
                    name: '🎯 Final Training Caps', 
                    value: finalText.trim(), 
                    inline: true 
                }
            );

            // Advanced Ki Control information
            embed.addFields({
                name: '🔥 Advanced Ki Control',
                value: `**Status:** ${kiControlStatus}\n**Effect:** Multiplies all attribute caps (except Control itself)\n**Requirements:** 10/25/40 Control for tiers`,
                inline: false
            });

            // Add specialization information
            if (userData.primary_specialization || userData.secondary_specialization) {
                let specializationText = '';
                
                if (userData.primary_specialization) {
                    const bonus = 20;  // Fixed +20 bonus for primary
                    specializationText += `🥇 **Primary ${userData.primary_specialization.charAt(0).toUpperCase() + userData.primary_specialization.slice(1)}:** +${bonus} cap\n`;
                }
                
                if (userData.secondary_specialization) {
                    const bonus = 10;  // Fixed +10 bonus for secondary
                    specializationText += `🥈 **Secondary ${userData.secondary_specialization.charAt(0).toUpperCase() + userData.secondary_specialization.slice(1)}:** +${bonus} cap\n`;
                }
                
                specializationText += '\n*Specializations provide flat bonuses before Ki Control multipliers*';
                
                embed.addFields({ 
                    name: '🎯 Specialization Bonuses', 
                    value: specializationText, 
                    inline: false 
                });
            } else {
                embed.addFields({ 
                    name: '🎯 Specializations', 
                    value: '❌ None set\n💡 Use `!specialize <primary> <secondary>` to unlock bonus caps!\n\n**Benefits:**\n• Primary: +20 cap bonus\n• Secondary: +10 cap bonus', 
                    inline: false 
                });
            }

            // Add AP information with usage guide
            const apValue = userData.ap || 0;
            let apText = `**Available:** ${apValue} AP\n`;
            
            if (apValue > 0) {
                apText += '**Ready to train!** 💪\n\n';
            } else {
                apText += '**No AP available** ⏸️\n\n';
            }
            
            apText += '**Usage Commands:**\n';
            apText += '• `!ap <stat> <amount>` - Spend AP\n';
            apText += '• `!ap str 5` - Add 5 to Strength\n';
            apText += '• `!ap` - View current AP\n\n';
            apText += '*AP training respects all cap limits shown above*';

            embed.addFields({
                name: '💎 Attribute Points System',
                value: apText,
                inline: false
            });

            // Progress indicators
            let progressText = '';
            let totalUsed = 0;
            let totalCaps = 0;
            
            for (const attr of attributes) {
                const current = userData[attr] || 0;
                const cap = currentCaps[attr];
                totalUsed += current;
                totalCaps += cap;
                
                const percentage = Math.round((current / cap) * 100);
                if (percentage >= 100) {
                    progressText += `🔴 ${attr.charAt(0).toUpperCase() + attr.slice(1)}: **MAXED** (${percentage}%)\n`;
                } else if (percentage >= 80) {
                    progressText += `🟡 ${attr.charAt(0).toUpperCase() + attr.slice(1)}: Near cap (${percentage}%)\n`;
                } else if (percentage >= 50) {
                    progressText += `🟢 ${attr.charAt(0).toUpperCase() + attr.slice(1)}: Good progress (${percentage}%)\n`;
                } else {
                    progressText += `⚪ ${attr.charAt(0).toUpperCase() + attr.slice(1)}: Room to grow (${percentage}%)\n`;
                }
            }

            const overallProgress = Math.round((totalUsed / totalCaps) * 100);
            progressText += `\n📈 **Overall Progress:** ${overallProgress}% (${totalUsed}/${totalCaps})`;

            embed.addFields({
                name: '📈 Training Progress Overview',
                value: progressText,
                inline: false
            });

            // Add footer with helpful information
            embed.setFooter({ 
                text: '💡 Staff can bypass caps with !sadd. These caps only apply to !ap training commands.' 
            });

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in apcaps command:', error);
            await message.reply('❌ There was an error processing your request. Please try again.');
        }
    }
};