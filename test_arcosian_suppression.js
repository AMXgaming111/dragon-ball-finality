const Database = require('./src/database/database');

async function testArcosianCreation() {
    const database = new Database();
    
    try {
        console.log('🔄 Initializing database...');
        await database.init();
        
        console.log('🧪 Testing Arcosian character creation...');
        
        // Simulate creating an Arcosian character
        const testUserId = 'test_user_123';
        const testCharacterName = 'Test Arcosian';
        const race = 'Arcosian';
        
        // Create user if not exists
        await database.run(`
            INSERT OR IGNORE INTO users (user_id) VALUES (?)
        `, [testUserId]);
        
        // Create test character
        const result = await database.run(`
            INSERT INTO characters (name, owner_id, race) VALUES (?, ?, ?)
        `, [testCharacterName, testUserId, race]);
        
        const characterId = result.lastID || result.id;
        console.log(`✅ Created character with ID: ${characterId}`);
        
        // Add Arcosian racial ability
        await database.run(`
            INSERT INTO character_racials (character_id, racial_tag) VALUES (?, ?)
        `, [characterId, 'aresist']);
        
        // Grant Suppression Form (as the cc.js would do)
        await database.run(`
            INSERT INTO character_forms (character_id, form_key, is_active) VALUES (?, ?, ?)
        `, [characterId, 'minimal', false]);
        
        console.log('✅ Granted Suppression Form to test character');
        
        // Verify the character has the form
        const characterForm = await database.get(`
            SELECT cf.*, f.name as form_name 
            FROM character_forms cf 
            JOIN forms f ON cf.form_key = f.form_key 
            WHERE cf.character_id = ?
        `, [characterId]);
        
        console.log('📋 Character form verification:', characterForm);
        
        // Cleanup test data
        await database.run('DELETE FROM character_forms WHERE character_id = ?', [characterId]);
        await database.run('DELETE FROM character_racials WHERE character_id = ?', [characterId]);
        await database.run('DELETE FROM characters WHERE id = ?', [characterId]);
        await database.run('DELETE FROM users WHERE user_id = ?', [testUserId]);
        
        console.log('🧹 Cleaned up test data');
        console.log('✅ Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        if (database.db) database.db.close();
        if (database.pool) await database.pool.end();
    }
}

testArcosianCreation();
