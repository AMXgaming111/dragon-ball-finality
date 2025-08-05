const Database = require('./src/database/database');

async function checkDatabase() {
    const db = new Database();
    await db.init();
    
    try {
        // Check if pending_attacks table exists
        const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='pending_attacks'");
        console.log('pending_attacks table exists:', tables.length > 0);
        
        if (tables.length === 0) {
            console.log('Creating pending_attacks table...');
            await db.run(`CREATE TABLE pending_attacks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                attacker_id TEXT NOT NULL,
                defender_id TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                damage INTEGER NOT NULL,
                ki_cost INTEGER DEFAULT 0,
                attack_type TEXT NOT NULL,
                effort_level INTEGER NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
            console.log('pending_attacks table created successfully');
        }
        
        // Verify the table structure
        const schema = await db.all("PRAGMA table_info(pending_attacks)");
        console.log('pending_attacks table schema:');
        schema.forEach(col => console.log(`  ${col.name}: ${col.type}`));
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        db.db.close();
    }
}

checkDatabase();
