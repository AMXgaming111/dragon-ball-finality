const { EmbedBuilder } = require('discord.js');
const { hasStaffRole } = require('../utils/calculations');

module.exports = {
    name: 'turn',
    description: 'Manage turn-based combat',
    async execute(message, args, database) {
        try {
            // Handle different subcommands
            if (args.length === 0) {
                // Advance turn
                return await advanceTurn(message, database);
            }

            const subcommand = args[0].toLowerCase();

            if (subcommand === 'order') {
                // Show turn order
                return await showTurnOrder(message, database);
            } else if (subcommand === 'end') {
                // End turn order
                return await endTurnOrder(message, database);
            } else if (subcommand === 'remove' && args[1]) {
                // Remove user from turn order
                return await removeFromTurnOrder(message, args[1], database);
            } else if (subcommand === 'transfer' && args[1]) {
                // Transfer turn order to another channel
                return await transferTurnOrder(message, args[1], database);
            } else if (args.every(arg => arg.startsWith('<@'))) {
                // Create new turn order with mentioned users
                return await createTurnOrder(message, args, database);
            } else if (args[0].startsWith('<@')) {
                // Add user to existing turn order
                return await addToTurnOrder(message, args[0], database);
            }

            return message.reply('Usage: `!turn <@user1> <@user2> ...` to create turn order\n' +
                               '`!turn` to advance turn\n' +
                               '`!turn order` to show current order\n' +
                               '`!turn remove <@user>` to remove user\n' +
                               '`!turn end` to end combat\n' +
                               '`!turn transfer <#channel>` to transfer combat');

        } catch (error) {
            console.error('Error in turn command:', error);
            await message.reply('An error occurred while managing turns.');
        }
    }
};

async function createTurnOrder(message, userMentions, database) {
    const channelId = message.channel.id;
    
    // Check if turn order already exists in this channel
    const existingOrder = await database.get(
        'SELECT * FROM turn_orders WHERE channel_id = ?',
        [channelId]
    );

    if (existingOrder) {
        return message.reply('A turn order already exists in this channel. Use `!turn end` to end it first.');
    }

    // Parse user mentions and get their characters
    const participants = [];
    for (const mention of userMentions) {
        const userId = mention.replace(/[<@!>]/g, '');
        const user = await message.client.users.fetch(userId).catch(() => null);
        if (!user) continue;

        const userData = await database.getUserWithActiveCharacter(userId);
        if (!userData || !userData.active_character_id) {
            return message.reply(`${user.username} doesn't have an active character.`);
        }

        participants.push({
            userId: userId,
            username: user.username,
            characterName: userData.name,
            characterId: userData.active_character_id
        });
    }

    if (participants.length < 2) {
        return message.reply('You need at least 2 participants for a turn order.');
    }

    // Create turn order in database
    await database.run(
        'INSERT INTO turn_orders (channel_id, current_turn, current_round, participants) VALUES (?, ?, ?, ?)',
        [channelId, 0, 1, JSON.stringify(participants)]
    );

    // Create embed showing the new turn order
    const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('⚔️ Turn Order Created')
        .setDescription('Combat has begun!')
        .addFields(
            { name: 'Current Turn', value: `**${participants[0].characterName}** (${participants[0].username})`, inline: false },
            { name: 'Round', value: '1', inline: true },
            { name: 'Participants', value: participants.map((p, i) => `${i + 1}. ${p.characterName}`).join('\n'), inline: false }
        );

    await message.reply({ embeds: [embed] });
}

async function addToTurnOrder(message, userMention, database) {
    const channelId = message.channel.id;
    const userId = userMention.replace(/[<@!>]/g, '');
    
    // Check if turn order exists
    const turnOrder = await database.get(
        'SELECT * FROM turn_orders WHERE channel_id = ?',
        [channelId]
    );

    if (!turnOrder) {
        return message.reply('No turn order exists in this channel. Create one with `!turn <@user1> <@user2> ...`');
    }

    const user = await message.client.users.fetch(userId).catch(() => null);
    if (!user) {
        return message.reply('User not found!');
    }

    const userData = await database.getUserWithActiveCharacter(userId);
    if (!userData || !userData.active_character_id) {
        return message.reply(`${user.username} doesn't have an active character.`);
    }

    // Parse existing participants
    const participants = JSON.parse(turnOrder.participants);
    
    // Check if user is already in turn order
    if (participants.some(p => p.userId === userId)) {
        return message.reply(`${user.username} is already in the turn order.`);
    }

    // Add new participant
    participants.push({
        userId: userId,
        username: user.username,
        characterName: userData.name,
        characterId: userData.active_character_id
    });

    // Update database
    await database.run(
        'UPDATE turn_orders SET participants = ? WHERE channel_id = ?',
        [JSON.stringify(participants), channelId]
    );

    const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('➕ Added to Turn Order')
        .setDescription(`**${userData.name}** (${user.username}) has joined the combat!`)
        .addFields(
            { name: 'Position', value: participants.length.toString(), inline: true }
        );

    await message.reply({ embeds: [embed] });
}

