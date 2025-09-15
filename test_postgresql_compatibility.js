/**
 * Test script to verify PostgreSQL compatibility of the Suppression Form migration
 */
const Database = require('./src/database/database');

async function testPostgreSQLCompatibility() {
    const database = new Database();
    
    try {
        console.log('🔄 Testing database compatibility...');
        await database.init();
        
        console.log(`📋 Database type: ${database.usePostgres ? 'PostgreSQL' : 'SQLite'}`);
        
        // Test form creation with proper parameter substitution
        console.log('🧪 Testing form creation...');
        
        // Clean up first (in case form exists)
        await database.run(
            database.usePostgres ?
                'DELETE FROM character_forms WHERE form_key = $1' :
                'DELETE FROM character_forms WHERE form_key = ?',
            ['test_minimal']
        );
        
        await database.run(
            database.usePostgres ?
                'DELETE FROM forms WHERE form_key = $1' :
                'DELETE FROM forms WHERE form_key = ?',
            ['test_minimal']
        );
        
        // Test form insertion
        if (database.usePostgres) {
            await database.run(`
                INSERT INTO forms (
                    form_key, 
                    name, 
                    pl_modifier, 
                    control_modifier, 
                    ki_drain,
                    is_stackable
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, ['test_minimal', 'Test Suppression Form', '*0.6', '*2', '-5', false]);
        } else {
            await database.run(`
                INSERT INTO forms (
                    form_key, 
                    name, 
                    pl_modifier, 
                    control_modifier, 
                    ki_drain,
                    is_stackable
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, ['test_minimal', 'Test Suppression Form', '*0.6', '*2', '-5', false]);
        }
        
        console.log('✅ Form creation test passed');
        
        // Test form retrieval
        const createdForm = await database.get(
            database.usePostgres ?
                'SELECT * FROM forms WHERE form_key = $1' :
                'SELECT * FROM forms WHERE form_key = ?',
            ['test_minimal']
        );
        
        console.log('📋 Created form:', createdForm);
        
        // Test boolean handling
        console.log(`📊 is_stackable type: ${typeof createdForm.is_stackable}, value: ${createdForm.is_stackable}`);
        
        // Test character_forms insertion (simulate character creation)
        if (database.usePostgres) {
            await database.run(`
                INSERT INTO character_forms (character_id, form_key, is_active)
                VALUES ($1, $2, $3)
            `, [999999, 'test_minimal', false]);
        } else {
            await database.run(`
                INSERT INTO character_forms (character_id, form_key, is_active)
                VALUES (?, ?, ?)
            `, [999999, 'test_minimal', false]);
        }
        
        console.log('✅ Character form assignment test passed');
        
        // Test form retrieval with join (like in turn.js)
        const formWithCharacter = await database.get(
            database.usePostgres ?
                `SELECT f.*, cf.is_active 
                 FROM forms f 
                 JOIN character_forms cf ON f.form_key = cf.form_key 
                 WHERE f.form_key = $1 AND cf.character_id = $2` :
                `SELECT f.*, cf.is_active 
                 FROM forms f 
                 JOIN character_forms cf ON f.form_key = cf.form_key 
                 WHERE f.form_key = ? AND cf.character_id = ?`,
            ['test_minimal', 999999]
        );
        
        console.log('📋 Form with character data:', formWithCharacter);
        
        // Clean up test data
        await database.run(
            database.usePostgres ?
                'DELETE FROM character_forms WHERE character_id = $1' :
                'DELETE FROM character_forms WHERE character_id = ?',
            [999999]
        );
        
        await database.run(
            database.usePostgres ?
                'DELETE FROM forms WHERE form_key = $1' :
                'DELETE FROM forms WHERE form_key = ?',
            ['test_minimal']
        );
        
        console.log('🧹 Test data cleaned up');
        console.log('✅ All PostgreSQL compatibility tests passed!');
        
    } catch (error) {
        console.error('❌ PostgreSQL compatibility test failed:', error);
        console.error('Stack trace:', error.stack);
        throw error;
    } finally {
        if (database.db) database.db.close();
        if (database.pool) await database.pool.end();
    }
}

// Only run if called directly
if (require.main === module) {
    testPostgreSQLCompatibility()
        .then(() => {
            console.log('🎉 Test completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Test failed:', error.message);
            process.exit(1);
        });
}

module.exports = testPostgreSQLCompatibility;
