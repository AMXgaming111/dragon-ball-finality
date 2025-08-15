# Changelog

## [0.0.5] - 2025-08-15

### Command Enhancement & Magic System Implementation

#### 🎯 Enhanced Command Parsing System
- **Quoted Name Support**
  - ✅ **NEW**: All character commands now support quoted names for spaces
  - ✅ **COMMANDS**: `!cc "Name Here" race`, `!dc "Name Here"`, `!sw "Name Here"`, `!addstats pic "Name Here" url`
  - ✅ **BACKWARDS COMPATIBLE**: Original single-word names still work without quotes

#### ⚔️ Standardized Attack/Defense Modifier System
- **Unified Syntax**
  - ✅ **STANDARDIZED**: `+<number>` for additive modifiers, `*<number>` for multipliers
  - ✅ **VALIDATION**: Enhanced input validation with clear error messages
  - ✅ **GUIDANCE**: Max affordable multiplier displays for ki attacks and defenses

- **Enhanced User Experience**
  - ✅ **CLEAR PROMPTS**: Better descriptions and examples in all combat commands
  - ✅ **ERROR HANDLING**: Specific error messages for invalid modifier types
  - ✅ **VISUAL FEEDBACK**: Improved format consistency across all commands

#### ✨ Magic Attack/Defense Implementation
- **Complete Magic System**
  - ✅ **NEW**: Full magic attack implementation with affinity-based ki costs
  - ✅ **NEW**: Magic defense system with primary/secondary affinity support
  - ✅ **FORMULAS**: Primary (base × 100/control), Secondary (base × 100/control × 2)

- **Magic Integration**
  - ✅ **COMBAT FLOW**: Seamless integration with existing attack/defend commands
  - ✅ **KI MANAGEMENT**: Proper ki cost validation and application
  - ✅ **USER INTERFACE**: Interactive magic spell casting system

#### 📊 Ki Display Enhancement System
- **Visual Ki Tracking**
  - ✅ **NEW**: Real-time ki bars in all combat embeds
  - ✅ **INTEGRATION**: Ki displays added to attack, defend, and magic commands
  - ✅ **DYNAMIC**: Shows current/max ki with percentage and visual bar

#### 🔮 Magic Affinity System Improvements
- **Display Name Mapping**
  - ✅ **UPDATED**: "Negative Energy" displays as "Negative Energy" but stores as "Negative"
  - ✅ **COMPATIBILITY**: Database migration support for existing affinities
  - ✅ **CONSISTENCY**: Unified display across stats and saffinity commands

#### 👑 New Staff Commands
- **Heal Command**
  - ✅ **NEW**: `!heal @user` - Restore character health and ki to 100%
  - ✅ **FORM AWARE**: Respects active form modifiers for max calculations
  - ✅ **DETAILED FEEDBACK**: Shows character, form, and final values

- **Bulk Stat Modification**
  - ✅ **NEW**: `!saddall @user <operation> <value>` - Modify all stats at once
  - ✅ **OPERATIONS**: Supports +, -, *, /, and set operations
  - ✅ **SMART HANDLING**: Automatic health/ki pool updates for endurance changes

#### ⚖️ Ki Debuff System Overhaul
- **New 3-Tier System**
  - ✅ **TIER 1**: 100%-50% health: 0.5% debuff per point (25% max)
  - ✅ **TIER 2**: 49%-20% health: 1.0% debuff per point (30% additional, 55% total)
  - ✅ **TIER 3**: 19%-0% health: 1.5% debuff per point (30% additional, 85% total)

- **Balanced Progression**
  - ✅ **SIMPLIFIED**: Cleaner tier structure with exact target percentages
  - ✅ **OPTIMIZED**: Reduced maximum debuff from 87.5% to 85%
  - ✅ **COMPATIBLE**: Maintains Arcosian Resilience integration

#### 🐛 Critical Bug Fixes
- **Health System**
  - ✅ **FIXED**: Health regeneration now properly caps at maximum health
  - ✅ **FIXED**: Turn-based healing effects respect health limits

