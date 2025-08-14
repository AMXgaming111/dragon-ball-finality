// Test to verify the exact Zenkai calculation
const { calculateEffectivePL, calculateKiLossFromHealth } = require('./src/utils/calculations');

console.log('🧮 Zenkai Calculation Verification\n');

// Test parameters
const basePL = 1000;
const kiPercentage = 80; // 80% ki
const formMultiplier = 1.0;
const hasArcosianResilience = false;
const zenkaiBonus = 100; // 10% of 1000 = 100
const majinMagicBonus = 0;

console.log('Input Parameters:');
console.log(`Base PL: ${basePL}`);
console.log(`Ki Percentage: ${kiPercentage}%`);
console.log(`Form Multiplier: ${formMultiplier}x`);
console.log(`Zenkai Bonus: +${zenkaiBonus} PL`);
console.log('');

// Check what ki debuff is applied
console.log('Ki Debuff Calculation:');
const kiDebuff = calculateKiLossFromHealth(kiPercentage);
console.log(`Ki Debuff: ${kiDebuff}%`);
console.log('');

// Calculate step by step
console.log('Step-by-step Calculation:');
console.log(`1. Form adjusted PL: ${basePL} × ${formMultiplier} = ${basePL * formMultiplier}`);
console.log(`2. Add Zenkai bonus: ${basePL * formMultiplier} + ${zenkaiBonus} = ${basePL * formMultiplier + zenkaiBonus}`);
console.log(`3. Apply ki debuff: ${basePL * formMultiplier + zenkaiBonus} × (1 - ${kiDebuff}/100) = ${basePL * formMultiplier + zenkaiBonus} × ${1 - kiDebuff/100}`);

const result = calculateEffectivePL(basePL, kiPercentage, formMultiplier, hasArcosianResilience, zenkaiBonus, majinMagicBonus);
console.log(`4. Final result: ${result}`);
console.log('');

console.log('Expected vs Actual:');
console.log(`Expected (your calculation): 1000 + 100 = 1100, then apply ki effect`);
console.log(`Actual result: ${result}`);
console.log('');

// Test different ki percentages to see the pattern
console.log('Ki Percentage Effects:');
[100, 90, 80, 70, 60, 50].forEach(ki => {
    const debuff = calculateKiLossFromHealth(ki);
    const effectivePL = calculateEffectivePL(basePL, ki, formMultiplier, hasArcosianResilience, zenkaiBonus, majinMagicBonus);
    console.log(`${ki}% Ki → ${debuff}% debuff → ${effectivePL} Effective PL`);
});

console.log('\n🎯 The issue might be in how ki percentage affects the calculation!');
