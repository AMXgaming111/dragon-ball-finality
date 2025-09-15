const { EmbedBuilder } = require('discord.js');
const { hasStaffRole } = require('../utils/calculations');

module.exports = {
    name: 'migrate',
    description: 'Run database migrations (Staff only)',
    async execute(message, args, database) {
        // Check staff permissions
        if (!hasStaffRole(message.member)) {
            return message.reply('This command requires the Staff role.');
        }

        if (args.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle('📋 Available Migrations')
                .setDescription('Use `!migrate <migration_name>` to run a specific migration')
                .addFields(
                    { name: 'suppression', value: 'Add Suppression Form to existing Arcosian characters', inline: false }
                )
                .setFooter({ text: 'Migrations are safe to run multiple times' })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        const migrationName = args[0].toLowerCase();

        if (migrationName === 'suppression') {
            try {
                const embed = new EmbedBuilder()
                    .setColor(0xffa500)
                    .setTitle('🔄 Running Suppression Form Migration')
                    .setDescription('Adding Suppression Form to existing Arcosian characters...')
                    .setTimestamp();

                const response = await message.reply({ embeds: [embed] });

                // Check database type once
                const isPostgres = database.usePostgres || process.env.DATABASE_URL;

                // Check if Suppression Form already exists
                const existingForm = await database.get(
                    isPostgres ? 
                        'SELECT * FROM forms WHERE form_key = $1' : 
                        'SELECT * FROM forms WHERE form_key = ?', 
                    ['minimal']
                );

                if (!existingForm) {
                    console.log('✨ Creating Suppression Form...');
                    
                    if (isPostgres) {
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
                }

                // Find existing Arcosian characters
                const arcosianCharacters = await database.all(
                    isPostgres ? 
                        'SELECT id, name, owner_id FROM characters WHERE race = $1' :
                        'SELECT id, name, owner_id FROM characters WHERE race = ?',
                    ['Arcosian']
                );

                let grantedCount = 0;
                let skippedCount = 0;

                for (const character of arcosianCharacters) {
                    const hasForm = await database.get(
                        isPostgres ?
                            'SELECT * FROM character_forms WHERE character_id = $1 AND form_key = $2' :
                            'SELECT * FROM character_forms WHERE character_id = ? AND form_key = ?',
                        [character.id, 'minimal']
                    );

                    if (!hasForm) {
                        if (isPostgres) {
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

                        grantedCount++;
                    } else {
                        skippedCount++;
                    }
                }

                const successEmbed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('✅ Migration Complete!')
                    .setDescription('Successfully added Suppression Form to Arcosian characters')
                    .addFields(
                        { name: 'Total Arcosians', value: arcosianCharacters.length.toString(), inline: true },
                        { name: 'Forms Granted', value: grantedCount.toString(), inline: true },
                        { name: 'Already Had Form', value: skippedCount.toString(), inline: true }
                    )
                    .setFooter({ text: 'Arcosians can now use !state minimal transform/revert' })
                    .setTimestamp();

                await response.edit({ embeds: [successEmbed] });

            } catch (error) {
                console.error('Migration error:', error);
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setTitle('❌ Migration Failed')
                    .setDescription(`Error: ${error.message}`)
                    .setTimestamp();

                await message.reply({ embeds: [errorEmbed] });
            }
        } else {
            return message.reply('Unknown migration. Use `!migrate` to see available migrations.');
        }
    }
};
