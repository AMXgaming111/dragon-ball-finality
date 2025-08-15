// Test script to verify the new ki debuff calculations
const { calculateKiLossFromHealth } = require('./src/utils/calculations');

console.log('Testing new Ki Debuff Calculations:');
console.log('=====================================');

// Test key breakpoints according to the specifications:
// (First 50%) From 100%-51% - 0.5% debuff per point lost [25% total loss]
// (Next 30%) 50%-21% - 1% debuff per point lost [30% total loss, for a combined total of 55% loss]
// (Last 20%) 20%-0% - 1.5% debuff per point lost [30% total loss, for a combined total of 85% loss]

const testCases = [
    { health: 100, expected: 0 },
    { health: 50, expected: 25 },   // End of first tier: exactly 25%
    { health: 49, expected: 26 },   // Start of second tier: 25% + 1%
    { health: 20, expected: 55 },   // End of second tier: exactly 55%
    { health: 19, expected: 56.5 }, // Start of third tier: 55% + 1.5%
    { health: 0, expected: 85 },    // Maximum: exactly 85%
];

testCases.forEach(({ health, expected }) => {
    const actual = calculateKiLossFromHealth(health);
    const status = Math.abs(actual - expected) < 0.1 ? '✅' : '❌';
    console.log(`${status} Health: ${health}% -> Debuff: ${actual}% (Expected: ${expected}%)`);
});

console.log('\nTier Breakdown (Adjusted for exact targets):');
console.log('First Tier: 50 points × 0.5% = 25% loss (100% to 50%)');
console.log('Second Tier: 30 points × 1.0% = 30% loss (49% to 20%)');  
console.log('Third Tier: 20 points × 1.5% = 30% loss (19% to 0%)');
console.log('Total: 25% + 30% + 30% = 85%');
