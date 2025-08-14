// Test Majin Magic functionality
const { handleMajinMagic, getCombatBonuses } = require('./src/utils/calculations');

const mockDatabase = {
    get: async (query, params) => {
        console.log('Full Query:', query);
        console.log('Params:', params);
        
        if (query.includes('character_racials') && query.includes('racial_tag')) {
            console.log('✅ Found Majin Magic racial');
            return { character_id: params[0], racial_tag: 'mmagic', is_active: 1 };
        }
        
        if (query.includes('characters') && query.includes('SELECT * FROM characters')) {
            console.log('✅ Found character data');
            return {
                id: params[0],
                base_pl: 1000,
                current_ki: 50,
                endurance: 100
            };
        }
        
        if (query.includes('combat_state') && query.includes('SELECT * FROM combat_state')) {
            console.log('✅ Found existing combat state');
            return {
                character_id: params[0],
                channel_id: params[1] || 'test-channel',
                zenkai_bonus: 0,
                majin_magic_bonus: 100  // Existing bonus
            };
        }
        
        if (query.includes('combat_state') && query.includes('zenkai_bonus, majin_magic_bonus')) {
            console.log('✅ Getting combat bonuses');
            return {
                zenkai_bonus: 0,
                majin_magic_bonus: 300  // New total after update
            };
        }
        
        console.log('❓ Unhandled query');
        return null;
    },
    
    run: async (query, params) => {
        console.log('UPDATE Query:', query.substring(0, 60) + '...');
        console.log('UPDATE Params:', params);
        
        if (query.includes('UPDATE characters SET current_ki')) {
            console.log('✅ Updated character ki');
        } else if (query.includes('UPDATE combat_state SET majin_magic_bonus')) {
            console.log('✅ Updated combat state');
        } else if (query.includes('INSERT INTO combat_state')) {
            console.log('✅ Created new combat state');
        }
        
        return { changes: 1 };
    }
};

async function testMajinMagic() {
    console.log('🧪 Testing Majin Magic\n');
    
    const characterId = 1;
    const channelId = 'test-channel';
    const healthPercentageLost = 20; // Enemy lost 20% health
    
    console.log('=== Testing Majin Magic Activation ===');
    try {
        await handleMajinMagic(mockDatabase, characterId, healthPercentageLost, channelId);
        console.log('✅ Majin Magic completed successfully');
    } catch (error) {
        console.error('❌ Error in Majin Magic:', error);
    }
    
    console.log('\n=== Testing Combat Bonuses Retrieval ===');
    const bonuses = await getCombatBonuses(mockDatabase, characterId, channelId);
    console.log('Combat Bonuses:', bonuses);
    
    console.log('\n=== Expected Results ===');
    console.log('Ki gain: 20% of 100 endurance = 20 ki points');
    console.log('PL bonus: 20% of 1000 base PL = 200 PL');
    console.log('New ki: 50 + 20 = 70 (capped at 100)');
}

testMajinMagic().catch(console.error);
