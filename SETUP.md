# Dragon Ball Finality Bot Setup Guide

## Prerequisites
- Node.js 16.9.0 or higher
- A Discord application and bot token
- Basic understanding of Discord bot permissions

## Step 1: Discord Bot Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section
4. Click "Reset Token" and copy the token (keep it secure!)
5. Under "Privileged Gateway Intents", enable:
   - Server Members Intent
   - Message Content Intent

## Step 2: Bot Permissions

When inviting your bot to a server, it needs these permissions:
- Send Messages
- Embed Links
- Read Message History
- Use External Emojis
- Add Reactions
- Manage Messages (for cleanup)

Permission integer: `414537948224`

Invite URL template:
```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=414537948224&scope=bot
```

## Step 3: Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your bot information:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   PREFIX=!
   STAFF_ROLE_NAME=Staff
   ```

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: Run the Bot

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

## Step 6: Server Setup

1. Create a role called "Staff" (or whatever you set in STAFF_ROLE_NAME)
2. Assign this role to users who should have admin commands
3. Test the bot with `!cc TestChar Saiyan`

## Database

The bot automatically creates a SQLite database in the `database/` folder on first run. No manual setup required.

## Commands Overview

### User Commands
- `!cc <name> <race>` - Create character
- `!sw <name>` - Switch character  
- `!cl` - List your characters
- `!stats` - View character stats
- `!pl` - View power level
- `!health` / `!ki` - View/modify resources
- `!r <stat/number>` - Roll dice
- `!attack @user` - Attack another character

### Staff Commands  
- `!spl @user <op> <value>` - Modify base PL
- `!sadd @user <stat> <op> <value>` - Modify stats
- `!rc @user <add/remove> <racial>` - Manage racials
- `!sform <key> <modifiers>` - Create forms
- `!cl @user` - View any user's characters
- `!stats @user` - View any user's stats

## Troubleshooting

### Bot doesn't respond
- Check the token is correct
- Verify bot has proper permissions
- Check console for error messages

### Database errors
- Ensure write permissions to project directory
- Check if antivirus is blocking SQLite files

### Command not found
- Verify the command file is in `src/commands/`
- Check console for loading errors
- Ensure proper export structure

## Support

Check the GitHub repository for issues and documentation updates.
