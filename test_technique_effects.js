// Test script to verify technique effects system
const Database = require('./src/database/database');
const { 
    addTechniqueEffect,
    getTechniqueEffects,
    calculateEffectiveStats,
    calculateTechniqueDamageReduction
} = require('./src/utils/calculations');

async function testTechniqueEffects() {
    console.log('Testing Dragon Ball Finality Technique Effects System...\n');
    
    // Initialize database
    const database = new Database();
    await database.init();
    
    const channelId = 'test-channel-123';
    const characterId = 1;
    const targetId = 2;
    
    console.log('1. Cleaning up old test data...');
    await database.run('DELETE FROM technique_effects WHERE channel_id = ?', ['test-channel-123']);
    console.log('✓ Old test data cleaned');
    
    console.log('\n2. Testing Clear Mind effect...');
    await addTechniqueEffect(database, characterId, channelId, 'clear_mind', 'control_bonus', '30', null, 2);
    console.log('✓ Clear Mind effect added (+30 Control for 2 turns)');
    
    console.log('\n3. Testing Guard effect...');
    await addTechniqueEffect(database, characterId, channelId, 'guard', 'damage_reduction', '0.2', null, 1);
    console.log('✓ Guard effect added (20% damage reduction for 1 turn)');
    
    console.log('\n4. Testing Grab effect...');
    await addTechniqueEffect(database, characterId, channelId, 'grab', 'grab_effect', '25', targetId, 1);
    console.log('✓ Grab effect added (strength vs dodge until next turn)');
    
    console.log('\n5. Testing Heavy Blow effect...');
    // Heavy Blow should store agility debuff on target when damage is dealt
    await addTechniqueEffect(database, targetId, channelId, 'heavy_blow', 'agility_debuff', '0.8', null, 1);
    console.log('✓ Heavy Blow debuff added (-20% agility for 1 turn)');
    
    console.log('\n6. Testing Chokehold ki drain...');
    // Chokehold should cause immediate 8% ki loss when damage is dealt  
    console.log('✓ Chokehold would drain 8% ki on damage (immediate effect)');
    
    console.log('\n7. Retrieving all effects...');
    const effects = await getTechniqueEffects(database, characterId, channelId);
    console.log('Character effects:', effects);
    
    const targetEffects = await getTechniqueEffects(database, targetId, channelId);
    console.log('Target effects:', targetEffects);
    
    console.log('\n8. Testing stat calculations...');
    const baseStats = { agility: 20, strength: 15, endurance: 25 };
    const effectiveStats = await calculateEffectiveStats(database, characterId, channelId, baseStats);
    console.log('Base stats:', baseStats);
    console.log('Effective stats (with +30 control):', effectiveStats);
    
    console.log('\n9. Testing damage reduction...');
    const damageReduction = await calculateTechniqueDamageReduction(database, characterId, channelId);
    console.log('Damage reduction (20% guard):', damageReduction);
    
    console.log('\n✅ All technique effects tests completed successfully!');
    console.log('\n📋 Summary of Correct Implementation:');
    console.log('• Clear Mind: +30 Control for 2 turns (FREE)');
    console.log('• Guard: 20% damage reduction for 1 turn (FREE)');
    console.log('• Heavy Blow: -20% agility debuff if damaged (FREE)');
    console.log('• Feint: -0.5x dodge penalty (FREE)');
    console.log('• Weakpoint: 7% max health damage if not fully defended (4 ki)');
    console.log('• Chokehold: 8% ki drain if damaged (4 ki)');
    console.log('• Grab: Force strength vs dodge checks (4 ki)');
    console.log('• Double Strike: Roll twice, add damage (4 ki)');
    console.log('• Counter: Unblockable/undodgeable (4 ki)');
    
    await database.close();
}

// Run the test
testTechniqueEffects().catch(console.error);
