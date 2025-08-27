# 🐉 Shenron Discord Bot

[![Version](https://img.shields.io/badge/version-0.1.0--beta-orange.svg)](https://github.com/AMXgaming111/dragon-ball-finality/releases)
[![Discord.js](https://img.shields.io/badge/discord.js-v14.21.0-blue.svg)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

A comprehensive Discord RPG bot for Dragon Ball-themed servers featuring turn-based combat, racial abilities, character progression, and form transformations.

## 🌟 Features

### 🎮 Character Management
- **Character Creation**: Create unique characters with custom stats
- **Stat System**: Strength, Defense, Agility, Endurance, Control
- **Character Switching**: Manage multiple characters per user
- **Stat Progression**: Staff-managed character advancement

### ⚔️ Combat System
- **Turn-Based Combat**: Strategic turn-order system
- **Attack Types**: Physical, Ki, and Magic attacks
- **Defense Options**: Block, Dodge, and Magic defenses
- **Effort Levels**: 1-5 effort scaling affecting power and ki costs
- **Accuracy Multipliers**: Enhanced attacks with ki cost scaling
- **Blowback Damage**: High-effort attacks can damage the attacker

### 🧬 Racial Abilities
- **🦍 Saiyan - Zenkai**: PL increases by 30% (of base) when facing stronger opponents. Continues until PL equals/exceeds theirs. At ≤20% health: 1.4x multiplier.
- **👤 Human - Human Spirit**: Ki cap reduction from health loss is halved
- **🟢 Namekian - Physiology**: Giant form and manual regeneration abilities
- **🟣 Synthetic Majin - Regeneration**: Automatic health regeneration per turn
- **🔷 Arcosian - Resilience**: Ki debuff from low ki percentage is halved
- **🟪 Majin - Magic**: Gain ki and PL boosts from dealing damage

### 🔄 Form System
- **Form Transformations**: Unlock and activate powerful forms
- **Stat Modifiers**: Forms modify strength, defense, agility, endurance, control
- **PL Multipliers**: Massive power level increases
- **Ki Costs**: Activation and maintenance costs
- **Health/Ki Drains**: Some forms have ongoing costs

### 📊 Advanced Mechanics
- **Ki System**: Control stat affects all ki costs: `base_cost * (100 / control)`
- **Health Integration**: Health affects ki cap and power level
- **Racial Modifiers**: Passive effects integrated into all calculations
- **Combat State Tracking**: Persistent bonuses and effects

## 📋 Command Reference

### Character Management
- `!cc <name> <race>` - Create character
- `!dc` - Delete active character
- `!sw <name>` - Switch active character
- `!cl` - List your characters
- `!stats [user]` - View character stats
- `!addstats <stat> <amount>` - Add stat points (Staff)

### Combat Commands
- `!attack <@user> [e1-5] [*multiplier]` - Attack another character
- `!defend <@user> [e1-5]` - Defend against attack
- `!turn` - Advance combat turn
- `!resolve` - Resolve expired attacks (Staff)
- `!release <percentage>%` - Adjust effective power level percentage

### Racial Abilities
- `!race <on/off>` - Toggle passive racial abilities
- `!mregen <on/off>` - Toggle enhanced Majin regeneration
- `!ngiant <on/off>` - Toggle Namekian giant form
- `!nregen` - Use Namekian regeneration
- `!rc <@user> <add/remove> <racial>` - Manage racials (Staff)

### Forms & Information
- `!form <form_name>` - Activate/deactivate form
- `!currentform` - Check active form
- `!pl [user]` - View power level
- `!health [user] [modifier]` - View/modify health
- `!ki [user] [modifier]` - View/modify ki

### Utility & Staff
- `!r <stat/number> [modifier] [-d count]` - Roll dice
- `!spl <@user> <amount>` - Set base PL (Staff)
- `!sadd <@user> <stat> <amount>` - Add stats (Staff)
- `!sform <@user> <form>` - Assign form (Staff)
- `!formset <@user> <form> <on/off>` - Toggle form (Staff)
- `!sskill <@user> <skill>` - Add skill (Staff)
- `!saffinity <@user> <affinity>` - Set affinity (Staff)
- `!say <message>` - Bot announcement (Staff)

## 🚀 Installation

### Prerequisites
- [Node.js 18+](https://nodejs.org/)
- [Discord Bot Token](https://discord.com/developers/applications)
- Git

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/AMXgaming111/dragon-ball-finality.git
   cd dragon-ball-finality
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_bot_client_id
   STAFF_ROLE_NAME=Staff
   ```

4. **Database Setup**
   The bot automatically creates and initializes the SQLite database on first run.

5. **Start the bot**
   ```bash
   npm start
   ```

## 🎯 Usage Examples

### Basic Character Setup
```
!cc Goku Saiyan              # Create a Saiyan character named Goku
!addstats strength 50         # Add 50 strength (Staff command)
!race on                      # Enable passive racial abilities
!form Super_Saiyan            # Transform into Super Saiyan form
```

### Combat Scenario
```
!attack @opponent e4 *2.0     # High-effort attack with 2x accuracy multiplier
!defend @attacker e3          # Medium-effort defense
!turn                         # Advance to next turn
```

### Racial Abilities
```
!mregen on                    # Enhanced Majin regeneration (20% per turn)
!ngiant on                    # Namekian giant form (+40 Str/Def)
!nregen                       # Manual Namekian regeneration
```

## 📊 Version History

- **v0.1.0-beta** (2025-08-25) - Complete Technique System & Combat Overhaul
  - **NEW**: Complete technique system with 9 fully functional techniques
    - **Free Techniques**: Clear Mind (+30 Control), Guard (20% damage reduction), Heavy Blow (agility debuff), Feint (dodge penalty)
    - **Ki Techniques** (4 ki): Weakpoint (7% health damage), Double Strike (double rolls), Counter (unblockable), Chokehold (ki drain), Grab (strength-based dodge prevention)
  - **MAJOR**: PostgreSQL compatibility overhaul for Railway deployment
    - **FIXED**: GROUP_CONCAT → STRING_AGG conversion for all database queries
    - **FIXED**: Parameter placeholders (? → $1, $2, $3) throughout codebase
    - **ENHANCED**: Database compatibility layer with automatic SQL dialect detection
  - **ENHANCED**: Turn advancement system completely rewritten
    - **FIXED**: End turn buttons now functional across all attack types
    - **ADDED**: Turn advancement debugging and error handling
    - **IMPROVED**: Seamless combat flow with proper state management
  - **FIXED**: Critical combat calculation bugs
    - **AGILITY**: +10 agility modifier now properly applies to all techniques
    - **FEINT**: Dodge penalty (-0.5x) now correctly implemented in defend command
    - **ACCURACY**: All technique accuracy calculations fixed and standardized
  - **TECHNICAL**: Major infrastructure improvements
    - **DATABASE**: Full PostgreSQL migration with backward SQLite compatibility
    - **DEPLOYMENT**: Railway.app production deployment with CI/CD pipeline
    - **ERROR HANDLING**: Comprehensive debugging and error recovery systems
    - **CODE QUALITY**: Unified parameter handling and database query standardization

- **v0.0.5** (2025-08-15) - Command Enhancement & Magic System Implementation
  - **NEW**: Quoted name support for all character commands (`"Name Here"`)
  - **NEW**: Complete magic attack/defense system with affinity-based ki costs
  - **NEW**: Staff commands: `!heal` and `!saddall` for character management
  - **ENHANCED**: Standardized `+<number>` (additive) and `*<number>` (multiplier) syntax
  - **ENHANCED**: Visual ki bars in all combat commands for real-time tracking
  - **ENHANCED**: Magic affinity display improvements and "Negative Energy" mapping
  - **FIXED**: Health regeneration caps, interaction handling, and ki debuff system
  - **UPDATED**: New 3-tier ki debuff system (0% → 25% → 55% → 85% progression)

- **v0.0.4** (2025-08-14) - Release System & Combat Enhancement Updates
  - **NEW**: Release command for manual effective PL adjustment (`!release x%`)
  - **ENHANCED**: Maximum multiplier information display for ki attacks, blocks, and dodges
  - **FIXED**: Arcosian Resilience detection bug causing incorrect effective PL calculations
  - **IMPROVED**: Turn advancement system with proper SQL queries and error handling
  - **ADDED**: Database schema expansion with release_percentage column
  - **OPTIMIZED**: Ki cost calculations with effort level validation and upfront blocking

- **v0.0.3** (2025-08-13) - Major Racial System Overhaul & Combat Fixes
  - **FIXED**: Complete Zenkai system rewrite with proper turn advancement logic
  - **FIXED**: Majin Magic SQL errors and missing channel_id parameters
  - **IMPLEMENTED**: Missing Namekian Giant Form stat bonuses (+40 Str/Def)
  - **STANDARDIZED**: Majin Regeneration rates (10% basic, 20% enhanced) across all files
  - **ENHANCED**: Turn management with "Would you like to end your turn?" buttons
  - **ADDED**: Automatic turn order creation when players attack each other
  - **IMPROVED**: Database schema with `last_enemy_pl` column for Zenkai tracking
  - **FIXED**: Power level display errors and undefined variable issues

- **v0.0.2** (2025-08-10) - Combat System Enhancements & UI Improvements
  - Fixed Zenkai system integration across all combat commands
  - Streamlined attack/defend UI (reduced from 4 to 2 messages)
  - Enhanced form modifier parsing (supports multiple formats)
  - Removed "DEFEATED" status, allows negative health values
  - Added comprehensive bot invitation system
  - Fixed critical combat bugs and error handling

- **v0.0.1-alpha** (2025-08-05) - Initial alpha release with core features
  - Character management system
  - Turn-based combat
  - Racial abilities (6 types)
  - Form system
  - Ki/Health mechanics
  - 25+ commands

---

**Made with ❤️ for Dragon Ball RPG enthusiasts**