- **Interaction Handling**
  - ✅ **ADDED**: Missing interaction event handler in main bot file
  - ✅ **IMPROVED**: Better button interaction processing

- **Character Encoding**
  - ✅ **FIXED**: Unicode character display issues in combat embeds
  - ✅ **STANDARDIZED**: Consistent emoji usage across all commands

#### 🛠️ Technical Improvements
- **Code Quality**
  - ✅ **REFACTORED**: Unified modifier parsing across all combat commands
  - ✅ **ENHANCED**: Better error handling and user feedback
  - ✅ **OPTIMIZED**: Reduced code duplication in attack/defense systems

- **Documentation**
  - ✅ **ADDED**: Comprehensive command documentation files
  - ✅ **UPDATED**: Usage examples and feature descriptions

### Updated Components
- `src/commands/attack.js` - Standardized modifier system, magic attack implementation
- `src/commands/defend.js` - Enhanced defense options, magic defense system  
- `src/commands/cc.js` - Added quoted name support
- `src/commands/dc.js` - Added quoted name support
- `src/commands/sw.js` - Added quoted name support
- `src/commands/addstats.js` - Enhanced parsing for quoted names
- `src/commands/stats.js` - Magic affinity display improvements
- `src/commands/saffinity.js` - Display name mapping integration
- `src/commands/say.js` - Improved message handling
- `src/commands/turn.js` - Health cap fixes for regeneration
- `src/commands/heal.js` - NEW: Staff healing command
- `src/commands/saddall.js` - NEW: Bulk stat modification command
- `src/commands/help.js` - Enhanced interactive help system
- `src/utils/calculations.js` - New ki debuff system implementation
- `src/utils/combat.js` - Ki display integration
- `src/utils/config.js` - Magic affinity display name mapping
- `index.js` - Added interaction event handler
- `temp_functions.js` - Health cap fixes

### Migration Notes
- Characters with "Negative Energy" affinity will display as "Negative Energy" but store as "Negative"
- New ki debuff system applies immediately - no data migration required
- All existing commands maintain backwards compatibility
- New magic system is fully integrated and ready for use

### Performance Optimizations
- Streamlined modifier parsing reduces command processing time
- Enhanced ki cost calculations with better validation
- Improved database queries for affinity handling
- Optimized interaction event processing

---

## [0.0.4] - 2025-08-14

### Release System & Combat Enhancement Updates

#### 🆕 New Release System
- **Manual Power Level Control**
  - ✅ **NEW**: `!release <percentage>%` command for adjusting effective power level
  - ✅ **FLEXIBLE**: Supports suppression (`!release 50%`) and power surges (`!release 150%`)
  - ✅ **INTEGRATED**: Works with all existing mechanics (ki debuffs, bonuses, forms)
  - ✅ **DATABASE**: Added `release_percentage` column to characters table (defaults to 100%)
  - ✅ **VISUAL**: Shows both base effective PL and current release level in displays

- **Release System Features**
  - Release percentage applies as final multiplier after all other calculations
  - Maintains compatibility with Arcosian Resilience, Zenkai, Majin Magic, and forms
  - Allows temporary power adjustments for uncoded abilities and forms
  - Embedded display shows power surge/suppression status with appropriate colors

#### 🔧 Combat System Enhancements
- **Maximum Multiplier Information**
  - ✅ **ENHANCED**: Ki attacks now show "Max Affordable Multiplier: X.Xx" based on current ki
  - ✅ **ENHANCED**: Block defenses show both max additive AND max affordable multiplier
  - ✅ **ENHANCED**: Dodge defenses show both max additive AND max affordable multiplier
  - ✅ **INTELLIGENT**: Calculations factor in effort costs, accuracy multipliers, and control stat

- **Upfront Ki Validation**
  - ✅ **FIXED**: Ki attacks now blocked entirely if insufficient ki for any multiplier
  - ✅ **IMPROVED**: Shows "No multipliers affordable (insufficient ki)" when applicable
  - ✅ **ENHANCED**: Prevents failed attack attempts with clear error messages and suggestions

