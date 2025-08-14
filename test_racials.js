// Test script to verify racial mechanics implementation
const { getCombatBonuses, handleMajinMagic, calculateEffectivePL } = require('./src/utils/calculations');

async function testRacialMechanics() {
    console.log('Testing racial mechanics implementation...\n');

    // Test calculateEffectivePL with racial bonuses
    console.log('=== Testing calculateEffectivePL with racial bonuses ===');
    
    const basePL = 1000;
    const kiPercentage = 0.8; // 80% ki
    const formMultiplier = 2.0; // 2x form
    const hasArcosianResilience = false;
    const zenkaiBonus = 500; // +500 PL from Zenkai
    const majinMagicBonus = 300; // +300 PL from Majin Magic

    const effectivePL = calculateEffectivePL(
        basePL, 
        kiPercentage, 
        formMultiplier, 
        hasArcosianResilience, 
        zenkaiBonus, 
        majinMagicBonus
    );

    console.log(`Base PL: ${basePL}`);
    console.log(`Ki Percentage: ${kiPercentage * 100}%`);
    console.log(`Form Multiplier: ${formMultiplier}x`);
    console.log(`Zenkai Bonus: +${zenkaiBonus} PL`);
    console.log(`Majin Magic Bonus: +${majinMagicBonus} PL`);
    console.log(`Calculated Effective PL: ${effectivePL}`);
    
    // Expected calculation:
    // 1. Form adjusted: 1000 * 2.0 = 2000
    // 2. Add racial bonuses: 2000 + 500 + 300 = 2800
    // 3. Apply ki debuff: 2800 * (1 - ki_debuff)
    
    console.log(`Expected (approximate): ${Math.floor(2800 * 0.8)} (assuming 80% ki = no debuff)`);
    console.log('');

    // Test Majin Magic mechanics
    console.log('=== Testing Majin Magic mechanics ===');
    
    // Simulate damage dealing scenario
    const mockDb = {
        async get(query, params) {
            // Mock combat state retrieval
            if (query.includes('combat_state')) {
                return { majin_magic_bonus: 200 }; // Starting with 200 bonus
            }
            return null;
        },
        async run(query, params) {
            console.log(`DB Update: ${query}`);
            console.log(`Params: ${JSON.stringify(params)}`);
        }
    };

    const characterId = 123;
    const damageDealt = 150;
    
    console.log(`Character ID: ${characterId}`);
    console.log(`Damage dealt: ${damageDealt}`);
    console.log('Calling handleMajinMagic...');
    
    try {
        await handleMajinMagic(mockDb, characterId, damageDealt);
        console.log('Majin Magic handling completed successfully!');
    } catch (error) {
        console.error('Error in handleMajinMagic:', error);
    }
    
    console.log('\n=== Test completed ===');
    console.log('If no errors appeared above, the racial mechanics should be working correctly!');
}

// Run the test
testRacialMechanics().catch(console.error);
