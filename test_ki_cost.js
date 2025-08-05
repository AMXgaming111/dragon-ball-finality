const { calculateKiSpecialCost } = require('./src/utils/calculations');

// Test ki cost calculations
console.log('Testing ki cost calculations...\n');

const control = 100; // Standard control stat
const testMultipliers = [1.5, 2.0, 2.5, 3.0, 4.0];

testMultipliers.forEach(mult => {
    const cost = calculateKiSpecialCost(mult, control);
    console.log(`Multiplier ${mult}x with ${control} control: ${cost} ki`);
});

console.log('\nTesting with lower control (50):');
testMultipliers.forEach(mult => {
    const cost = calculateKiSpecialCost(mult, 50);
    console.log(`Multiplier ${mult}x with 50 control: ${cost} ki`);
});

console.log('\nTesting with very low control (20):');
testMultipliers.forEach(mult => {
    const cost = calculateKiSpecialCost(mult, 20);
    console.log(`Multiplier ${mult}x with 20 control: ${cost} ki`);
});
