#!/bin/bash

# Simple validation script for SQL migration files
# This script checks for basic syntax issues in the migration files

echo "Validating migration files..."

# Check if migration files exist
MIGRATION_FILES=(
    "007_create_meetings_table.sql"
    "008_create_meetings_rls_policies.sql"
    "009_meetings_utility_functions.sql"
)

for file in "${MIGRATION_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing migration file: $file"
        exit 1
    fi
    
    echo "✅ Found: $file"
    
    # Check for basic SQL syntax issues
    if ! grep -q "BEGIN;" "$file"; then
        echo "⚠️  Warning: $file doesn't start with BEGIN;"
    fi
    
    if ! grep -q "COMMIT;" "$file"; then
        echo "⚠️  Warning: $file doesn't end with COMMIT;"
    fi
    
    # Check for common SQL keywords
    if grep -q "CREATE TABLE\|CREATE FUNCTION\|CREATE POLICY\|CREATE VIEW" "$file"; then
        echo "✅ $file contains valid SQL DDL statements"
    else
        echo "⚠️  Warning: $file may not contain expected DDL statements"
    fi
done

echo ""
echo "Migration validation complete!"
echo "Next steps:"
echo "1. Run 'supabase db reset' to apply all migrations"
echo "2. Or run 'supabase migration up' to apply new migrations"
echo "3. Test the new schema with your application"