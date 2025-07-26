# PostgreSQL to Supabase Migration Guide

## Prerequisites

1. **Local PostgreSQL Database**: Ensure your local PostgreSQL server is running with the LabSyncPro database
2. **Supabase Project**: Have your Supabase project set up with the required environment variables
3. **Node.js Dependencies**: Install required packages

## Setup Instructions

### 1. Install Dependencies

```bash
# Navigate to your project root
cd /Applications/XAMPP/xamppfiles/htdocs/LabSyncPro

# Install migration dependencies (if not already installed)
npm install pg @supabase/supabase-js dotenv
```

### 2. Configure Environment Variables

Ensure your `server/.env` file contains:

```env
# Supabase Configuration (already configured)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Local PostgreSQL Configuration (add these)
LOCAL_DB_HOST=localhost
LOCAL_DB_PORT=5432
LOCAL_DB_NAME=labsyncpro
LOCAL_DB_USER=postgres
LOCAL_DB_PASSWORD=your_postgres_password
```

### 3. Run the Migration

```bash
# Make the script executable
chmod +x migrate-postgresql-to-supabase.js

# Run the migration
node migrate-postgresql-to-supabase.js
```

## Migration Process

The script will:

1. **Test Connections**: Verify both PostgreSQL and Supabase connections
2. **Discover Tables**: Find all tables in your PostgreSQL database
3. **Migrate in Order**: Process tables in the correct order to handle foreign key constraints
4. **Batch Processing**: Insert data in batches to handle large datasets
5. **Data Cleaning**: Convert PostgreSQL-specific data types to Supabase-compatible formats
6. **Progress Tracking**: Show real-time progress and statistics

## Migration Order

Tables are migrated in this order to respect foreign key relationships:

1. `users` (base user accounts)
2. `classes` (class definitions)
3. `labs` (laboratory information)
4. `computers` (computer inventory)
5. `groups` (student groups)
6. `group_members` (group membership)
7. `assignments` (assignment definitions)
8. `assignment_distributions` (assignment assignments)
9. `submissions` (student submissions)
10. `grades` (grading records)
11. `schedules` (schedule information)
12. `password_reset_requests` (password reset data)
13. `timetable_versions` (timetable versioning)
14. `periods` (time period definitions)
15. `timetable_schedules` (timetable entries)

## Data Transformations

The script automatically handles:

- **Timestamps**: PostgreSQL timestamps → ISO string format
- **JSON Data**: Objects → JSON strings
- **Boolean Values**: Proper boolean conversion
- **Null Values**: Consistent null handling
- **UUID Generation**: Preserves existing UUIDs

## Safety Features

- **Connection Testing**: Verifies both databases before starting
- **Batch Processing**: Prevents memory issues with large datasets
- **Error Handling**: Continues migration even if individual tables fail
- **Progress Reporting**: Real-time feedback on migration status
- **Data Validation**: Cleans and validates data before insertion

## Troubleshooting

### Common Issues:

1. **Connection Errors**:
   - Verify PostgreSQL is running
   - Check database credentials
   - Ensure Supabase project is accessible

2. **Permission Errors**:
   - Use service role key (not anon key) for Supabase
   - Ensure PostgreSQL user has read permissions

3. **Data Type Errors**:
   - Check for custom PostgreSQL types
   - Verify Supabase table schemas match

4. **Foreign Key Constraints**:
   - Migration order handles most constraints
   - May need to temporarily disable constraints for complex relationships

### Manual Verification:

After migration, verify your data:

1. Check record counts in Supabase dashboard
2. Test application functionality
3. Verify relationships are intact
4. Check for any missing or corrupted data

## Post-Migration Steps

1. **Update Application**: Ensure your app is using Supabase endpoints
2. **Test Functionality**: Verify all features work with migrated data
3. **Backup**: Create a backup of your Supabase database
4. **Monitor**: Watch for any issues in the first few days

## Support

If you encounter issues:

1. Check the migration logs for specific error messages
2. Verify your environment variables are correct
3. Ensure both databases are accessible
4. Check Supabase dashboard for any schema mismatches

The migration script provides detailed logging to help diagnose any issues that occur during the process.