#### 🐛 Critical Bug Fixes
- **Arcosian Resilience Detection**
  - ✅ **FIXED**: Major bug where `undefined !== null` returned `true`
  - ✅ **CORRECTED**: Changed from `hasArcosianResilience !== null` to `!!hasArcosianResilience`
  - ✅ **STANDARDIZED**: All commands now use consistent boolean conversion
  - ✅ **IMPACT**: Prevents characters from incorrectly gaining Arcosian Resilience benefits

- **Turn Advancement System**
  - ✅ **FIXED**: SQL syntax errors in turn order queries (`JSON_EXTRACT` → `LIKE` syntax)
  - ✅ **FIXED**: Column name corrections (`character_id` → `id` for characters table)
  - ✅ **ENHANCED**: Proper participant checking with validated database queries
  - ✅ **IMPROVED**: Better error handling and turn progression logic

#### 🛠️ Technical Improvements
- **Database Schema Updates**
  - ✅ **ADDED**: `release_percentage` column to characters table with automatic migration
  - ✅ **DEFAULT**: New characters start with 100% release (baseline power)
  - ✅ **VALIDATION**: Proper data type handling (REAL) for percentage values

- **Calculation System Enhancements**
  - ✅ **NEW**: `calculateMaxAffordableMultiplier()` function for ki cost validation
  - ✅ **NEW**: `calculateEffectivePLWithRelease()` wrapper for automatic release lookup
  - ✅ **ENHANCED**: Original `calculateEffectivePL()` supports optional release parameter
  - ✅ **OPTIMIZED**: Efficient ki cost calculations with proper effort integration

- **Command Integration Updates**
  - ✅ **UPDATED**: `!pl` command shows release percentage and applies it to effective PL
  - ✅ **UPDATED**: `!attack` command uses release percentage and shows max multipliers
  - ✅ **UPDATED**: `!defend` command uses release percentage and shows max multipliers
  - ✅ **CONSISTENT**: All combat commands now use unified effective PL calculation

#### 📊 User Experience Improvements
- **Informational Displays**
  - ✅ **ENHANCED**: Attack selection shows max affordable ki attack multiplier
  - ✅ **ENHANCED**: Defense selection shows both max additive and max multiplier side-by-side
  - ✅ **CLEAR**: "No multipliers affordable" message when ki is insufficient
  - ✅ **HELPFUL**: Suggestions to lower effort or use physical attacks when ki is low

- **Error Prevention**
  - ✅ **PROACTIVE**: Blocks impossible attacks before they're attempted
  - ✅ **EDUCATIONAL**: Clear explanations of ki costs and limitations
  - ✅ **GUIDED**: Effort level suggestions and alternative action recommendations

#### 🎯 Power Level System Integration
- **Release Command Features**
  - Displays base effective PL (100% release) vs current effective PL
  - Shows power surge indicators for releases above 100%
  - Shows power suppression indicators for releases below 100%
  - Maintains all existing bonuses and penalties while applying release percentage

- **Combat Integration**
  - Release percentage affects all attack and defense calculations
  - Works seamlessly with forms, racial bonuses, and ki debuffs
  - Provides temporary power adjustment capability for roleplay scenarios

### Updated Components
- `src/commands/release.js` - NEW: Manual power level adjustment command
- `src/commands/pl.js` - Enhanced with release percentage display and calculation
- `src/commands/attack.js` - Added max multiplier display and release integration
- `src/commands/defend.js` - Added max multiplier display and release integration
- `src/utils/calculations.js` - New functions for release and max multiplier calculations
- `helper_functions.js` - Fixed turn advancement SQL errors and logic
- Database schema - Added release_percentage column with automatic migration

### Migration Notes
- Database automatically adds `release_percentage` column on first run
- Existing characters default to 100% release (no gameplay impact)
- All existing combat mechanics remain unchanged
- Release system is purely additive and optional

### Bug Fixes Resolved
- Arcosian Resilience incorrectly applied to non-Arcosian characters
- Turn advancement failing due to SQL syntax errors
- Ki attacks allowed when insufficient ki for any multiplier
- Missing max multiplier information causing failed attack attempts
- Inconsistent effective PL calculations between commands

