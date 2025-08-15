// Server security utilities
const { EmbedBuilder } = require('discord.js');

// Whitelist of allowed server IDs (add your server ID here)
const ALLOWED_SERVERS = [
    // Add your server ID here, e.g.:
    // '1234567890123456789',
    // You can add multiple server IDs
];

// Owner user ID for notifications (optional)
const OWNER_USER_ID = process.env.OWNER_USER_ID || null;

/**
 * Check if a server is authorized to use the bot
 * @param {string} serverId - Discord server ID
 * @returns {boolean} - Whether the server is authorized
 */
function isServerAuthorized(serverId) {
    // If no servers are whitelisted, allow all (for initial setup)
    if (ALLOWED_SERVERS.length === 0) {
        return true;
    }
    
    return ALLOWED_SERVERS.includes(serverId);
}

/**
 * Handle unauthorized server access
 * @param {Guild} guild - Discord guild object
 * @param {Client} client - Discord client
 */
async function handleUnauthorizedServer(guild, client) {
    console.log(`🚫 Unauthorized server detected: ${guild.name} (${guild.id})`);
    
    try {
        // Try to send a message to the general/system channel
        let notificationChannel = null;
        
        // Find a suitable channel to send the notification
        const channels = guild.channels.cache.filter(c => c.type === 0); // Text channels only
        notificationChannel = channels.find(c => 
            c.name.includes('general') || 
            c.name.includes('bot') || 
            c.name.includes('system')
        ) || channels.first();
        
        if (notificationChannel && notificationChannel.permissionsFor(guild.members.me)?.has('SendMessages')) {
            const embed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('🚫 Unauthorized Bot Usage')
                .setDescription('This bot is private and restricted to authorized servers only.')
                .addFields(
                    { name: 'Server', value: guild.name, inline: true },
                    { name: 'Members', value: guild.memberCount.toString(), inline: true },
                    { name: 'Action', value: 'Bot will leave in 10 seconds', inline: true }
                )
                .setFooter({ text: 'Contact the bot owner for authorization' })
                .setTimestamp();
            
            await notificationChannel.send({ embeds: [embed] });
        }
        
        // Notify bot owner if configured
        if (OWNER_USER_ID) {
            try {
                const owner = await client.users.fetch(OWNER_USER_ID);
                const ownerEmbed = new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle('🚨 Unauthorized Server Access')
                    .setDescription('Your bot was invited to an unauthorized server.')
                    .addFields(
                        { name: 'Server Name', value: guild.name, inline: true },
                        { name: 'Server ID', value: guild.id, inline: true },
                        { name: 'Member Count', value: guild.memberCount.toString(), inline: true },
                        { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true }
                    )
                    .setFooter({ text: 'Bot automatically left the server' })
                    .setTimestamp();
                
                await owner.send({ embeds: [ownerEmbed] });
            } catch (error) {
                console.log('Could not notify owner:', error.message);
            }
        }
        
        // Wait 10 seconds then leave
        setTimeout(async () => {
            try {
                await guild.leave();
                console.log(`✅ Left unauthorized server: ${guild.name}`);
            } catch (error) {
                console.error('Error leaving server:', error);
            }
        }, 10000);
        
    } catch (error) {
        console.error('Error handling unauthorized server:', error);
        // Still try to leave even if notification failed
        try {
            await guild.leave();
        } catch (leaveError) {
            console.error('Error leaving server:', leaveError);
        }
    }
}

/**
 * Add a server to the whitelist (for dynamic authorization)
 * @param {string} serverId - Server ID to authorize
 * @returns {boolean} - Success status
 */
function authorizeServer(serverId) {
    if (!ALLOWED_SERVERS.includes(serverId)) {
        ALLOWED_SERVERS.push(serverId);
        return true;
    }
    return false;
}

/**
 * Remove a server from the whitelist
 * @param {string} serverId - Server ID to deauthorize
 * @returns {boolean} - Success status
 */
function deauthorizeServer(serverId) {
    const index = ALLOWED_SERVERS.indexOf(serverId);
    if (index > -1) {
        ALLOWED_SERVERS.splice(index, 1);
        return true;
    }
    return false;
}

/**
 * Get list of authorized servers
 * @returns {string[]} - Array of authorized server IDs
 */
function getAuthorizedServers() {
    return [...ALLOWED_SERVERS];
}

module.exports = {
    isServerAuthorized,
    handleUnauthorizedServer,
    authorizeServer,
    deauthorizeServer,
    getAuthorizedServers,
    ALLOWED_SERVERS
};