async function removeFromTurnOrder(message, userMention, database) {
    const channelId = message.channel.id;
    const userId = userMention.replace(/[<@!>]/g, '');
    
    // Check if turn order exists
    const turnOrder = await database.get(
        'SELECT * FROM turn_orders WHERE channel_id = ?',
        [channelId]
    );

    if (!turnOrder) {
        return message.reply('No turn order exists in this channel.');
    }

    const user = await message.client.users.fetch(userId).catch(() => null);
    if (!user) {
        return message.reply('User not found!');
    }

    // Parse existing participants
    let participants = JSON.parse(turnOrder.participants);
    const initialCount = participants.length;
    
    // Remove participant
    participants = participants.filter(p => p.userId !== userId);

    if (participants.length === initialCount) {
        return message.reply(`${user.username} is not in the turn order.`);
    }

    if (participants.length < 2) {
        // End combat if less than 2 participants
        await database.run('DELETE FROM turn_orders WHERE channel_id = ?', [channelId]);
        return message.reply('Turn order ended - not enough participants remaining.');
    }

    // Adjust current turn if necessary
    let currentTurn = turnOrder.current_turn;
    if (currentTurn >= participants.length) {
        currentTurn = 0;
    }

    // Update database
    await database.run(
        'UPDATE turn_orders SET participants = ?, current_turn = ? WHERE channel_id = ?',
        [JSON.stringify(participants), currentTurn, channelId]
    );

    const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('➖ Removed from Turn Order')
        .setDescription(`**${user.username}** has left the combat!`);

    await message.reply({ embeds: [embed] });
}

async function advanceTurn(message, database) {
    const channelId = message.channel.id;
    
    // Check if turn order exists
    const turnOrder = await database.get(
        'SELECT * FROM turn_orders WHERE channel_id = ?',
        [channelId]
    );

    if (!turnOrder) {
        return message.reply('No turn order exists in this channel.');
    }

    const participants = JSON.parse(turnOrder.participants);
    let currentTurn = turnOrder.current_turn;
    let currentRound = turnOrder.current_round;

    // Apply end-of-turn effects for current character
    const currentParticipant = participants[currentTurn];
    await applyEndOfTurnEffects(currentParticipant.characterId, database);

    // Advance turn
    currentTurn++;
    if (currentTurn >= participants.length) {
        currentTurn = 0;
        currentRound++;
    }

    // Update database
    await database.run(
        'UPDATE turn_orders SET current_turn = ?, current_round = ? WHERE channel_id = ?',
        [currentTurn, currentRound, channelId]
    );

    const nextParticipant = participants[currentTurn];
    
    const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('🔄 Turn Advanced')
        .setDescription(`It's now **${nextParticipant.characterName}**'s turn!`)
        .addFields(
            { name: 'Current Player', value: `${nextParticipant.characterName} (${nextParticipant.username})`, inline: true },
            { name: 'Round', value: currentRound.toString(), inline: true }
        );

    await message.reply({ embeds: [embed] });
}

async function showTurnOrder(message, database) {
    const channelId = message.channel.id;
    
    // Check if turn order exists
    const turnOrder = await database.get(
        'SELECT * FROM turn_orders WHERE channel_id = ?',
        [channelId]
    );

    if (!turnOrder) {
        return message.reply('No turn order exists in this channel.');
    }

    const participants = JSON.parse(turnOrder.participants);
    const currentTurn = turnOrder.current_turn;
    const currentRound = turnOrder.current_round;

    const orderText = participants.map((p, i) => {
        const indicator = i === currentTurn ? '👉' : '   ';
        return `${indicator} ${i + 1}. ${p.characterName} (${p.username})`;
    }).join('\n');

    const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('📋 Turn Order')
        .setDescription('```' + orderText + '```')
        .addFields(
            { name: 'Current Turn', value: `**${participants[currentTurn].characterName}**`, inline: true },
            { name: 'Round', value: currentRound.toString(), inline: true }
        );

    await message.reply({ embeds: [embed] });
}

