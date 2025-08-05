const Database = require('./src/database/database');

async function testSchema() {
    const db = new Database('./database.db');
    try {
        await db.init();
        console.log('Database initialized');
        
        // Check character_forms table schema
        const schema = await db.all(`SELECT sql FROM sqlite_master WHERE type='table' AND name='character_forms'`);
        console.log('character_forms schema:', schema);
        
        // Try to describe the table
        const pragma = await db.all(`PRAGMA table_info(character_forms)`);
        console.log('character_forms columns:', pragma);
        
    } catch (error) {
        console.error('Error:', error);
    }
    process.exit();
}

testSchema();
