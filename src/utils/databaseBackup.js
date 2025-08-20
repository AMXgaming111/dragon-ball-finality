const fs = require('fs');
const path = require('path');

class DatabaseBackup {
    constructor(database) {
        this.database = database;
        this.backupDir = process.env.RAILWAY_ENVIRONMENT ? '/data/backups' : path.join(__dirname, '../../database/backups');
    }

    async createBackup() {
        try {
            // Ensure backup directory exists
            if (!fs.existsSync(this.backupDir)) {
                fs.mkdirSync(this.backupDir, { recursive: true });
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.backupDir, `dragonball-backup-${timestamp}.db`);
            
            // Get current database path
            const dbPath = this.database.dbPath;
            
            if (fs.existsSync(dbPath)) {
                // Copy database file
                fs.copyFileSync(dbPath, backupPath);
                console.log(`✅ Database backup created: ${backupPath}`);
                
                // Clean up old backups (keep last 10)
                await this.cleanupOldBackups();
                
                return backupPath;
            } else {
                console.log('⚠️ No database file found to backup');
                return null;
            }
        } catch (error) {
            console.error('❌ Backup creation failed:', error);
            return null;
        }
    }

    async cleanupOldBackups() {
        try {
            const files = fs.readdirSync(this.backupDir)
                .filter(file => file.startsWith('dragonball-backup-') && file.endsWith('.db'))
                .map(file => ({
                    name: file,
                    path: path.join(this.backupDir, file),
                    time: fs.statSync(path.join(this.backupDir, file)).mtime
                }))
                .sort((a, b) => b.time - a.time);

            // Keep only the 10 most recent backups
            if (files.length > 10) {
                const filesToDelete = files.slice(10);
                for (const file of filesToDelete) {
                    fs.unlinkSync(file.path);
                    console.log(`🗑️ Deleted old backup: ${file.name}`);
                }
            }
        } catch (error) {
            console.error('❌ Backup cleanup failed:', error);
        }
    }

    async restoreFromBackup(backupPath) {
        try {
            if (fs.existsSync(backupPath)) {
                fs.copyFileSync(backupPath, this.database.dbPath);
                console.log(`✅ Database restored from: ${backupPath}`);
                return true;
            } else {
                console.error('❌ Backup file not found:', backupPath);
                return false;
            }
        } catch (error) {
            console.error('❌ Restore failed:', error);
            return false;
        }
    }

    async listBackups() {
        try {
            if (!fs.existsSync(this.backupDir)) {
                return [];
            }

            return fs.readdirSync(this.backupDir)
                .filter(file => file.startsWith('dragonball-backup-') && file.endsWith('.db'))
                .map(file => ({
                    name: file,
                    path: path.join(this.backupDir, file),
                    size: fs.statSync(path.join(this.backupDir, file)).size,
                    created: fs.statSync(path.join(this.backupDir, file)).mtime
                }))
                .sort((a, b) => b.created - a.created);
        } catch (error) {
            console.error('❌ Failed to list backups:', error);
            return [];
        }
    }
}

module.exports = DatabaseBackup;