### Performance Optimizations
- Efficient max multiplier calculations with early termination
- Reduced database queries through caching of release percentages
- Optimized SQL queries for turn advancement and racial detection

---

## [0.0.3] - 2025-08-13

### Major Racial System Overhaul & Combat Fixes

#### 🧬 Racial Abilities - Complete Rewrite
- **Zenkai System (Saiyan)**
  - ✅ **FIXED**: Added missing Zenkai logic to turn advancement system
  - ✅ **FIXED**: Corrected database column usage (`last_enemy_pl` instead of `last_attacker_pl`)
  - ✅ **ENHANCED**: Zenkai now properly triggers when attacking stronger opponents
  - ✅ **IMPROVED**: Added proper channel-based combat state tracking
  - Zenkai grants 10% base PL bonus per round when hitting stronger enemies

- **Majin Magic System (Majin)**
  - ✅ **FIXED**: Corrected SQL queries using proper `racial_tag` column
  - ✅ **FIXED**: Added missing `channel_id` parameter for combat state operations  
  - ✅ **ENHANCED**: Proper ki gain and PL bonus calculations (up to 50% base PL cap)
  - ✅ **IMPROVED**: Better error handling and fallback logic
  - Grants ki and PL boosts equal to damage percentage dealt to enemies

- **Majin Regeneration Standardization**
  - ✅ **STANDARDIZED**: All files now use consistent 10% basic / 20% enhanced rates
  - ✅ **FIXED**: Enhanced regeneration now properly costs ki (3 × 100/Control)
  - ✅ **UPDATED**: Fixed inconsistent values across multiple utility files

- **Namekian Giant Form Implementation**
  - ✅ **IMPLEMENTED**: Added missing +40 Strength/Defense stat bonuses to damage calculations
  - ✅ **ENHANCED**: Updated `calculatePhysicalAttack` and `calculatePhysicalDefense` functions
  - ✅ **FIXED**: Proper ki drain using `calculateKiCost(3, control)` formula
  - Giant form now provides substantial combat advantages as intended

#### 🛠️ Database & Infrastructure
- **Combat State Table Enhancements**
  - ✅ **ADDED**: `last_enemy_pl` column for proper Zenkai tracking
  - ✅ **IMPROVED**: Better primary key constraints with channel_id
  - ✅ **MIGRATION**: Automatic database schema updates

- **Power Level Display Fixes**
  - ✅ **FIXED**: `zenkaiBonus is not defined` error in `!pl` command
  - ✅ **ENHANCED**: Added Majin Magic bonus display in power level output
  - ✅ **IMPROVED**: Better combat bonus visualization

#### 🎯 Turn Management System
- **Turn Order Automation**
  - ✅ **IMPLEMENTED**: "Would you like to end your turn?" buttons after defense
  - ✅ **ENHANCED**: Automatic turn order creation when players attack each other
  - ✅ **IMPROVED**: Seamless combat flow with embedded turn advancement

- **End-of-Turn Effects**
  - ✅ **STANDARDIZED**: Consistent racial effect application across all files
  - ✅ **ENHANCED**: Proper channel ID propagation for combat state tracking
  - ✅ **FIXED**: Missing Zenkai logic in turn.js command

#### 🔧 Code Quality & Maintenance
- **Function Modernization**
  - ✅ **UPDATED**: Made damage calculation functions async for database access
  - ✅ **ENHANCED**: Better parameter passing with database and character ID
  - ✅ **IMPROVED**: Backward compatibility maintained for existing calls

- **Error Handling**
  - ✅ **ENHANCED**: Better SQL error messages and debugging
  - ✅ **IMPROVED**: Graceful fallbacks for missing database parameters
  - ✅ **ADDED**: Comprehensive logging for racial ability activations

