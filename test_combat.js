const Database = require('./src/database/database');
const { storePendingAttack, getPendingAttack, resolveCombat } = require('./src/utils/combat');

async function testCombatSystem() {
    const db = new Database();
    await db.init();
    
    try {
        console.log('=== Testing Combat Resolution System ===\n');
        
        // Test data
        const channelId = 'test_channel';
        const attackerUserId = 'attacker123';
        const targetUserId = 'target456';
        const attackerCharacterId = 1;
        const targetCharacterId = 2;
        
        // Create test characters with health
        console.log('1. Setting up test characters...');
        await db.run('DELETE FROM characters WHERE id IN (1, 2)');
        await db.run('DELETE FROM users WHERE user_id IN (?, ?)', [attackerUserId, targetUserId]);
        
        // Create users first
        await db.run(`INSERT INTO users (user_id, active_character_id) VALUES (?, 1)`, [attackerUserId]);
        await db.run(`INSERT INTO users (user_id, active_character_id) VALUES (?, 2)`, [targetUserId]);
        
        // Create characters
        await db.run(`INSERT INTO characters (id, owner_id, name, race, base_pl, strength, defense, agility, endurance, control, current_health, current_ki) 
                     VALUES (1, 'attacker123', 'Goku', 'Saiyan', 50000, 100, 80, 90, 100, 85, 500000, 250000)`);
        await db.run(`INSERT INTO characters (id, owner_id, name, race, base_pl, strength, defense, agility, endurance, control, current_health, current_ki) 
                     VALUES (2, 'target456', 'Vegeta', 'Saiyan', 45000, 95, 85, 88, 95, 80, 450000, 225000)`);
        
        // Get initial health
        const targetBefore = await db.get('SELECT current_health FROM characters WHERE id = 2');
        console.log(`Target initial health: ${targetBefore.current_health}\n`);
        
        // Test 1: Store a pending attack
        console.log('2. Storing pending attack...');
        const attackData = {
            attackerName: 'Goku',
            targetName: 'Vegeta',
            attackRoll: 85,
            effort: 3,
            kiCost: 15
        };
        
        const attackId = await storePendingAttack(
            db, channelId, attackerUserId, targetUserId, 
            attackerCharacterId, targetCharacterId, 
            'physical', 25000, 85, attackData
        );
        console.log(`Stored attack with ID: ${attackId}\n`);
        
        // Test 2: Retrieve the pending attack
        console.log('3. Retrieving pending attack...');
        const pendingAttack = await getPendingAttack(db, channelId, attackerUserId, targetUserId);
        console.log('Found pending attack:', {
            id: pendingAttack.id,
            damage: pendingAttack.damage,
            accuracy: pendingAttack.accuracy,
            attack_type: pendingAttack.attack_type
        });
        console.log('Attack data:', pendingAttack.attack_data);
        console.log();
        
        // Test 3: Resolve combat with defense
        console.log('4. Resolving combat with defense...');
        const defenseRoll = 70;
        const effort = 2;
        const defenseType = 'block';
        
        const result = await resolveCombat(db, pendingAttack, defenseType, defenseRoll * 100); // Scale for damage reduction
        console.log('Combat result:', {
            type: result.type,
            finalDamage: result.finalDamage,
            defenseValue: result.defenseValue || result.dodgeValue,
            success: result.success
        });
        console.log();
        
        // Check final health
        const targetAfter = await db.get('SELECT current_health FROM characters WHERE id = 2');
        console.log(`Target final health: ${targetAfter.current_health}`);
        console.log(`Health lost: ${targetBefore.current_health - targetAfter.current_health}\n`);
        
        // Verify attack was cleaned up
        const remainingAttacks = await db.get(
            'SELECT * FROM pending_attacks WHERE channel_id = ? AND attacker_user_id = ? AND target_user_id = ?',
            [channelId, attackerUserId, targetUserId]
        );
        console.log('Attack cleaned up:', !remainingAttacks);
        
        console.log('\n=== Combat System Test Complete ===');
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        db.db.close();
    }
}

testCombatSystem();
