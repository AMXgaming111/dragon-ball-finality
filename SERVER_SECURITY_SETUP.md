# Server Security Setup Guide

## Overview
Your Discord bot now includes a server security system that prevents unauthorized users from inviting your bot to their servers.

## How It Works

### 1. **Server Whitelist System**
- Only servers in the authorized list can use the bot
- When invited to an unauthorized server, the bot will:
  - Send a notification message (if possible)
  - Notify the bot owner (if configured)
  - Automatically leave after 10 seconds

### 2. **Automatic Protection**
- Triggers whenever the bot joins a new server
- No manual intervention required
- Logs all server join/leave events

## Setup Instructions

### Step 1: Configure Environment Variables

Add your Discord User ID to the `.env` file:
```env
OWNER_USER_ID=your_discord_user_id_here
```

**To find your Discord User ID:**
1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click your username and select "Copy User ID"

### Step 2: Set Up Server Whitelist

#### Option A: Add Your Server ID to Code (Permanent)
Edit `src/utils/serverSecurity.js`:
```javascript
const ALLOWED_SERVERS = [
    '1234567890123456789', // Replace with your server ID
    // Add more server IDs as needed
];
```

#### Option B: Use Commands (Dynamic)
Use the `!serverauth` command to manage authorized servers:

```bash
# Check current server status
!serverauth check

# Add current server to whitelist
!serverauth add 1234567890123456789

# List all authorized servers
!serverauth list

# Remove a server from whitelist
!serverauth remove 1234567890123456789
```

### Step 3: Test the Security System

1. **Test with your server:**
   ```bash
   !serverauth check
   ```
   Should show "Authorized" status

2. **Test with unauthorized invite:**
   - Create a test server or ask someone to invite the bot
   - Bot should automatically leave within 10 seconds

## Commands Reference

### `!serverauth add <server_id>`
- **Description:** Add a server to the authorized list
- **Permission:** Staff only
- **Example:** `!serverauth add 1234567890123456789`

### `!serverauth remove <server_id>`
- **Description:** Remove a server from the authorized list
- **Permission:** Staff only
- **Example:** `!serverauth remove 1234567890123456789`
- **Note:** Bot will automatically leave if currently in that server

### `!serverauth list`
- **Description:** Show all authorized servers
- **Permission:** Staff only
- **Shows:** Server names, IDs, member counts, and bot presence status

### `!serverauth check`
- **Description:** Check authorization status of current server
- **Permission:** Staff only
- **Shows:** Current server info and authorization status

## Security Features

### 🛡️ **Automatic Protection**
- Instant detection when bot joins unauthorized servers
- Automatic departure with notification
- Owner alerts for unauthorized access attempts

### 🔐 **Whitelist Management**
- Dynamic server authorization without restarts
- Persistent across bot restarts
- Staff-only command access

### 📊 **Monitoring & Logging**
- Console logs for all server joins/leaves
- Owner DM notifications for unauthorized attempts
- Server status checking commands

### 🚫 **Unauthorized Server Handling**
1. **Detection:** Bot detects unauthorized server on join
2. **Notification:** Sends embed message explaining restriction
3. **Owner Alert:** DMs bot owner with server details
4. **Departure:** Automatically leaves after 10 seconds

## Advanced Configuration

### Disable Security (Allow All Servers)
To temporarily allow all servers, keep the `ALLOWED_SERVERS` array empty:
```javascript
const ALLOWED_SERVERS = [
    // Leave empty to allow all servers
];
```

### Custom Notification Messages
Edit the embed messages in `src/utils/serverSecurity.js` to customize:
- Unauthorized server notification
- Owner alert format
- Error messages

### Permission Requirements
The `!serverauth` command requires:
- Staff role (configurable in `.env`)
- Bot must be in the server to manage it

## Troubleshooting

### Bot Leaves Authorized Server
- Check server ID in whitelist: `!serverauth list`
- Verify server ID matches exactly
- Add server if missing: `!serverauth add <server_id>`

### Owner Notifications Not Working
- Verify `OWNER_USER_ID` in `.env` file
- Ensure bot and owner share at least one server
- Check bot has permission to DM the owner

### Commands Not Working
- Verify user has Staff role
- Check bot permissions in the server
- Ensure bot is online and responsive

## Getting Server IDs

### Method 1: Discord Developer Mode
1. Enable Developer Mode (User Settings → Advanced → Developer Mode)
2. Right-click server name in sidebar
3. Select "Copy Server ID"

### Method 2: Using Bot Command
```bash
!serverauth check
```
This will show the current server's ID in the response.

### Method 3: From Bot Logs
Server IDs are logged when the bot joins servers:
```
🏰 Joined server: Your Server Name (1234567890123456789) - 150 members
```

## Security Best Practices

1. **Keep Server IDs Private:** Don't share your authorized server list publicly
2. **Regular Audits:** Periodically check `!serverauth list` to review authorized servers
3. **Owner Notifications:** Set up `OWNER_USER_ID` to monitor unauthorized attempts
4. **Staff Training:** Ensure staff know how to use `!serverauth` commands
5. **Backup Lists:** Keep a backup of your authorized server IDs

## Migration from Unrestricted Bot

If your bot was previously unrestricted:

1. **Get Current Servers:** Use `!serverauth list` to see where bot is currently active
2. **Authorize Known Servers:** Use `!serverauth add <id>` for each legitimate server
3. **Enable Security:** Restart bot with whitelist configured
4. **Monitor Logs:** Watch for unauthorized join attempts
5. **Clean Up:** Bot will automatically leave unauthorized servers

---

**Need Help?** Contact the bot developer or check the logs for detailed error messages.
