// Test to verify accuracy multiplier ki cost is being applied

console.log('Testing accuracy multiplier ki cost logic...\n');

// Simulate the logic from attack.js
function testAccuracyMultiplierCost(additive, accuracyMultiplier, control, endurance, effort) {
    console.log(`\nTest: additive=${additive}, accuracyMultiplier=${accuracyMultiplier}, control=${control}, endurance=${endurance}, effort=${effort}`);
    
    let kiChange = 0;
    
    // Simulate the calculateKiSpecialCost function
    function calculateKiSpecialCost(multiplier, control) {
        if (multiplier < 1.5) return 0;
        const intervals = Math.floor((multiplier - 1.0) / 0.5);
        if (intervals <= 0) return 0;
        
        let totalCost = 0;
        for (let i = 0; i < intervals; i++) {
            const intervalCost = Math.max(1, Math.floor(5 * (100 / control)));
            totalCost += intervalCost;
        }
        return totalCost;
    }
    
    // Simulate effort ki costs
    function getEffortKiCost(effort) {
        const effortCosts = {
            1: -3,  // Low effort: gain 3% ki
            2: 0,   // Normal effort: no cost
            3: 5,   // Moderate effort: 5% cost
            4: 7,   // High effort: 7% cost
            5: 10   // Monumental effort: 10% cost
        };
        return effortCosts[effort] || 0;
    }
    
    const effortKiCost = getEffortKiCost(effort);
    
    if (additive === 0 && accuracyMultiplier === 1) {
        // Basic attack - gain 5% ki (but still apply effort cost if any)
        kiChange = Math.floor(endurance * 0.05);
        console.log(`  Basic attack: +${Math.floor(endurance * 0.05)} ki from basic`);
        
        if (effortKiCost > 0) {
            const cost = Math.floor(endurance * (effortKiCost / 100));
            kiChange -= cost;
            console.log(`  Effort cost: -${cost} ki`);
        } else if (effortKiCost < 0) {
            const gain = Math.floor(endurance * (Math.abs(effortKiCost) / 100));
            kiChange += gain;
            console.log(`  Effort gain: +${gain} ki`);
        }
    } else {
        // Modified attack - calculate ki costs
        console.log('  Modified attack:');
        
        // Apply accuracy multiplier ki cost if used
        if (accuracyMultiplier > 1) {
            const accuracyKiCost = calculateKiSpecialCost(accuracyMultiplier, control);
            kiChange -= accuracyKiCost;
            console.log(`    Accuracy multiplier ${accuracyMultiplier}x: -${accuracyKiCost} ki`);
        }
        
        // Apply effort ki cost/gain
        if (effortKiCost > 0) {
            const cost = Math.floor(endurance * (effortKiCost / 100));
            kiChange -= cost;
            console.log(`    Effort cost: -${cost} ki`);
        } else if (effortKiCost < 0) {
            const gain = Math.floor(endurance * (Math.abs(effortKiCost) / 100));
            kiChange += gain;
            console.log(`    Effort gain: +${gain} ki`);
        }
    }
    
    console.log(`  Total ki change: ${kiChange > 0 ? '+' : ''}${kiChange}`);
    return kiChange;
}

// Test cases
testAccuracyMultiplierCost(0, 1, 100, 100, 2); // Basic attack, normal effort
testAccuracyMultiplierCost(0, 2, 100, 100, 2); // Basic damage, 2x accuracy, normal effort
testAccuracyMultiplierCost(10, 1, 100, 100, 2); // Enhanced damage, normal accuracy, normal effort
testAccuracyMultiplierCost(10, 2, 100, 100, 2); // Enhanced damage, 2x accuracy, normal effort
testAccuracyMultiplierCost(0, 2, 50, 100, 3); // Basic damage, 2x accuracy, low control, moderate effort
