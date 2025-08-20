const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { hasStaffRole } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('backup')
        .setDescription('[STAFF] Database backup management')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a manual database backup'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List available database backups'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('restore')
                .setDescription('Restore database from backup')
                .addStringOption(option =>
                    option
                        .setName('backup')
                        .setDescription('The backup filename to restore from')
                        .setRequired(true))),

    async execute(interaction) {
        if (!hasStaffRole(interaction.member)) {
            return interaction.reply({ 
                content: '❌ This command is for staff members only!', 
                ephemeral: true 
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'create':
                    await interaction.deferReply();
                    
                    const backupPath = await interaction.client.database.createManualBackup();
                    
                    const createEmbed = new EmbedBuilder()
                        .setTitle('✅ Database Backup Created')
                        .setDescription(`Manual backup created successfully!`)
                        .addFields({ 
                            name: 'Backup File', 
                            value: `\`${backupPath.split('/').pop()}\`` 
                        })
                        .setColor(0x00ff00)
                        .setTimestamp();
                    
                    await interaction.editReply({ embeds: [createEmbed] });
                    break;

                case 'list':
                    await interaction.deferReply();
                    
                    const backups = await interaction.client.database.listAvailableBackups();
                    
                    if (backups.length === 0) {
                        const noBackupsEmbed = new EmbedBuilder()
                            .setTitle('📁 Database Backups')
                            .setDescription('No backups found.')
                            .setColor(0xff9900);
                        
                        return interaction.editReply({ embeds: [noBackupsEmbed] });
                    }

                    const listEmbed = new EmbedBuilder()
                        .setTitle('📁 Available Database Backups')
                        .setDescription(backups.map((backup, index) => 
                            `**${index + 1}.** \`${backup.name}\` - ${backup.size} - ${backup.date}`
                        ).join('\n'))
                        .setColor(0x0099ff)
                        .setFooter({ text: `Total: ${backups.length} backup(s)` })
                        .setTimestamp();
                    
                    await interaction.editReply({ embeds: [listEmbed] });
                    break;

                case 'restore':
                    await interaction.deferReply();
                    
                    const backupName = interaction.options.getString('backup');
                    
                    // Security check - ensure backup name is safe
                    if (!backupName.match(/^backup_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.db$/)) {
                        const invalidEmbed = new EmbedBuilder()
                            .setTitle('❌ Invalid Backup Name')
                            .setDescription('Please provide a valid backup filename from the list.')
                            .setColor(0xff0000);
                        
                        return interaction.editReply({ embeds: [invalidEmbed] });
                    }

                    // Confirm restoration (this is destructive)
                    const confirmEmbed = new EmbedBuilder()
                        .setTitle('⚠️ Confirm Database Restore')
                        .setDescription(`Are you sure you want to restore from \`${backupName}\`?\n\n**WARNING: This will overwrite all current character data!**`)
                        .setColor(0xff9900);
                    
                    await interaction.editReply({ 
                        embeds: [confirmEmbed], 
                        content: '**This action cannot be undone. Please confirm in the next 30 seconds.**' 
                    });

                    // Wait for confirmation (in a real implementation, you'd use buttons)
                    // For now, just show the warning
                    setTimeout(async () => {
                        try {
                            const timeoutEmbed = new EmbedBuilder()
                                .setTitle('⏰ Restore Cancelled')
                                .setDescription('Database restore timed out. No changes were made.')
                                .setColor(0x888888);
                            
                            await interaction.editReply({ embeds: [timeoutEmbed], content: null });
                        } catch (error) {
                            console.error('Error updating timeout message:', error);
                        }
                    }, 30000);
                    
                    break;
            }
        } catch (error) {
            console.error('Error in backup command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Backup Error')
                .setDescription('An error occurred while managing backups.')
                .setColor(0xff0000);
            
            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },
};
