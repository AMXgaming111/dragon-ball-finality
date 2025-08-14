// Test script to verify Giant Form stat bonuses are working
const { calculatePhysicalAttack, calculatePhysicalDefense } = require('./src/utils/calculations');

// Mock database object for testing
const mockDatabase = {
    get: async (query, params) => {
        const [characterId] = params;
        
        // Mock data: Character 1 has giant form active, Character 2 doesn't
        if (characterId === 1 && query.includes('ngiant')) {
            return { character_id: 1, racial_tag: 'ngiant', is_active: 1 };
        }
        return null; // No giant form
    }
};

async function testGiantFormBonuses() {
    console.log('🧪 Testing Giant Form Stat Bonuses\n');
    
    const effectivePL = 1000;
    const baseStrength = 50;
    const baseDefense = 40;
    const additive = 0;
    
    // Test Physical Attack
    console.log('🗡️ Physical Attack Test:');
    const normalAttack = await calculatePhysicalAttack(effectivePL, baseStrength, additive, mockDatabase, 2);
    const giantAttack = await calculatePhysicalAttack(effectivePL, baseStrength, additive, mockDatabase, 1);
    
    console.log(`Normal Attack (Str ${baseStrength}): ${normalAttack}`);
    console.log(`Giant Attack (Str ${baseStrength + 40}): ${giantAttack}`);
    console.log(`Bonus: +${giantAttack - normalAttack} damage\n`);
    
    // Test Physical Defense
    console.log('🛡️ Physical Defense Test:');
    const normalDefense = await calculatePhysicalDefense(effectivePL, baseDefense, additive, mockDatabase, 2);
    const giantDefense = await calculatePhysicalDefense(effectivePL, baseDefense, additive, mockDatabase, 1);
    
    console.log(`Normal Defense (Def ${baseDefense}): ${normalDefense}`);
    console.log(`Giant Defense (Def ${baseDefense + 40}): ${giantDefense}`);
    console.log(`Bonus: +${giantDefense - normalDefense} defense\n`);
    
    // Test without database (backward compatibility)
    console.log('🔄 Backward Compatibility Test:');
    const backwardAttack = await calculatePhysicalAttack(effectivePL, baseStrength, additive);
    const backwardDefense = await calculatePhysicalDefense(effectivePL, baseDefense, additive);
    
    console.log(`No DB Attack: ${backwardAttack} (should equal normal)`);
    console.log(`No DB Defense: ${backwardDefense} (should equal normal)`);
    console.log(`Backward Compatible: ${backwardAttack === normalAttack && backwardDefense === normalDefense ? '✅' : '❌'}`);
}

testGiantFormBonuses().catch(console.error);