#### 📊 Testing & Validation
- **Comprehensive Testing Suite**
  - ✅ **VERIFIED**: All racial abilities working with proper stat bonuses
  - ✅ **CONFIRMED**: Zenkai accumulation over multiple combat rounds
  - ✅ **VALIDATED**: Majin Magic ki gain and PL bonus calculations
  - ✅ **TESTED**: Giant form stat application in damage calculations

### Summary
Version 0.0.3 represents a major overhaul of the racial ability system, fixing critical bugs that prevented Zenkai and Majin Magic from functioning properly, standardizing Majin Regeneration across all files, and implementing the missing Giant Form stat bonuses. The turn management system has been enhanced with automation features, and the database layer has been improved for better combat state tracking.

---

## [0.0.2] - 2025-08-10

### Major System Enhancements & Bug Fixes

#### 🔧 Critical Bug Fixes
- **Fixed Zenkai System Integration**
  - Resolved `zenkaiBonus is not defined` errors in attack and defend commands
  - Properly integrated Zenkai bonus calculations across all combat functions
  - Fixed form modifier parsing to support multiple formats (`*5`, `5*`, `set5`)

- **Combat System Stability**
  - Fixed undefined variable errors in `handleBlock` and `handleDodge` functions
  - Enhanced error handling in all combat resolution paths
  - Improved combat state management and cleanup

#### 🎨 User Interface Improvements
- **Streamlined Combat Messages**
  - Reduced attack/defend command message count from 4+ to 2 messages
  - Replaced `followUp()` with `editReply()` for cleaner message flow
  - Combined combat results and action details into single embeds
  - Added proper embedded error messages with titles and colors

- **Enhanced Combat Status Display**
  - Removed automatic "DEFEATED" status message
  - Allow health values to go negative for combat mechanics
  - Improved health bar and percentage displays
  - Only show "CRITICAL" status for positive health below 20%

#### ⚔️ Combat System Enhancements
- **Zenkai System Improvements**
  - Full integration in `pl.js` command to display current Zenkai bonuses
  - Proper Zenkai bonus calculation in `combat.js` resolution
  - Fixed Zenkai bonus application in effective PL calculations
  - Added Zenkai bonus display in power level embeds

- **Form System Fixes**
  - Enhanced form modifier parsing to support multiple input formats
  - Fixed `*5` and `5*` multiplier recognition
  - Improved form modifier validation and error handling

#### 🛠️ Technical Improvements
- **Error Handling**
  - Added comprehensive timeout handling with embedded messages
  - Improved validation error messages with proper Discord embeds
  - Enhanced ki insufficiency error displays
  - Better multiplier interval validation messages

- **Code Quality**
  - Fixed variable scoping issues across combat functions
  - Improved function consistency between attack and defend commands
  - Enhanced database integration for Zenkai state management
  - Better separation of concerns in combat resolution

#### 🚀 New Features
- **Bot Invitation System**
  - Added `generate-invite.js` utility for easy bot setup
  - Automated permission calculation and URL generation
  - Setup instructions and required permissions documentation

#### 📊 Database & State Management
- **Combat State Enhancements**
  - Improved `combat_state` table utilization for Zenkai bonuses
  - Better channel-specific state tracking
  - Enhanced character racial data integration

#### 🎯 Performance Optimizations
- **Message Efficiency**
  - Reduced Discord API calls through message editing
  - Improved interaction response handling
  - Better user input message cleanup

### Updated Components
- `src/commands/attack.js` - Streamlined UI, Zenkai integration, error handling
- `src/commands/defend.js` - Fixed variable scoping, improved UI, Zenkai support
- `src/commands/pl.js` - Added Zenkai bonus display and calculation
- `src/utils/calculations.js` - Enhanced Zenkai system, improved PL calculations
- `src/utils/combat.js` - Fixed health handling, removed defeat status, Zenkai integration
- `generate-invite.js` - New bot invitation utility

### Migration Notes
- No database schema changes required
- Existing character data remains compatible
- Combat state tracking improved but backwards compatible

### Known Issues Fixed
- Zenkai bonus undefined errors
- Form modifier parsing failures
- Combat UI message clutter
- Health value clamping preventing negative values
- Inconsistent error message formatting

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
