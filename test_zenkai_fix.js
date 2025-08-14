// Test to verify Zenkai logic is working correctly
const { getCombatBonuses } = require('./src/utils/calculations');

// Mock database for testing
const mockDatabase = {
    get: async (query, params) => {
        console.log('Query:', query);
        console.log('Params:', params);
        
        if (query.includes('combat_state')) {
            // Mock combat state with enemy PL higher than character
            return {
                character_id: params[0],
                zenkai_bonus: 0,
                majin_magic_bonus: 0,
                last_enemy_pl: 20  // Enemy had 20 PL
            };
        }
        
        if (query.includes('characters')) {
            return {
                id: params[0],
                char_name: 'Test Character',
                base_pl: 10,
                current_health: 100,
                current_ki: 100,
                endurance: 100,
                control: 100,
                racials: 'zenkai'
            };
        }
        
        return null;
    },
    
    run: async (query, params) => {
        console.log('UPDATE Query:', query);
        console.log('UPDATE Params:', params);
        return { changes: 1 };
    }
};

async function testZenkaiLogic() {
    console.log('🧪 Testing Zenkai Logic\n');
    
    const characterId = 1;
    const channelId = 'test-channel';
    
    // Get initial combat bonuses
    const bonuses = await getCombatBonuses(mockDatabase, characterId, channelId);
    console.log('Initial bonuses:', bonuses);
    
    // Calculate character's current effective PL (should be 10)
    const { calculateEffectivePL } = require('./src/utils/calculations');
    const charEffectivePL = calculateEffectivePL(10, 100, 1, false, bonuses.zenkaiBonus, bonuses.majinMagicBonus);
    console.log('Character Effective PL:', charEffectivePL);
    
    // Simulate the Zenkai check
    const combatState = await mockDatabase.get('SELECT * FROM combat_state WHERE character_id = ?', [characterId]);
    console.log('Combat State:', combatState);
    
    if (combatState && combatState.last_enemy_pl > charEffectivePL) {
        console.log(`✅ Zenkai should trigger: Enemy PL (${combatState.last_enemy_pl}) > Character PL (${charEffectivePL})`);
        
        const zenkaiGain = Math.floor(10 * 0.10); // 10% of base PL
        console.log(`Zenkai gain would be: +${zenkaiGain} PL`);
    } else {
        console.log(`❌ Zenkai should NOT trigger: Enemy PL (${combatState?.last_enemy_pl}) <= Character PL (${charEffectivePL})`);
    }
}

testZenkaiLogic().catch(console.error);
