const Database = require('./src/database/database');

async function checkCharacterForms() {
    const database = new Database();
    
    console.log('Checking character_forms for character 24...');
    
    // Check all character_forms for character 24
    const allForms = await database.all(`
        SELECT * FROM character_forms WHERE character_id = 24
    `);
    
    console.log('All forms for character 24:', allForms);
    
    // Check specifically for survival form
    const survivalForm = await database.get(`
        SELECT * FROM character_forms WHERE character_id = 24 AND form_key = 'survival'
    `);
    
    console.log('Survival form for character 24:', survivalForm);
    
    // Check if the survival form exists in the forms table
    const survivalFormDef = await database.get(`
        SELECT * FROM forms WHERE form_key = 'survival'
    `);
    
    console.log('Survival form definition:', survivalFormDef);
    
    // Check the character data
    const character = await database.get(`
        SELECT * FROM characters WHERE id = 24
    `);
    
    console.log('Character 24 data:', character);
    
    database.close();
}

checkCharacterForms().catch(console.error);