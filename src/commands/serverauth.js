const { EmbedBuilder } = require('discord.js');
const { staffRoleName } = require('../utils/config');
const { hasStaffRole } = require('../utils/calculations');
const { 
    isServerAuthorized, 
    authorizeServer, 
    deauthorizeServer, 
    getAuthorizedServers 
} = require('../utils/serverSecurity');

module.exports = {
    name: 'serverauth',
    description: 'Manage server authorization (Staff only)',
    async execute(message, args, database) {
        // Check staff permissions
        const member = message.guild.members.cache.get(message.author.id);
        if (!hasStaffRole(member, staffRoleName)) {
            return message.reply('This command requires the Staff role.');
        }

        if (args.length < 1) {
            return message.reply('Usage: `!serverauth <add/remove/list/check> [server_id]`\nExamples:\n`!serverauth add 1234567890123456789`\n`!serverauth list`\n`!serverauth check`');
        }

        const action = args[0].toLowerCase();

        try {
            switch (action) {
                case 'add':
                case 'authorize':
                    if (args.length < 2) {
                        return message.reply('Usage: `!serverauth add <server_id>`');
                    }
                    
                    const serverIdToAdd = args[1];
                    if (authorizeServer(serverIdToAdd)) {
                        const embed = new EmbedBuilder()
                            .setColor(0x00ff00)
                            .setTitle('✅ Server Authorized')
                            .setDescription(`Server ID \`${serverIdToAdd}\` has been added to the whitelist.`)
                            .addFields({ name: 'Action', value: 'Server is now authorized to use the bot', inline: false })
                            .setTimestamp();
                        await message.reply({ embeds: [embed] });
                    } else {
                        await message.reply(`Server ID \`${serverIdToAdd}\` is already authorized.`);
                    }
                    break;

                case 'remove':
                case 'deauthorize':
                    if (args.length < 2) {
                        return message.reply('Usage: `!serverauth remove <server_id>`');
                    }
                    
                    const serverIdToRemove = args[1];
                    if (deauthorizeServer(serverIdToRemove)) {
                        const embed = new EmbedBuilder()
                            .setColor(0xff6b6b)
                            .setTitle('🚫 Server Deauthorized')
                            .setDescription(`Server ID \`${serverIdToRemove}\` has been removed from the whitelist.`)
                            .addFields({ name: 'Action', value: 'Bot will leave this server if currently present', inline: false })
                            .setTimestamp();
                        await message.reply({ embeds: [embed] });
                        
                        // Check if bot is currently in the deauthorized server and leave
                        const targetGuild = message.client.guilds.cache.get(serverIdToRemove);
                        if (targetGuild) {
                            await targetGuild.leave();
                            console.log(`Left deauthorized server: ${targetGuild.name}`);
                        }
                    } else {
                        await message.reply(`Server ID \`${serverIdToRemove}\` is not in the authorized list.`);
                    }
                    break;

                case 'list':
                    const authorizedServers = getAuthorizedServers();
                    
                    if (authorizedServers.length === 0) {
                        await message.reply('No servers are currently whitelisted. Bot will accept invitations from any server.');
                        break;
                    }
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x3498db)
                        .setTitle('📋 Authorized Servers')
                        .setDescription('List of servers authorized to use this bot:')
                        .setTimestamp();
                    
                    let serverList = '';
                    for (const serverId of authorizedServers) {
                        const guild = message.client.guilds.cache.get(serverId);
                        if (guild) {
                            serverList += `✅ **${guild.name}** (\`${serverId}\`) - ${guild.memberCount} members\n`;
                        } else {
                            serverList += `❓ Unknown Server (\`${serverId}\`) - Bot not present\n`;
                        }
                    }
                    
                    embed.addFields({ name: 'Authorized Servers', value: serverList || 'None', inline: false });
                    await message.reply({ embeds: [embed] });
                    break;

                case 'check':
                case 'status':
                    const currentServerId = message.guild.id;
                    const isAuthorized = isServerAuthorized(currentServerId);
                    
                    const statusEmbed = new EmbedBuilder()
                        .setColor(isAuthorized ? 0x00ff00 : 0xff6b6b)
                        .setTitle(`${isAuthorized ? '✅' : '🚫'} Server Authorization Status`)
                        .addFields(
                            { name: 'Current Server', value: message.guild.name, inline: true },
                            { name: 'Server ID', value: currentServerId, inline: true },
                            { name: 'Status', value: isAuthorized ? 'Authorized' : 'Unauthorized', inline: true },
                            { name: 'Total Authorized', value: getAuthorizedServers().length.toString(), inline: true }
                        )
                        .setTimestamp();
                    
                    if (!isAuthorized) {
                        statusEmbed.addFields({ 
                            name: 'Action Required', 
                            value: `Use \`!serverauth add ${currentServerId}\` to authorize this server`, 
                            inline: false 
                        });
                    }
                    
                    await message.reply({ embeds: [statusEmbed] });
                    break;

                default:
                    await message.reply('Invalid action! Use: `add`, `remove`, `list`, or `check`');
                    break;
            }

        } catch (error) {
            console.error('Error in serverauth command:', error);
            await message.reply('An error occurred while managing server authorization.');
        }
    }
};
