const Database = require('./src/database/database');

(async () => {
    const db = new Database();
    try {
        await db.init();
        
        const arcosians = await db.all('SELECT id, name, owner_id, created_at FROM characters WHERE race = ?', ['Arcosian']);
        console.log('Arcosian characters:', arcosians);
        
        for (const char of arcosians) {
            const forms = await db.all('SELECT * FROM character_forms WHERE character_id = ?', [char.id]);
            console.log(`Character ${char.name} (${char.id}) forms:`, forms);
            
            const hasSuppressionForm = forms.some(f => f.form_key === 'minimal');
            console.log(`  - Has Suppression Form: ${hasSuppressionForm}`);
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (db.db) db.db.close();
        if (db.pool) await db.pool.end();
    }
})();
