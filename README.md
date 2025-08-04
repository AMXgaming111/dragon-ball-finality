# Dragon Ball Finality Discord Bot

A comprehensive Discord RPG bot for the Dragon Ball Finality server, featuring character creation, combat mechanics, stats management, and form transformations.

## Version 0.0.1 (Alpha)

This is the initial alpha release of the Dragon Ball Finality bot.

## Features

### Character Management
- **!cc** - Create characters with races (Saiyan, Namekian, Synthetic Majin, Majin, Human, Arcosian)
- **!dc** - Delete characters (with confirmation)
- **!sw** - Switch between characters
- **!cl** - List all characters (with pagination)
- **!stats** - Display character stats, skills, and forms

### Combat System
- **!attack** - Comprehensive attack system with Physical, Ki, and Magic options
- **!defend** - Defense system with Block, Dodge, and Magic responses
- **!turn** - Turn-based combat management
- **!pl** - Display effective power level calculations

### Character Progression
- **!spl** - Modify base power level (Staff only)
- **!sadd** - Modify character attributes (Staff only)
- **!rc** - Add/remove racial abilities (Staff only)
- **!health** / **!ki** - Manage character resources

### Forms & Transformations
- **!sform** - Create custom forms (Staff only)
- **!formset** - Grant/remove forms from characters (Staff only)
- **!form** - Transform/revert between forms
- **!currentform** - Check current transformation

### Skills & Magic
- **!sskill** - Set skill mastery levels (Staff only)
- **!saffinity** - Manage magic affinities (Staff only)

### Racial Abilities
- **!race** - Toggle passive racial abilities
- **!mregen** - Enhanced Majin regeneration
- **!ngiant** - Namekian giant form
- **!nregen** - Namekian healing

### Utility
- **!r** - Dice rolling system
- **!addstats** - Set character images
- **!say** - Create roleplay embeds (Staff only)

## Setup Instructions

1. Clone this repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   PREFIX=!
   STAFF_ROLE_NAME=Staff
   ```
4. Run the bot: `npm start`

## Database

The bot uses SQLite for data persistence, automatically creating the database and tables on first run.

## Requirements

- Node.js 16.9.0 or higher
- Discord.js v14
- SQLite3

## Race System

Each race comes with unique abilities:
- **Saiyan**: Zenkai boost in combat
- **Human**: Reduced ki loss from health damage
- **Namekian**: Regeneration and giant form abilities
- **Synthetic Majin**: Automatic health regeneration
- **Majin**: Magic energy absorption and PL boost
- **Arcosian**: Resistance to ki loss debuffs

## Combat Mechanics

The bot features a complex combat system with:
- Power level calculations based on ki percentage
- Effort system (1-5) affecting roll ranges and ki costs
- Form multipliers and stat modifications
- Blowback damage from powerful ki attacks
- Turn-based combat with racial bonuses

## Development

This bot is in active development. Current version focuses on core functionality with more features planned for future releases.

## License

ISC License - See LICENSE file for details
