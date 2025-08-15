# Help Command Documentation

## Command: `!help`

### Description
The `!help` command provides comprehensive information about all available bot commands, organized into logical categories with interactive navigation.

### Usage
```
!help                    # Show main help menu with all categories
!help <category>         # Show specific category commands
```

### Categories

#### 👤 Character Management
Commands for creating, managing, and switching between characters:
- `!cc` - Create characters with support for quoted names
- `!dc` - Delete characters (owner/staff only)
- `!sw` - Switch active character
- `!cl` - List characters with pagination
- `!stats` - View character stats with interactive buttons
- `!addstats` - Update character images

#### ⚔️ Combat System
Commands for battle mechanics and turn management:
- `!attack` - Initiate attacks (physical/ki/magic)
- `!defend` - Respond to attacks (block/dodge/magic defense)
- `!turn` - Manage turn-based combat
- `!pending` - Check pending attacks

#### 📊 Character Stats
Commands for viewing and managing character statistics:
- `!pl` - View effective power level
- `!health` - Display/modify health
- `!ki` - Display/modify ki
- `!release` - Adjust power level percentage

#### 🔥 Forms & Abilities
Commands for character transformations and racial abilities:
- `!form` - Activate/deactivate forms
- `!currentform` - Check active form
- `!race` - Toggle passive racials
- `!mregen` - Majin regeneration
- `!ngiant` - Namekian giant form
- `!nregen` - Namekian regeneration

#### 🛠️ Utility Commands
General utility and dice rolling commands:
- `!r` - Dice rolling with stat support
- `!help` - This help system

#### 👑 Staff Commands
Administrative commands requiring Staff role:
- `!spl` - Modify base power level
- `!sadd` - Modify individual stats
- `!saddall` - Modify all stats
- `!sskill` - Modify skill levels
- `!saffinity` - Manage magic affinities
- `!sform` - Activate forms for others
- `!formset` - Grant/remove form access
- `!rc` - Manage racial abilities
- `!heal` - Restore health/ki to 100%
- `!say` - Create announcements
- `!resolve` - Resolve expired attacks

### Interactive Features

#### Main Menu
- **Category Buttons**: Click emoji buttons to explore specific command categories
- **Quick Start**: Essential commands for new users
- **Tips**: Important usage guidelines
- **Category Overview**: Summary of all available categories

#### Category Views
- **Detailed Command Info**: Usage syntax, descriptions, and examples
- **Navigation**: Easy return to main menu
- **Comprehensive Examples**: Multiple usage examples for each command

#### Smart Navigation
- **User-Specific**: Only the help requester can navigate
- **Auto-Cleanup**: Buttons are removed after 10 minutes
- **Error Handling**: Graceful handling of invalid interactions

### Command Information Format

Each command entry includes:
- **Usage Syntax**: Exact command format with parameters
- **Description**: Clear explanation of command purpose
- **Examples**: Real usage examples with proper formatting
- **Aliases**: Alternative command names (if any)

### Features

1. **Comprehensive Coverage**: All 30+ bot commands documented
2. **Category Organization**: Logical grouping for easy navigation
3. **Interactive Interface**: Button-based navigation system
4. **Search Support**: Direct category access via `!help <category>`
5. **User-Friendly**: Clear examples and usage instructions
6. **Staff Distinction**: Clear marking of staff-only commands
7. **Quote Support**: Documentation of quoted name syntax
8. **Auto-Expiry**: Cleans up UI after timeout

### Usage Examples

```bash
# View main help menu
!help

# View specific category
!help combat
!help character
!help staff

# Interactive navigation using buttons
# Click category buttons to explore
# Click "Back to Main Menu" to return
```

### Benefits

- **New User Onboarding**: Clear starting point for new users
- **Command Discovery**: Easy exploration of all available features
- **Syntax Reference**: Quick lookup for command formats
- **Category Browsing**: Organized exploration of related commands
- **Staff Training**: Clear identification of administrative commands

The help system serves as a comprehensive guide to the Dragon Ball Finality bot, making it easy for users to discover and learn how to use all available commands effectively.
