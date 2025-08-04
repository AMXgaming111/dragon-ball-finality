<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Dragon Ball Finality Discord Bot - Copilot Instructions

This is a Discord.js v14 bot for a Dragon Ball-themed RPG server with complex game mechanics.

## Code Style & Patterns
- Use ES6+ features and async/await for all database operations
- Follow the existing command structure with `name`, `description`, and `execute` properties
- Always handle errors gracefully with try-catch blocks
- Use Discord.js embeds for all command responses
- Implement proper permission checks for staff-only commands

## Database Schema
- SQLite database with tables: users, characters, character_racials, forms, character_forms, turn_orders, combat_state
- All character data is normalized across multiple tables
- Use the Database class methods (run, get, all) for all queries
- Always check for null/undefined values from database queries

## Game Mechanics
- Power Level (PL) calculations involve base PL, ki percentage, and form multipliers
- Ki loss affects effective PL based on complex percentage ranges
- Health and Ki are calculated from Endurance stat and Base PL
- Combat uses effort levels (1-5) that affect roll ranges and ki costs
- Forms modify stats and PL with various multipliers and drains

## Discord.js Patterns
- Use EmbedBuilder for all rich messages
- Implement button interactions for complex UIs (pagination, confirmations)
- Use ActionRowBuilder and ButtonBuilder for interactive components
- Always set interaction collectors with appropriate timeouts
- Handle collector cleanup on end events

## Command Categories
- Character Management: cc, dc, sw, cl, stats, addstats
- Combat: attack, defend, turn, pl, health, ki
- Staff Tools: spl, sadd, rc, sform, formset, sskill, saffinity, say
- Racial Abilities: race, mregen, ngiant, nregen
- Utility: r, form, currentform

## Security & Validation
- Always validate user input and command arguments
- Check staff permissions using hasStaffRole utility
- Sanitize user mentions and prevent SQL injection
- Validate numeric inputs and handle edge cases

## Error Handling
- Log all errors to console with context
- Provide user-friendly error messages
- Implement graceful degradation for missing data
- Use appropriate HTTP status-like patterns for command responses
