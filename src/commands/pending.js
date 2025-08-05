const { EmbedBuilder } = require('discord.js');
const { cleanupExpiredAttacks } = require('../utils/combat');

module.exports = {
    name: 'pending',
    description: 'Check pending attacks in this channel',
    async execute(message, args, database) {
        try {
            // Clean up expired attacks first
            await cleanupExpiredAttacks(database);

            // Get all pending attacks in this channel
            const pendingAttacks = await database.all(`
                SELECT pa.*, 
                       ac.name as attacker_name,
                       tc.name as target_name
                FROM pending_attacks pa
                JOIN characters ac ON pa.attacker_character_id = ac.id
                JOIN characters tc ON pa.target_character_id = tc.id
                WHERE pa.channel_id = ?
                ORDER BY pa.created_at ASC
            `, [message.channel.id]);

            if (pendingAttacks.length === 0) {
                return message.reply('No pending attacks in this channel.');
            }

            const embed = new EmbedBuilder()
                .setColor(0xf39c12)
                .setTitle('⚔️ Pending Attacks')
                .setDescription(`${pendingAttacks.length} pending attack(s) in this channel:`);

            for (let i = 0; i < pendingAttacks.length && i < 10; i++) {
                const attack = pendingAttacks[i];
                const timeLeft = new Date(attack.expires_at) - new Date();
                const minutesLeft = Math.max(0, Math.floor(timeLeft / 60000));
                
                embed.addFields({
                    name: `${attack.attacker_name} → ${attack.target_name}`,
                    value: `${attack.attack_type} attack (${attack.damage} damage)\nExpires in: ${minutesLeft} minutes`,
                    inline: true
                });
            }

            if (pendingAttacks.length > 10) {
                embed.setFooter({ text: `... and ${pendingAttacks.length - 10} more attacks` });
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in pending command:', error);
            await message.reply('An error occurred while checking pending attacks.');
        }
    }
};
