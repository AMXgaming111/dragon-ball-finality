// Test script to verify updated Majin Magic implementation
const { handleMajinMagic, calculateEffectivePL } = require('./src/utils/calculations');

async function testUpdatedMajinMagic() {
    console.log('Testing updated Majin Magic implementation...\n');

    // Mock database
    const mockDb = {
        async get(query, params) {
            console.log(`DB Query: ${query}`);
            console.log(`Params: ${JSON.stringify(params)}`);
            
            if (query.includes('character_racials')) {
                return { racial_name: 'Majin Magic' }; // Character has Majin Magic
            }
            if (query.includes('SELECT * FROM characters')) {
                return { 
                    id: 123, 
                    base_pl: 1000, 
                    current_ki: 50, // 50 out of 100 endurance
                    endurance: 100 
                };
            }
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

    // Test scenario: Character deals damage that causes 25% health loss to defender
    console.log('=== Test Scenario ===');
    console.log('Attacker: 1000 Base PL, 50/100 Ki, existing 200 PL bonus');
    console.log('Defender takes damage causing 25% health loss');
    console.log('Expected: +25 Ki (25% of 100), +250 PL bonus (25% of 1000 base PL)');
    console.log('');

    const characterId = 123;
    const healthPercentageLost = 25; // 25% health lost by defender
    
    console.log('Calling handleMajinMagic...');
    try {
        await handleMajinMagic(mockDb, characterId, healthPercentageLost);
        console.log('✅ Majin Magic handling completed successfully!');
    } catch (error) {
        console.error('❌ Error in handleMajinMagic:', error);
    }
    
    console.log('\n=== Testing max cap scenario ===');
    console.log('Testing what happens when already at 45% bonus and dealing 20% damage...');
    
    // Mock for scenario where character already has 45% bonus
    const mockDbHighBonus = {
        async get(query, params) {
            if (query.includes('character_racials')) {
                return { racial_name: 'Majin Magic' };
            }
            if (query.includes('SELECT * FROM characters')) {
                return { 
                    id: 123, 
                    base_pl: 1000, 
                    current_ki: 50,
                    endurance: 100 
                };
            }
            if (query.includes('combat_state')) {
                return { majin_magic_bonus: 450 }; // 45% of 1000 = 450
            }
            return null;
        },
        async run(query, params) {
            console.log(`High Bonus DB Update: ${query}`);
            console.log(`Params: ${JSON.stringify(params)}`);
        }
    };
    
    const healthPercentageLost2 = 20; // This should only give 5% more (to reach 50% cap)
    
    try {
        await handleMajinMagic(mockDbHighBonus, characterId, healthPercentageLost2);
        console.log('✅ Max cap scenario completed successfully!');
    } catch (error) {
        console.error('❌ Error in max cap scenario:', error);
    }

    console.log('\n=== Testing calculateEffectivePL with Majin Magic bonus ===');
    
    const basePL = 1000;
    const kiPercentage = 0.75; // 75% ki
    const formMultiplier = 1.5;
    const hasArcosianResilience = false;
    const zenkaiBonus = 0;
    const majinMagicBonus = 450; // 45% of base PL

    const effectivePL = calculateEffectivePL(
        basePL, 
        kiPercentage, 
        formMultiplier, 
        hasArcosianResilience, 
        zenkaiBonus, 
        majinMagicBonus
    );

    console.log(`Base PL: ${basePL}`);
    console.log(`Form Multiplier: ${formMultiplier}x`);
    console.log(`Majin Magic Bonus: +${majinMagicBonus} PL`);
    console.log(`Ki: ${kiPercentage * 100}%`);
    console.log(`Effective PL: ${effectivePL}`);
    
    // Expected: (1000 * 1.5 + 450) * 0.75 = 1950 * 0.75 = 1462.5 ≈ 1462
    console.log(`Expected: ~1462 (1000 * 1.5 + 450) * 0.75`);
    
    console.log('\n🎉 All tests completed!');
}

testUpdatedMajinMagic().catch(console.error);
