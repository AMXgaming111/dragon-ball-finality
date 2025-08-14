// Test to verify Zenkai logic
console.log('🧪 Testing Zenkai Logic in turn.js\n');

// Test scenario: Character with 10 base PL faced enemy with 20 PL
const testData = {
    character: {
        id: 1,
        base_pl: 10,
        current_ki: 100,
        endurance: 100,
        racials: 'zenkai'
    },
    combatState: {
        character_id: 1,
        channel_id: 'test-channel',
        zenkai_bonus: 0,
        last_enemy_pl: 20  // Enemy had 20 PL
    }
};

// Calculate current effective PL
const kiPercentage = (testData.character.current_ki / testData.character.endurance) * 100;
console.log('Ki Percentage:', kiPercentage + '%');

// Mock effective PL calculation (simplified)
const currentEffectivePL = testData.character.base_pl; // 10 PL
console.log('Character Effective PL:', currentEffectivePL);
console.log('Last Enemy PL:', testData.combatState.last_enemy_pl);

// Check Zenkai condition
if (testData.combatState.last_enemy_pl > currentEffectivePL) {
    const zenkaiGain = Math.floor(testData.character.base_pl * 0.10);
    const newTotal = testData.combatState.zenkai_bonus + zenkaiGain;
    
    console.log('✅ Zenkai should trigger!');
    console.log('Zenkai gain:', zenkaiGain + ' PL');
    console.log('New total Zenkai bonus:', newTotal + ' PL');
    console.log('New effective PL would be:', currentEffectivePL + newTotal);
} else {
    console.log('❌ Zenkai should NOT trigger');
}

console.log('\n📋 What to check:');
console.log('1. Use !attack against stronger enemy (20+ PL)');
console.log('2. Use !turn to advance turn');
console.log('3. Check console for "Zenkai activated" message');
console.log('4. Use !pl to see if Zenkai Boost appears');
