const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        // Simple Railway approach - use app directory which should be more persistent than /tmp
        if (process.env.RAILWAY_ENVIRONMENT) {
            this.dbPath = '/app/dragonball.db';
        } else {
            this.dbPath = path.join(__dirname, '../../database/dragonball.db');
        }
        this.db = null;
        console.log('🗄️  Database path:', this.dbPath);
    }

    async init() {
        return new Promise((resolve, reject) => {
            console.log('🗄️  Database initialization starting...');
            console.log('📍 Database path:', this.dbPath);
            console.log('🌐 Environment:', process.env.RAILWAY_ENVIRONMENT ? 'Railway' : 'Local');
            
            // Ensure database directory exists
            const dbDir = path.dirname(this.dbPath);
            console.log('📁 Database directory:', dbDir);
            
            if (!fs.existsSync(dbDir)) {
                console.log('📂 Creating database directory...');
                fs.mkdirSync(dbDir, { recursive: true });
                console.log('✅ Created database directory:', dbDir);
            } else {
                console.log('✅ Database directory exists');
            }

            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Error opening database:', err);
                    reject(err);
                    return;
                }
                
                console.log('Connected to SQLite database');
                this.createTables().then(resolve).catch(reject);
            });
        });
    }

    async createTables() {
        const tables = [
            // Users table
            `CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                active_character_id INTEGER DEFAULT NULL,
                FOREIGN KEY (active_character_id) REFERENCES characters (id)
            )`,
            
            // Characters table
            `CREATE TABLE IF NOT EXISTS characters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL COLLATE NOCASE,
                owner_id TEXT NOT NULL,
                race TEXT NOT NULL,
                base_pl INTEGER DEFAULT 1,
                strength INTEGER DEFAULT 1,
                defense INTEGER DEFAULT 1,
                agility INTEGER DEFAULT 1,
                endurance INTEGER DEFAULT 1,
                control INTEGER DEFAULT 1,
                current_health INTEGER DEFAULT NULL,
                current_ki INTEGER DEFAULT NULL,
                release_percentage REAL DEFAULT 100.0,
                image_url TEXT DEFAULT NULL,
                ki_control INTEGER DEFAULT 0,
                magic_mastery INTEGER DEFAULT 0,
                primary_affinity TEXT DEFAULT NULL,
                secondary_affinities TEXT DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (owner_id) REFERENCES users (user_id),
                UNIQUE(name)
            )`,
            
            // Character racials junction table
            `CREATE TABLE IF NOT EXISTS character_racials (
                character_id INTEGER,
                racial_tag TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                PRIMARY KEY (character_id, racial_tag),
                FOREIGN KEY (character_id) REFERENCES characters (id)
            )`,
            
            // Forms table
            `CREATE TABLE IF NOT EXISTS forms (
                form_key TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                strength_modifier TEXT DEFAULT NULL,
                defense_modifier TEXT DEFAULT NULL,
                agility_modifier TEXT DEFAULT NULL,
                endurance_modifier TEXT DEFAULT NULL,
                control_modifier TEXT DEFAULT NULL,
                pl_modifier TEXT DEFAULT NULL,
                ki_activation_cost TEXT DEFAULT NULL,
                health_activation_cost TEXT DEFAULT NULL,
                ki_drain TEXT DEFAULT NULL,
                health_drain TEXT DEFAULT NULL,
                is_stackable BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Character forms junction table
            `CREATE TABLE IF NOT EXISTS character_forms (
                character_id INTEGER,
                form_key TEXT,
                is_active BOOLEAN DEFAULT FALSE,
                PRIMARY KEY (character_id, form_key),
                FOREIGN KEY (character_id) REFERENCES characters (id),
                FOREIGN KEY (form_key) REFERENCES forms (form_key)
            )`,
            
            // Turn orders table
            `CREATE TABLE IF NOT EXISTS turn_orders (
                channel_id TEXT PRIMARY KEY,
                participants TEXT NOT NULL,
                current_turn INTEGER DEFAULT 0,
                current_round INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Combat state table for tracking zenkai and other combat effects
            `CREATE TABLE IF NOT EXISTS combat_state (
                character_id INTEGER,
                channel_id TEXT,
                zenkai_bonus INTEGER DEFAULT 0,
                majin_magic_bonus INTEGER DEFAULT 0,
                last_attacker_pl INTEGER DEFAULT 0,
                last_enemy_pl INTEGER DEFAULT 0,
                PRIMARY KEY (character_id, channel_id),
                FOREIGN KEY (character_id) REFERENCES characters (id)
            )`,
            
            // Pending attacks table for attack-defend resolution
            `CREATE TABLE IF NOT EXISTS pending_attacks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id TEXT NOT NULL,
                attacker_user_id TEXT NOT NULL,
                target_user_id TEXT NOT NULL,
                attacker_character_id INTEGER NOT NULL,
                target_character_id INTEGER NOT NULL,
                attack_type TEXT NOT NULL,
                damage INTEGER NOT NULL,
                accuracy INTEGER NOT NULL,
                attack_data TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                FOREIGN KEY (attacker_character_id) REFERENCES characters (id),
                FOREIGN KEY (target_character_id) REFERENCES characters (id)
            )`
        ];

        for (const table of tables) {
            await this.run(table);
        }

        // Add column migration for last_enemy_pl if it doesn't exist
        try {
            await this.run(`ALTER TABLE combat_state ADD COLUMN last_enemy_pl INTEGER DEFAULT 0`);
            console.log('Added last_enemy_pl column to combat_state table');
        } catch (error) {
            // Column likely already exists, ignore error
            if (!error.message.includes('duplicate column name')) {
                console.log('Column migration handled:', error.message);
            }
        }

        // Migration: Add release_percentage column if it doesn't exist
        try {
            // Check if release_percentage column exists
            const columns = await this.all(`PRAGMA table_info(characters)`);
            const hasReleasePercentage = columns.some(col => col.name === 'release_percentage');
            
            if (!hasReleasePercentage) {
                await this.run(`ALTER TABLE characters ADD COLUMN release_percentage REAL DEFAULT 100.0`);
                console.log('Added release_percentage column to characters table');
                
                // Set default values for existing characters
                await this.run(`UPDATE characters SET release_percentage = 100.0 WHERE release_percentage IS NULL`);
                console.log('Set default release_percentage values for existing characters');
            }
        } catch (error) {
            console.log('Release percentage migration error:', error.message);
        }

        // Migration: Add racial_tag column if it doesn't exist and migrate data
        try {
            const tableInfo = await this.all(`PRAGMA table_info(character_racials)`);
            const hasRacialTag = tableInfo.some(col => col.name === 'racial_tag');
            const hasRacialName = tableInfo.some(col => col.name === 'racial_name');
            
            if (!hasRacialTag && hasRacialName) {
                console.log('Migrating character_racials from racial_name to racial_tag...');
                
                // Add racial_tag column
                await this.run(`ALTER TABLE character_racials ADD COLUMN racial_tag TEXT`);
                
                // Copy data from racial_name to racial_tag
                await this.run(`UPDATE character_racials SET racial_tag = racial_name WHERE racial_tag IS NULL`);
                
                console.log('Migration completed: racial_name -> racial_tag');
            }
        } catch (error) {
            console.log('Migration handled:', error.message);
        }
    }

    // Wrapper for database queries
    run(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(query, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    all(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Helper methods for common operations
    async createUser(userId) {
        const query = 'INSERT OR IGNORE INTO users (user_id) VALUES (?)';
        return await this.run(query, [userId]);
    }

    async getUser(userId) {
        const query = 'SELECT * FROM users WHERE user_id = ?';
        return await this.get(query, [userId]);
    }

    async getUserWithActiveCharacter(userId) {
        const query = `
            SELECT u.*, c.* FROM users u
            LEFT JOIN characters c ON u.active_character_id = c.id
            WHERE u.user_id = ?
        `;
        return await this.get(query, [userId]);
    }

    async getCharacterByName(name) {
        const query = 'SELECT * FROM characters WHERE LOWER(name) = LOWER(?)';
        return await this.get(query, [name]);
    }

    async getCharacterWithRacials(characterId) {
        const query = `
            SELECT c.*, 
                   GROUP_CONCAT(cr.racial_tag) as racials,
                   GROUP_CONCAT(cr.is_active) as racial_states
            FROM characters c
            LEFT JOIN character_racials cr ON c.id = cr.character_id
            WHERE c.id = ?
            GROUP BY c.id
        `;
        return await this.get(query, [characterId]);
    }

    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = Database;
