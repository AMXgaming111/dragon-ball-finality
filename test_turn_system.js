const Database = require('./src/database/database');

async function testTurnSystem() {
    const db = new Database();
    await db.init();
    
    try {
        console.log('=== Testing Turn System ===\n');
        
        const channelId = 'test_channel_turn';
        const user1Id = 'user1_turn';
        const user2Id = 'user2_turn';
        
        // Clean up existing data
        await db.run('DELETE FROM turn_orders WHERE channel_id = ?', [channelId]);
        await db.run('DELETE FROM characters WHERE owner_id IN (?, ?)', [user1Id, user2Id]);
        await db.run('DELETE FROM users WHERE user_id IN (?, ?)', [user1Id, user2Id]);
        await db.run('DELETE FROM character_racials WHERE character_id IN (SELECT id FROM characters WHERE owner_id IN (?, ?))', [user1Id, user2Id]);
        
        console.log('1. Setting up test characters with Majin Regeneration...');
        
        // Create users
        await db.run('INSERT INTO users (user_id) VALUES (?)', [user1Id]);
        await db.run('INSERT INTO users (user_id) VALUES (?)', [user2Id]);
        
        // Create characters
        const char1Result = await db.run(`
            INSERT INTO characters (owner_id, name, race, base_pl, strength, defense, agility, endurance, control, current_health, current_ki) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [user1Id, 'Majin Buu', 'Majin', 100000, 120, 100, 70, 150, 90, 1000000, 150]);
        
        const char2Result = await db.run(`
            INSERT INTO characters (owner_id, name, race, base_pl, strength, defense, agility, endurance, control, current_health, current_ki) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [user2Id, 'Cell', 'Android', 90000, 110, 105, 85, 140, 95, 800000, 140]);
        
        // Set active characters
        await db.run('UPDATE users SET active_character_id = ? WHERE user_id = ?', [char1Result.id, user1Id]);
        await db.run('UPDATE users SET active_character_id = ? WHERE user_id = ?', [char2Result.id, user2Id]);
        
        // Give Majin Buu the mregen racial
        await db.run('INSERT INTO character_racials (character_id, racial_name) VALUES (?, ?)', [char1Result.id, 'mregen']);
        
        // Simulate enhanced regeneration being activated
        await db.run('INSERT INTO character_racials (character_id, racial_name, is_active) VALUES (?, ?, ?)', [char1Result.id, 'mregen_enhanced', 1]);
        
        // Damage Majin Buu to test regeneration
        await db.run('UPDATE characters SET current_health = 500000 WHERE id = ?', [char1Result.id]);
        
        console.log('Characters created:');
        console.log(`- Majin Buu (damaged to 50% health for regen test)`);
        console.log(`- Cell\n`);
        
        // Create turn order
        const participants = [
            {
                userId: user1Id,
                username: 'TestUser1',
                characterName: 'Majin Buu',
                characterId: char1Result.id
            },
            {
                userId: user2Id,
                username: 'TestUser2',
                characterName: 'Cell',
                characterId: char2Result.id
            }
        ];
        
        await db.run(
            'INSERT INTO turn_orders (channel_id, current_turn, current_round, participants) VALUES (?, ?, ?, ?)',
            [channelId, 0, 1, JSON.stringify(participants)]
        );
        
        console.log('2. Turn order created with Majin Buu first\n');
        
        // Test end-of-turn effects by simulating the function
        console.log('3. Testing enhanced regeneration effects...');
        
        // Get health before
        const beforeRegen = await db.get('SELECT current_health, current_ki FROM characters WHERE id = ?', [char1Result.id]);
        console.log(`Before regen: Health=${beforeRegen.current_health}, Ki=${beforeRegen.current_ki}`);
        
        // Simulate the regeneration logic
        const character = await db.get(`
            SELECT c.*, 
                   GROUP_CONCAT(cr.racial_name) as racials
            FROM characters c
            LEFT JOIN character_racials cr ON c.id = cr.character_id
            WHERE c.id = ?
            GROUP BY c.id
        `, [char1Result.id]);
        
        let healthChange = 0;
        let kiChange = 0;
        const racials = character.racials ? character.racials.split(',') : [];
        
        if (racials.includes('mregen')) {
            // Check if enhanced regeneration is active
            const hasEnhancedRegen = await db.get(`
                SELECT * FROM character_racials 
                WHERE character_id = ? AND racial_name = 'mregen_enhanced' AND is_active = 1
            `, [char1Result.id]);
            
            const maxHealth = character.base_pl * character.endurance;
            const currentHealth = character.current_health || maxHealth;
            
            if (currentHealth < maxHealth) {
                if (hasEnhancedRegen) {
                    // Enhanced regeneration - 20% health
                    healthChange += Math.floor(maxHealth * 0.2);
                    
                    // Apply ki cost for enhanced regeneration
                    const { calculateKiCost } = require('./src/utils/calculations');
                    const kiCost = calculateKiCost(3, character.control);
                    kiChange -= kiCost;
                } else {
                    // Basic regeneration - 10% health
                    healthChange += Math.floor(maxHealth * 0.1);
                }
            }
        }
        
        // Apply changes
        if (healthChange !== 0) {
            const maxHealth = character.base_pl * character.endurance;
            const currentHealth = character.current_health || maxHealth;
            const newHealth = Math.min(maxHealth, currentHealth + healthChange);
            
            await db.run(
                'UPDATE characters SET current_health = ? WHERE id = ?',
                [newHealth, char1Result.id]
            );
        }

        if (kiChange !== 0) {
            const currentKi = character.current_ki || character.endurance;
            const newKi = Math.max(0, currentKi + kiChange);
            
            await db.run(
                'UPDATE characters SET current_ki = ? WHERE id = ?',
                [newKi, char1Result.id]
            );
        }
        
        // Get health after
        const afterRegen = await db.get('SELECT current_health, current_ki FROM characters WHERE id = ?', [char1Result.id]);
        console.log(`After regen: Health=${afterRegen.current_health}, Ki=${afterRegen.current_ki}`);
        
        const healthGain = afterRegen.current_health - beforeRegen.current_health;
        const kiLoss = beforeRegen.current_ki - afterRegen.current_ki;
        
        console.log(`Health gained: ${healthGain} (should be ~200,000 for 20% of 1M max health)`);
        console.log(`Ki lost: ${kiLoss} (should be ki cost for enhanced regen)`);
        
        // Test turn order retrieval
        console.log('\n4. Testing turn order retrieval...');
        const turnOrder = await db.get('SELECT * FROM turn_orders WHERE channel_id = ?', [channelId]);
        const storedParticipants = JSON.parse(turnOrder.participants);
        
        console.log('Turn order participants:');
        storedParticipants.forEach((p, i) => {
            console.log(`  ${i + 1}. ${p.characterName} (${p.username})`);
        });
        
        console.log('\n=== Turn System Test Complete ===');
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        db.db.close();
    }
}

testTurnSystem();
