#!/bin/bash

# Railway deployment script for Suppression Form migration
# This runs the migration and then starts the bot

echo "🚀 Starting Railway deployment..."
echo "📋 Running Suppression Form migration..."

# Run the migration script
node add_suppression_form_migration.js

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully"
else
    echo "❌ Migration failed"
    exit 1
fi

echo "🤖 Starting Discord bot..."
# Start the main application
npm start
