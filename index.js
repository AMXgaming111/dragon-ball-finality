const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Railway health check server
if (process.env.RAILWAY_ENVIRONMENT || process.env.PORT) {
    const express = require('express');
    const app = express();
    const PORT = process.env.PORT || 3000;
    
    app.get('/', (req, res) => {
        res.json({ 
            status: 'Dragon Ball Finality Bot Running',
            uptime: process.uptime(),
            environment: process.env.RAILWAY_ENVIRONMENT ? 'Railway' : 'Local',
            timestamp: new Date().toISOString()
        });
    });
    
    app.get('/health', (req, res) => {
        res.json({ 
            status: 'healthy',
            bot: client?.isReady() ? 'ready' : 'not ready',
            uptime: process.uptime()
        });
    });
    
    app.listen(PORT, () => {
        console.log(`🌐 Health check server running on port ${PORT}`);
    });
}

const Database = require('./src/database/database');
const { prefix } = require('./src/utils/config');
const { isServerAuthorized, handleUnauthorizedServer } = require('./src/utils/serverSecurity');

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// Initialize command collection
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('name' in command && 'execute' in command) {
        client.commands.set(command.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "name" or "execute" property.`);
    }
}

// Initialize database
const database = new Database();

client.once('ready', async () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    
    // Initialize database tables
    await database.init();
    console.log('Database initialized successfully');
});

client.on('messageCreate', async message => {
    // Ignore bot messages and messages without prefix
    if (message.author.bot || !message.content.startsWith(prefix)) return;

    // Check if server is authorized (skip check for DMs)
    if (message.guild && !isServerAuthorized(message.guild.id)) {
        // Only respond to serverauth command for unauthorized servers
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        if (commandName !== 'serverauth') {
            // Silently ignore other commands in unauthorized servers
            return;
        }
    }

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);

    if (!command) return;

    try {
        await command.execute(message, args, database);
    } catch (error) {
        console.error(`Error executing command ${commandName}:`, error);
        await message.reply('There was an error while executing this command!');
    }
});

client.on('interactionCreate', async interaction => {
    // Handle button interactions (like help menu buttons)
    if (interaction.isButton()) {
        // The help command handles its own button interactions via collectors
        // This is mainly for future slash commands or other interactions
        return;
    }
    
    // Handle other interaction types as needed
});

// Server security - check when bot joins a new server
client.on('guildCreate', async (guild) => {
    console.log(`🏰 Joined server: ${guild.name} (${guild.id}) - ${guild.memberCount} members`);
    
    // Check if server is authorized
    if (!isServerAuthorized(guild.id)) {
        console.log(`🚫 Server ${guild.name} is not authorized`);
        await handleUnauthorizedServer(guild, client);
    } else {
        console.log(`✅ Server ${guild.name} is authorized`);
    }
});

// Log when bot leaves a server
client.on('guildDelete', (guild) => {
    console.log(`👋 Left server: ${guild.name} (${guild.id})`);
});

// Error handling
client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
