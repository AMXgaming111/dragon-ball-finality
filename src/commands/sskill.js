const { EmbedBuilder } = require('discord.js');
const { staffRoleName } = require('../utils/config');
const { hasStaffRole, parseModifier, applyModifier } = require('../utils/calculations');

module.exports = {
    name: 'sskill',
    description: 'Modify character skill levels (Staff only)',
    async execute(message, args, database) {
        // Check staff permissions
        const member = message.guild.members.cache.get(message.author.id);
        if (!hasStaffRole(member, staffRoleName)) {
            return message.reply('This command requires the Staff role.');
        }

        if (args.length < 4) {
            return message.reply('Usage: `!sskill <@user> <skill> <+/-/*/set> <value>`\nSkills: kic (Ki Control), mm (Magic Mastery)\nExamples: `!sskill @user kic set 1`, `!sskill @user mm + 1`');
        }

        // Parse arguments
        const userMention = args[0];
        const skillAbbr = args[1].toLowerCase();
        const operation = args[2];
        const value = parseFloat(args[3]);

        if (isNaN(value)) {
            return message.reply('Value must be a number.');
        }

        // Validate skill abbreviation
        const skillMap = {
            'kic': { name: 'ki_control', displayName: 'Ki Control', max: 2 },
            'mm': { name: 'magic_mastery', displayName: 'Magic Mastery', max: 4 }
        };

        if (!skillMap[skillAbbr]) {
            return message.reply('Invalid skill! Use: kic (Ki Control), mm (Magic Mastery)');
        }

        const skill = skillMap[skillAbbr];

        // Parse user ID
        const userId = userMention.replace(/[<@!>]/g, '');
        const targetUser = await message.client.users.fetch(userId).catch(() => null);
        if (!targetUser) {
            return message.reply('User not found!');
        }

        try {
            // Get user's active character
            const userData = await database.getUserWithActiveCharacter(userId);
            if (!userData || !userData.active_character_id) {
                return message.reply(`${targetUser.username} doesn't have an active character.`);
            }

            const characterId = userData.active_character_id;
            const characterName = userData.name;
            const currentValue = userData[skill.name];

            // Parse and apply modifier
            const modifier = parseModifier(operation + value);
            if (!modifier) {
                return message.reply('Invalid operation! Use +, -, *, /, or set');
            }

            const newValue = Math.max(0, Math.min(skill.max, Math.floor(applyModifier(currentValue, modifier))));

            // Update the character's skill
            const updateQuery = `UPDATE characters SET ${skill.name} = ? WHERE id = ?`;
            await database.run(updateQuery, [newValue, characterId]);

            // Convert numeric values to display names
            const getSkillDisplayValue = (skillName, value) => {
                if (skillName === 'ki_control') {
                    const kiLevels = ['None', 'Basic', 'Advanced'];
                    return kiLevels[value] || 'Unknown';
                } else if (skillName === 'magic_mastery') {
                    const magicLevels = ['None', 'Basic', 'Specialized', 'Veteran', 'Archmage'];
                    return magicLevels[value] || 'Unknown';
                }
                return value.toString();
            };

            const oldDisplayValue = getSkillDisplayValue(skill.name, currentValue);
            const newDisplayValue = getSkillDisplayValue(skill.name, newValue);

            // Create result embed
            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle('🎓 Skill Modified')
                .setDescription(`Successfully modified **${characterName}**'s skill level.`)
                .addFields(
                    { name: 'Character', value: characterName, inline: true },
                    { name: 'Owner', value: `<@${userId}>`, inline: true },
                    { name: 'Skill', value: skill.displayName, inline: true },
                    { name: 'Old Level', value: oldDisplayValue, inline: true },
                    { name: 'New Level', value: newDisplayValue, inline: true },
                    { name: 'Operation', value: `${operation}${value}`, inline: true }
                )
                .setTimestamp();

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error modifying skill:', error);
            await message.reply('An error occurred while modifying the skill level.');
        }
    }
};
