# Ki Effective PL Debuff Math Update

## Summary
Updated the `calculateKiLossFromHealth` function in `src/utils/calculations.js` to implement the new ki debuff tiers.

## New Ki Debuff Tiers

### Tier 1: 100% to 50% Health
- **Range**: 50 percentage points
- **Rate**: 0.5% debuff per point lost
- **Maximum Loss**: 25% total debuff

### Tier 2: 49% to 20% Health  
- **Range**: 30 percentage points
- **Rate**: 1.0% debuff per point lost
- **Maximum Loss**: 30% additional debuff
- **Combined Total**: 55% debuff at 20% health

### Tier 3: 19% to 0% Health
- **Range**: 20 percentage points 
- **Rate**: 1.5% debuff per point lost
- **Maximum Loss**: 30% additional debuff
- **Combined Total**: 85% debuff at 0% health

## Key Breakpoints
- **100% Health**: 0% debuff
- **50% Health**: 25% debuff
- **20% Health**: 55% debuff
- **0% Health**: 85% debuff (maximum)

## Changes from Previous System
- **Old**: 4-tier system with maximum 87.5% debuff
- **New**: 3-tier system with maximum 85% debuff
- **More severe**: Faster debuff progression in middle tiers
- **Cleaner**: Simplified tier structure with exact target percentages

## Implementation Details
- Function maintains the same interface
- Still respects Arcosian Resilience (halves debuff)
- Integrated with all existing combat calculations
- Maximum debuff capped at 85%
