# Heal Command Documentation

## Command: `!heal`

### Description
The `!heal` command is a staff-only utility that instantly restores a character's health and ki to 100% of their maximum values. This command respects form modifications and calculates the proper maximum values based on the character's current active form.

### Usage
```
!heal <@user>
```

### Parameters
- `@user` - Discord mention of the user whose character you want to heal

### Examples
```
!heal @TarikPlayer
!heal @AnotherUser
```

### Permissions
- **Staff Role Required**: This command can only be used by users with the Staff role
- Command will return an error message if used by non-staff members

### Features
1. **Form-Aware Healing**: Calculates maximum health and ki based on active form modifiers
2. **Complete Restoration**: Sets both health and ki to 100% of their maximum values
3. **Detailed Feedback**: Shows character name, player, form, and final health/ki values
4. **Staff Logging**: Logs healing actions to console for administrative tracking

### Calculations
- **Max Health**: `(Base PL × Form PL Modifier) × (Endurance + Form Endurance Modifier)`
- **Max Ki**: `Endurance + Form Endurance Modifier`

### Error Handling
- Validates user mention exists
- Checks if target user has an active character
- Handles form modifier parsing gracefully
- Provides clear error messages for invalid usage

### Database Updates
The command updates the `characters` table, setting:
- `current_health` = calculated maximum health
- `current_ki` = calculated maximum ki

### Success Response
Returns a green embed showing:
- Character name and player
- Current form (or "Base Form" if no form active)
- Final health and ki values (both at 100%)
- Staff member who performed the heal
- Timestamp of the action
