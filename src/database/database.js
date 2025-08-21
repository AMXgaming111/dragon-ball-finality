const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        // Use PostgreSQL on Railway if DATABASE_URL is available, SQLite locally
        this.usePostgres = !!process.env.DATABASE_URL;
        
        if (this.usePostgres) {
            console.log('🐘 Using PostgreSQL for Railway deployment');
            const { Pool } = require('pg');
            this.pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
            });
        } else {
            console.log('🗄️  Using SQLite for local development');
            this.dbPath = path.join(__dirname, '../../database/dragonball.db');
            this.db = null;
        }
        
        console.log('🗄️  Database configured:', this.usePostgres ? 'PostgreSQL' : `SQLite at ${this.dbPath}`);
    }

    async init() {
        return new Promise((resolve, reject) => {
            console.log('🗄️  Database initialization starting...');
            console.log('� Database type:', this.usePostgres ? 'PostgreSQL' : 'SQLite');
            
            if (this.usePostgres) {
                // Test PostgreSQL connection
                this.pool.query('SELECT NOW() as current_time', (err, result) => {
                    if (err) {
                        console.error('❌ PostgreSQL connection error:', err);
                        reject(err);
                    } else {
                        console.log('✅ Connected to PostgreSQL database');
                        console.log('🕐 Server time:', result.rows[0].current_time);
                        this.createTables().then(resolve).catch(reject);
                    }
                });
            } else {
                // SQLite initialization (local development)
                console.log('� SQLite path:', this.dbPath);
                
                const dbDir = path.dirname(this.dbPath);
                if (!fs.existsSync(dbDir)) {
                    console.log('📂 Creating database directory...');
                    fs.mkdirSync(dbDir, { recursive: true });
                    console.log('✅ Created database directory:', dbDir);
                }

                this.db = new sqlite3.Database(this.dbPath, (err) => {
                    if (err) {
                        console.error('❌ Error opening SQLite database:', err);
                        reject(err);
                        return;
                    }
                    
                    console.log('✅ Connected to SQLite database');
                    this.createTables().then(resolve).catch(reject);
                });
            }
        });
    }

    async createTables() {
        // PostgreSQL and SQLite compatible table definitions
        const tables = this.usePostgres ? [
            // PostgreSQL table definitions
            `CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                active_character_id INTEGER DEFAULT NULL
            )`,
            
            `CREATE TABLE IF NOT EXISTS characters (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(name)
            )`,
            
            `CREATE TABLE IF NOT EXISTS character_racials (
                character_id INTEGER,
                racial_tag TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                PRIMARY KEY (character_id, racial_tag)
            )`,
            
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS character_forms (
                character_id INTEGER,
                form_key TEXT,
                is_active BOOLEAN DEFAULT FALSE,
                PRIMARY KEY (character_id, form_key)
            )`,
            
            `CREATE TABLE IF NOT EXISTS turn_orders (
                channel_id TEXT PRIMARY KEY,
                participants TEXT NOT NULL,
                current_turn INTEGER DEFAULT 0,
                current_round INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS combat_state (
                character_id INTEGER,
                channel_id TEXT,
                zenkai_bonus INTEGER DEFAULT 0,
                majin_magic_bonus INTEGER DEFAULT 0,
                last_attacker_pl INTEGER DEFAULT 0,
                last_enemy_pl INTEGER DEFAULT 0,
                PRIMARY KEY (character_id, channel_id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS pending_attacks (
                id SERIAL PRIMARY KEY,
                channel_id TEXT NOT NULL,
                attacker_user_id TEXT NOT NULL,
                target_user_id TEXT NOT NULL,
                attacker_character_id INTEGER NOT NULL,
                target_character_id INTEGER NOT NULL,
                attack_type TEXT NOT NULL,
                damage INTEGER NOT NULL,
                accuracy INTEGER NOT NULL,
                attack_data TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL
            )`
        ] : [
            // SQLite table definitions (existing)
            `CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                active_character_id INTEGER DEFAULT NULL,
                FOREIGN KEY (active_character_id) REFERENCES characters (id)
            )`,
            
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
            
            `CREATE TABLE IF NOT EXISTS character_racials (
                character_id INTEGER,
                racial_tag TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                PRIMARY KEY (character_id, racial_tag),
                FOREIGN KEY (character_id) REFERENCES characters (id)
            )`,
            
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
            
            `CREATE TABLE IF NOT EXISTS character_forms (
                character_id INTEGER,
                form_key TEXT,
                is_active BOOLEAN DEFAULT FALSE,
                PRIMARY KEY (character_id, form_key),
                FOREIGN KEY (character_id) REFERENCES characters (id),
                FOREIGN KEY (form_key) REFERENCES forms (form_key)
            )`,
            
            `CREATE TABLE IF NOT EXISTS turn_orders (
                channel_id TEXT PRIMARY KEY,
                participants TEXT NOT NULL,
                current_turn INTEGER DEFAULT 0,
                current_round INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
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
            const columns = this.usePostgres 
                ? await this.all(`SELECT column_name FROM information_schema.columns WHERE table_name = 'characters' AND column_name = 'release_percentage'`)
                : await this.all(`PRAGMA table_info(characters)`);
            
            const hasReleasePercentage = this.usePostgres 
                ? columns.length > 0
                : columns.some(col => col.name === 'release_percentage');
            
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
            const tableInfo = this.usePostgres
                ? await this.all(`SELECT column_name FROM information_schema.columns WHERE table_name = 'character_racials'`)
                : await this.all(`PRAGMA table_info(character_racials)`);
            
            const hasRacialTag = this.usePostgres
                ? tableInfo.some(col => col.column_name === 'racial_tag')
                : tableInfo.some(col => col.name === 'racial_tag');
            
            const hasRacialName = this.usePostgres
                ? tableInfo.some(col => col.column_name === 'racial_name')
                : tableInfo.some(col => col.name === 'racial_name');
            
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
        if (this.usePostgres) {
            // Convert ? placeholders to $1, $2, $3 format for PostgreSQL
            let pgQuery = query;
            let paramIndex = 1;
            pgQuery = pgQuery.replace(/\?/g, () => `$${paramIndex++}`);
            
            // Convert boolean comparisons for PostgreSQL
            pgQuery = this.convertBooleanComparisons(pgQuery);
            
            // Convert datetime functions for PostgreSQL
            pgQuery = this.convertDateTimeFunctions(pgQuery);
            
            // For INSERT statements, add RETURNING id only for tables that have an id column
            if (pgQuery.trim().toUpperCase().startsWith('INSERT INTO') && 
                !pgQuery.toUpperCase().includes('RETURNING') &&
                !pgQuery.toUpperCase().includes('ON CONFLICT')) {
                
                // Only add RETURNING id for tables that have an id column
                const tableMatch = pgQuery.match(/INSERT\s+INTO\s+(\w+)/i);
                if (tableMatch) {
                    const tableName = tableMatch[1].toLowerCase();
                    const tablesWithId = ['characters', 'forms', 'pending_attacks'];
                    if (tablesWithId.includes(tableName)) {
                        pgQuery += ' RETURNING id';
                    }
                }
            }
            
            return new Promise((resolve, reject) => {
                this.pool.query(pgQuery, params, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ 
                            id: result.rows?.[0]?.id || result.insertId,
                            changes: result.rowCount || 0
                        });
                    }
                });
            });
        } else {
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
    }

    get(query, params = []) {
        if (this.usePostgres) {
            // Convert ? placeholders to $1, $2, $3 format for PostgreSQL
            let pgQuery = query;
            let paramIndex = 1;
            pgQuery = pgQuery.replace(/\?/g, () => `$${paramIndex++}`);
            
            // Convert boolean comparisons for PostgreSQL
            pgQuery = this.convertBooleanComparisons(pgQuery);
            
            // Convert datetime functions for PostgreSQL
            pgQuery = this.convertDateTimeFunctions(pgQuery);
            
            return new Promise((resolve, reject) => {
                this.pool.query(pgQuery, params, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result.rows?.[0] || null);
                    }
                });
            });
        } else {
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
    }

    all(query, params = []) {
        if (this.usePostgres) {
            // Convert ? placeholders to $1, $2, $3 format for PostgreSQL
            let pgQuery = query;
            let paramIndex = 1;
            pgQuery = pgQuery.replace(/\?/g, () => `$${paramIndex++}`);
            
            // Convert boolean comparisons for PostgreSQL
            pgQuery = this.convertBooleanComparisons(pgQuery);
            
            // Convert datetime functions for PostgreSQL
            pgQuery = this.convertDateTimeFunctions(pgQuery);
            
            return new Promise((resolve, reject) => {
                this.pool.query(pgQuery, params, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result.rows || []);
                    }
                });
            });
        } else {
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
    }

    // Helper methods for common operations
    async createUser(userId) {
        if (this.usePostgres) {
            // Special handling for PostgreSQL - bypass automatic RETURNING id
            const pgQuery = 'INSERT INTO users (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING';
            return new Promise((resolve, reject) => {
                this.pool.query(pgQuery, [userId], (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ 
                            id: null, // No ID needed for this operation
                            changes: result.rowCount || 0
                        });
                    }
                });
            });
        } else {
            const query = 'INSERT OR IGNORE INTO users (user_id) VALUES (?)';
            return await this.run(query, [userId]);
        }
    }

    // Helper method to handle boolean comparisons across PostgreSQL and SQLite
    getBooleanValue(value) {
        if (this.usePostgres) {
            return value === true || value === 'true' || value === 1 || value === '1' ? 'TRUE' : 'FALSE';
        } else {
            return value === true || value === 'true' || value === 1 || value === '1' ? 1 : 0;
        }
    }

    // Helper method to create database-compatible boolean comparison queries
    createBooleanQuery(baseQuery, booleanValue = true) {
        if (this.usePostgres) {
            return baseQuery.replace(/is_active\s*=\s*[01]/gi, `is_active = ${booleanValue ? 'TRUE' : 'FALSE'}`);
        } else {
            return baseQuery.replace(/is_active\s*=\s*(TRUE|FALSE)/gi, `is_active = ${booleanValue ? 1 : 0}`);
        }
    }

    // Convert boolean comparisons for PostgreSQL compatibility
    convertBooleanComparisons(query) {
        if (!this.usePostgres) return query;
        
        // Convert is_active = 1 to is_active = TRUE
        // Convert is_active = 0 to is_active = FALSE
        return query
            .replace(/\bis_active\s*=\s*1\b/gi, 'is_active = TRUE')
            .replace(/\bis_active\s*=\s*0\b/gi, 'is_active = FALSE');
    }

    // Convert datetime functions for PostgreSQL compatibility
    convertDateTimeFunctions(query) {
        if (!this.usePostgres) return query;
        
        // Convert SQLite datetime functions to PostgreSQL equivalents
        return query
            .replace(/datetime\(\s*'now'\s*\)/gi, 'NOW()')
            .replace(/datetime\(\s*([^)]+)\s*\)/gi, '$1');
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
        const query = this.usePostgres ? `
            SELECT c.*, 
                   STRING_AGG(cr.racial_tag, ',') as racials,
                   STRING_AGG(cr.is_active::text, ',') as racial_states
            FROM characters c
            LEFT JOIN character_racials cr ON c.id = cr.character_id
            WHERE c.id = ?
            GROUP BY c.id, c.name, c.owner_id, c.race, c.base_pl, c.strength, c.defense, c.agility, c.endurance, c.control, c.current_health, c.current_ki, c.release_percentage, c.image_url, c.ki_control, c.magic_mastery, c.primary_affinity, c.secondary_affinities, c.created_at
        ` : `
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
