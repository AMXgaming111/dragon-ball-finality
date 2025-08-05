const Database = require('./src/database/database');

async function testRealCharacterCombat() {
    const db = new Database();
    await db.init();
    
    try {
        console.log('=== Testing Real Character Combat ===\n');
        
        // Test user IDs
        const user1Id = 'test_user_1';
        const user2Id = 'test_user_2';
        
        // Clean up existing data
        await db.run('DELETE FROM characters WHERE owner_id IN (?, ?)', [user1Id, user2Id]);
        await db.run('DELETE FROM users WHERE user_id IN (?, ?)', [user1Id, user2Id]);
        
        console.log('1. Creating users and characters...');
        
        // Create users
        await db.run('INSERT INTO users (user_id) VALUES (?)', [user1Id]);
        await db.run('INSERT INTO users (user_id) VALUES (?)', [user2Id]);
        
        // Create characters with real names
        const char1Result = await db.run(`
            INSERT INTO characters (owner_id, name, race, base_pl, strength, defense, agility, endurance, control, current_health, current_ki) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [user1Id, 'Kakarot', 'Saiyan', 50000, 100, 80, 90, 100, 85, 500000, 100]);
        
        const char2Result = await db.run(`
            INSERT INTO characters (owner_id, name, race, base_pl, strength, defense, agility, endurance, control, current_health, current_ki) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [user2Id, 'Prince Vegeta', 'Saiyan', 45000, 95, 85, 88, 95, 80, 450000, 95]);
        
        // Set active characters
        await db.run('UPDATE users SET active_character_id = ? WHERE user_id = ?', [char1Result.id, user1Id]);
        await db.run('UPDATE users SET active_character_id = ? WHERE user_id = ?', [char2Result.id, user2Id]);
        
        console.log('Characters created:');
        console.log(`- Kakarot (ID: ${char1Result.id}) owned by ${user1Id}`);
        console.log(`- Prince Vegeta (ID: ${char2Result.id}) owned by ${user2Id}\n`);
        
        // Test character retrieval
        console.log('2. Testing character data retrieval...');
        const user1Data = await db.getUserWithActiveCharacter(user1Id);
        const user2Data = await db.getUserWithActiveCharacter(user2Id);
        
        console.log(`User 1 active character: ${user1Data.name} (${user1Data.race})`);
        console.log(`User 2 active character: ${user2Data.name} (${user2Data.race})\n`);
        
        // Verify the names would be used correctly in combat
        console.log('3. Verifying combat would use correct names...');
        console.log(`Attacker name: ${user1Data.name}`);
        console.log(`Defender name: ${user2Data.name}`);
        
        // Check if there are any other characters with these user IDs
        const allChars = await db.all('SELECT * FROM characters WHERE owner_id IN (?, ?)', [user1Id, user2Id]);
        console.log('\nAll characters for these users:');
        allChars.forEach(char => {
            console.log(`- ${char.name} (ID: ${char.id}, Owner: ${char.owner_id})`);
        });
        
        console.log('\n=== Test Complete ===');
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        db.db.close();
    }
}

testRealCharacterCombat();
