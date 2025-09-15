const Database = require('./src/database/database');

async function addSuppressionFormToArcosians() {
    const database = new Database();
    
    try {
        console.log('🔄 Initializing database...');
        await database.init();
        
        console.log('✨ Creating Suppression Form...');
        
        // Create the Suppression Form in the forms table
        await database.run(`
            INSERT OR IGNORE INTO forms (
                form_key, 
                name, 
                pl_modifier, 
                control_modifier, 
                ki_drain,
                is_stackable
            ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
            'minimal',
            'Suppression Form',
            '*0.6',           // 40% reduction = 60% of original (multiply by 0.6)
            '*2',             // x2 control
            '-5',             // Regain 5% ki (negative drain = gain)
            false             // Not stackable
        ]);
        
        console.log('✅ Suppression Form created successfully');
        
        console.log('🔍 Finding all Arcosian characters...');
        
        // Find all Arcosian characters
        const arcosianCharacters = await database.all(`
            SELECT id, name, owner_id FROM characters WHERE race = 'Arcosian'
        `);
        
        console.log(`📊 Found ${arcosianCharacters.length} Arcosian characters`);
        
        // Grant Suppression Form to all Arcosian characters
        for (const character of arcosianCharacters) {
            try {
                // Check if they already have it
                const existingForm = await database.get(`
                    SELECT * FROM character_forms 
                    WHERE character_id = ? AND form_key = 'minimal'
                `, [character.id]);
                
                if (!existingForm) {
                    await database.run(`
                        INSERT INTO character_forms (character_id, form_key, is_active)
                        VALUES (?, ?, ?)
                    `, [character.id, 'minimal', false]);
                    
                    console.log(`✅ Granted Suppression Form to ${character.name} (ID: ${character.id})`);
                } else {
                    console.log(`ℹ️  ${character.name} already has Suppression Form`);
                }
            } catch (error) {
                console.error(`❌ Error granting form to ${character.name}:`, error);
            }
        }
        
        console.log('🎉 Suppression Form setup completed!');
        console.log('📋 Summary:');
        console.log(`   • Form created: Suppression Form (key: minimal)`);
        console.log(`   • Effect: -40% PL, x2 Control, +5% Ki per turn`);
        console.log(`   • Granted to ${arcosianCharacters.length} Arcosian characters`);
        
    } catch (error) {
        console.error('❌ Error setting up Suppression Form:', error);
    } finally {
        // Close database connection
        if (database.db) {
            database.db.close();
        }
        if (database.pool) {
            await database.pool.end();
        }
        console.log('🔒 Database connection closed');
    }
}

// Run the setup
addSuppressionFormToArcosians();