async function endTurnOrder(message, database) {
    const channelId = message.channel.id;
    
    // Check if turn order exists
    const turnOrder = await database.get(
        'SELECT * FROM turn_orders WHERE channel_id = ?',
        [channelId]
    );

    if (!turnOrder) {
        return message.reply('No turn order exists in this channel.');
    }

    // Delete turn order
    await database.run('DELETE FROM turn_orders WHERE channel_id = ?', [channelId]);

    const embed = new EmbedBuilder()
        .setColor(0x95a5a6)
        .setTitle('🏁 Combat Ended')
        .setDescription('Turn order has been ended.');

    await message.reply({ embeds: [embed] });
}

async function transferTurnOrder(message, channelMention, database) {
    const currentChannelId = message.channel.id;
    
    // Parse target channel
    let targetChannelId = channelMention.replace(/[<#>]/g, '');
    
    // Check if current turn order exists
    const turnOrder = await database.get(
        'SELECT * FROM turn_orders WHERE channel_id = ?',
        [currentChannelId]
    );

    if (!turnOrder) {
        return message.reply('No turn order exists in this channel.');
    }

    // Check if target channel already has a turn order
    const existingTargetOrder = await database.get(
        'SELECT * FROM turn_orders WHERE channel_id = ?',
        [targetChannelId]
    );

    if (existingTargetOrder) {
        return message.reply('Target channel already has an active turn order.');
    }

    // Only staff can transfer turn orders
    if (!hasStaffRole(message.member)) {
        return message.reply('Only staff members can transfer turn orders.');
    }

    // Transfer turn order
    await database.run(
        'UPDATE turn_orders SET channel_id = ? WHERE channel_id = ?',
        [targetChannelId, currentChannelId]
    );

    const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('📤 Turn Order Transferred')
        .setDescription(`Combat has been moved to <#${targetChannelId}>`);

    await message.reply({ embeds: [embed] });
}

async function applyEndOfTurnEffects(characterId, database) {
    // Get character with racials and forms
    const character = await database.get(`
        SELECT c.*, 
               GROUP_CONCAT(cr.racial_name) as racials,
               cf.form_name, cf.form_data
        FROM characters c
        LEFT JOIN character_racials cr ON c.id = cr.character_id
        LEFT JOIN character_forms cf ON c.id = cf.character_id AND cf.is_active = 1
        WHERE c.id = ?
        GROUP BY c.id
    `, [characterId]);

    if (!character) return;

    let healthChange = 0;
    let kiChange = 0;
    const racials = character.racials ? character.racials.split(',') : [];

    // Apply racial effects
    if (racials.includes('mregen')) {
        // Majin Regeneration - 10% health unless at 100%
        const maxHealth = character.base_pl * character.endurance;
        const currentHealth = character.current_health || maxHealth;
        
        if (currentHealth < maxHealth) {
            healthChange += Math.floor(maxHealth * 0.1);
        }
    }

    // Apply form drains/gains
    if (character.form_data) {
        const formData = JSON.parse(character.form_data);
        
        if (formData.ki_drain) {
            const baseDrain = formData.ki_drain;
            const actualDrain = Math.max(1, baseDrain * (100 / character.control));
            kiChange -= actualDrain;
        }
        
        if (formData.health_drain) {
            healthChange -= formData.health_drain;
        }
    }

    // Apply changes
    if (healthChange !== 0) {
        const maxHealth = character.base_pl * character.endurance;
        const currentHealth = character.current_health || maxHealth;
        const newHealth = currentHealth + healthChange;
        
        await database.run(
            'UPDATE characters SET current_health = ? WHERE id = ?',
            [newHealth, characterId]
        );
    }

    if (kiChange !== 0) {
        const currentKi = character.current_ki || character.endurance;
        const newKi = Math.max(0, currentKi + kiChange);
        
        await database.run(
            'UPDATE characters SET current_ki = ? WHERE id = ?',
            [newKi, characterId]
        );
    }
}
