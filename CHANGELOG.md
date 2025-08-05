# Changelog

## [0.0.1-alpha] - 2025-08-05

### Initial Alpha Release

#### 🎮 Core Features
- **Character Management System**
  - Character creation and deletion (`!cc`, `!dc`)
  - Character switching (`!sw`)
  - Character listing (`!cl`)
  - Stat management (`!stats`, `!addstats`)

#### ⚔️ Combat System  
- **Turn-Based Combat**
  - Attack system with Physical/Ki/Magic options (`!attack`)
  - Defense system with Block/Dodge/Magic responses (`!defend`)
  - Turn advancement with racial effects (`!turn`)
  - Combat resolution and cleanup (`!resolve`)

- **Combat Mechanics**
  - Effort levels (1-5) affecting roll ranges and ki costs
  - Accuracy multipliers with proper ki cost scaling
  - Blowback damage for high-effort attacks
  - Power Level calculations with form and racial modifiers

#### 🧬 Racial Abilities System
- **Passive Racials**
  - **Zenkai (Saiyan)**: PL increases when hitting stronger opponents
  - **Human Spirit (Human)**: Ki cap reduction from health loss is halved
  - **Majin Regeneration (Synthetic Majin)**: 10% health regen per turn
  - **Arcosian Resilience (Arcosian)**: Ki debuff from low ki is halved
  - **Majin's Magic (Majin)**: Gain ki and PL boost from damage dealt

- **Active Racials**
  - **Namekian Physiology**: Giant form and manual regeneration
  - Enhanced Majin Regeneration (20% instead of 10%)

- **Racial Commands**
  - `!race on/off` - Toggle passive racials
  - `!mregen on/off` - Toggle enhanced Majin regeneration
  - `!ngiant on/off` - Toggle Namekian giant form
  - `!nregen` - Manual Namekian regeneration
  - `!rc` - Staff racial management

#### 🔄 Form System
- **Form Management**
  - Form activation and deactivation (`!form`)
  - Current form display (`!currentform`)
  - Staff form assignment (`!sform`, `!formset`)

#### 📊 Stats & Information
- **Character Information**
  - Power Level display with form modifiers (`!pl`)
  - Health management with ki cap integration (`!health`)
  - Ki management (`!ki`)
  
- **Utility Commands**
  - Dice rolling system (`!r`)
  - Staff commands (`!spl`, `!sadd`, `!sskill`, `!saffinity`, `!say`)

#### 🛠️ Technical Features
- **Database Integration**
  - SQLite database with normalized character data
  - Turn order tracking for combat
  - Combat state management
  - Racial abilities tracking

- **Ki System**
  - Ki cost calculations: `base_cost * (100 / control)` with minimum 1
  - Ki cap reductions based on health percentage
  - Human Spirit racial halves ki cap reduction
  - Accuracy multiplier ki costs properly implemented

- **Combat Resolution**
  - Automatic ki cap updates when health changes
  - Proper racial effect integration
  - Combat timeout handling
  - Blowback damage calculations

#### 🔧 Bug Fixes
- Fixed ki multiplier costs not being applied in attack/defend commands
- Fixed ki cap not reducing when health drops from combat damage
- Implemented Human Spirit racial in ki cap reduction system
- Fixed Arcosian Resilience integration in PL calculations
- Enhanced turn system with all racial passive effects

#### 📋 Command List
**Character Management:** `!cc`, `!dc`, `!sw`, `!cl`, `!stats`, `!addstats`
**Combat:** `!attack`, `!defend`, `!turn`, `!resolve`
**Racials:** `!race`, `!mregen`, `!ngiant`, `!nregen`
**Forms:** `!form`, `!currentform`
**Information:** `!pl`, `!health`, `!ki`
**Utility:** `!r`
**Staff:** `!spl`, `!sadd`, `!sform`, `!formset`, `!sskill`, `!saffinity`, `!rc`, `!say`

#### 🗂️ Database Schema
- `users` - User account data
- `characters` - Character stats and information
- `character_racials` - Racial abilities junction table
- `forms` - Form definitions
- `character_forms` - Character form assignments
- `turn_orders` - Combat turn tracking
- `combat_state` - Combat bonuses and effects

### Known Limitations
- Magic defense not fully implemented
- Some advanced form mechanics pending
- Combat AI/NPC system not implemented

### Requirements
- Node.js 18+
- Discord.js v14.21.0+
- SQLite3 v5.1.7+
- Valid Discord bot token
