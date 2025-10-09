const Database = require('./src/database/database');

async function checkSurvivalMigration() {
    const database = new Database();
    
    try {
        console.log('Checking survival migration status...');
        
        // Check if character 24 has survival form in character_forms
        const survivalForm = await database.get(`
            SELECT * FROM character_forms WHERE character_id = 24 AND form_key = 'survival'
        `);
        
        console.log('Character 24 survival form record:', survivalForm);
        
        // Check if survival form exists in forms table
        const formDef = await database.get(`
            SELECT * FROM forms WHERE form_key = 'survival'
        `);
        
        console.log('Survival form definition:', formDef);
        
        // If no record exists, create it manually for testing
        if (!survivalForm) {
            console.log('Creating survival form record for character 24...');
            await database.run(`
                INSERT OR IGNORE INTO character_forms (character_id, form_key, is_active)
                VALUES (?, ?, ?)
            `, [24, 'survival', false]);
            
            console.log('Created survival form record');
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        database.close();
    }
}

checkSurvivalMigration().catch(console.error);