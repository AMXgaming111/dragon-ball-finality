/**
 * Production script to add Suppression Form to existing Arcosian characters
 * 
 * USAGE:
 * - Run this ONCE after deploying the code changes to production
 * - Safe to run multiple times (uses ON CONFLICT/OR IGNORE)
 * - Works with both SQLite (local) and PostgreSQL (Railway)
 * 
 * Railway deployment: This will run automatically via the migration system
 * Local testing: node add_suppression_form_migration.js
 */
const Database = require('./src/database/database');

async function addSuppressionFormToExistingArcosians() {
    const database = new Database();
    
    try {
        console.log('🔄 Initializing database...');
        await database.init();
        
        // Check if Suppression Form already exists
        const existingForm = await database.get(
            database.usePostgres ? 
                'SELECT * FROM forms WHERE form_key = $1' : 
                'SELECT * FROM forms WHERE form_key = ?', 
            ['minimal']
        );
        
        if (!existingForm) {
            console.log('✨ Creating Suppression Form...');
            if (database.usePostgres) {
                // PostgreSQL version with ON CONFLICT
                await database.run(`
                    INSERT INTO forms (
                        form_key, 
                        name, 
                        pl_modifier, 
                        control_modifier, 
                        ki_drain,
                        is_stackable
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (form_key) DO NOTHING
                `, [
                    'minimal',
                    'Suppression Form',
                    '*0.6',           // 40% PL reduction = 60% of original
                    '*2',             // x2 control
                    '-5',             // Regain 5% ki per turn (negative drain = gain)
                    false             // Not stackable
                ]);
            } else {
                // SQLite version with OR IGNORE
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
                    '*0.6',           // 40% PL reduction = 60% of original
                    '*2',             // x2 control
                    '-5',             // Regain 5% ki per turn (negative drain = gain)
                    false             // Not stackable
                ]);
            }
            console.log('✅ Suppression Form created');
        } else {
            console.log('ℹ️  Suppression Form already exists');
        }
        
        console.log('🔍 Finding existing Arcosian characters...');
        const arcosianCharacters = await database.all(
            database.usePostgres ? 
                'SELECT id, name, owner_id FROM characters WHERE race = $1' :
                'SELECT id, name, owner_id FROM characters WHERE race = ?',
            ['Arcosian']
        );
        
        console.log(`📊 Found ${arcosianCharacters.length} Arcosian characters`);
        
        let grantedCount = 0;
        let skippedCount = 0;
        
        for (const character of arcosianCharacters) {
            const hasForm = await database.get(
                database.usePostgres ?
                    'SELECT * FROM character_forms WHERE character_id = $1 AND form_key = $2' :
                    'SELECT * FROM character_forms WHERE character_id = ? AND form_key = ?',
                [character.id, 'minimal']
            );
            
            if (!hasForm) {
                if (database.usePostgres) {
                    await database.run(`
                        INSERT INTO character_forms (character_id, form_key, is_active)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (character_id, form_key) DO NOTHING
                    `, [character.id, 'minimal', false]);
                } else {
                    await database.run(`
                        INSERT OR IGNORE INTO character_forms (character_id, form_key, is_active)
                        VALUES (?, ?, ?)
                    `, [character.id, 'minimal', false]);
                }
                
                console.log(`✅ Granted to ${character.name} (ID: ${character.id})`);
                grantedCount++;
            } else {
                skippedCount++;
            }
        }
        
        console.log('\n🎉 Migration completed!');
        console.log(`   • Total Arcosian characters: ${arcosianCharacters.length}`);
        console.log(`   • Forms granted: ${grantedCount}`);
        console.log(`   • Already had form: ${skippedCount}`);
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        if (database.db) database.db.close();
        if (database.pool) await database.pool.end();
    }
}

// Only run if called directly
if (require.main === module) {
    addSuppressionFormToExistingArcosians()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = addSuppressionFormToExistingArcosians;
