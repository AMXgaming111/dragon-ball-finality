# SADDALL Command Usage

## Description
The `!saddall` command modifies ALL character attributes (Strength, Defense, Agility, Endurance, Control) at once.

## Syntax
```
!saddall <@user> <operation> <value>
```

## Operations
- `+` - Add value to all stats
- `-` - Subtract value from all stats
- `*` - Multiply all stats by value
- `/` - Divide all stats by value
- `set` - Set all stats to the exact value

## Examples
```bash
# Add 10 to all stats
!saddall @user + 10

# Subtract 5 from all stats
!saddall @user - 5

# Set all stats to 20
!saddall @user set 20

# Multiply all stats by 1.5
!saddall @user * 1.5

# Divide all stats by 2
!saddall @user / 2
```

## Features
- ✅ Staff-only command (requires Staff role)
- ✅ Affects all 5 stats simultaneously
- ✅ Handles endurance changes (updates health/ki pools)
- ✅ Shows before/after values for each stat
- ✅ Minimum value enforcement (stats cannot go below 1)
- ✅ Detailed embed response with all changes

## Differences from !sadd
- **!sadd**: Modifies one specific stat
- **!saddall**: Modifies all stats with the same operation

This is especially useful for:
- Character resets
- Bulk stat adjustments
- Testing scenarios
- Character progression rewards
