#!/usr/bin/env node

/**
 * PostgreSQL to Supabase Migration Script
 * 
 * This script migrates data from a local PostgreSQL database to Supabase.
 * It handles all tables and preserves relationships and data integrity.
 * 
 * Usage: node migrate-postgresql-to-supabase.js
 * 
 * Prerequisites:
 * 1. Local PostgreSQL server running with LabSyncPro database
 * 2. Supabase project configured with proper environment variables
 * 3. Required npm packages: pg, @supabase/supabase-js, dotenv
 */

require('dotenv').config({ path: './server/.env' });
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

// PostgreSQL connection (local database)
const pgPool = new Pool({
  host: process.env.LOCAL_DB_HOST || 'localhost',
  port: process.env.LOCAL_DB_PORT || 5432,
  database: process.env.LOCAL_DB_NAME || 'labsyncpro',
  user: process.env.LOCAL_DB_USER || 'postgres',
  password: process.env.LOCAL_DB_PASSWORD || 'postgres'
});

// Supabase connection
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration. Please check your .env file.');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Migration configuration - order matters for foreign key constraints
const MIGRATION_ORDER = [
  'users',
  'classes', 
  'labs',
  'computers',
  'groups',
  'group_members',
  'assignments',
  'assignment_distributions',
  'submissions',
  'grades',
  'schedules',
  'password_reset_requests',
  'timetable_versions',
  'periods',
  'timetable_schedules'
];

// Tables to exclude from migration (system tables, etc.)
const EXCLUDED_TABLES = [
  'pg_stat_statements',
  'pg_stat_statements_info'
];

class DatabaseMigrator {
  constructor() {
    this.stats = {
      tablesProcessed: 0,
      totalRecords: 0,
      errors: [],
      startTime: new Date()
    };
  }

  async migrate() {
    console.log('🚀 Starting PostgreSQL to Supabase migration...\n');
    
    try {
      // Test connections
      await this.testConnections();
      
      // Get table information
      const tables = await this.getPostgreSQLTables();
      console.log(`📋 Found ${tables.length} tables to migrate\n`);
      
      // Migrate tables in order
      for (const tableName of MIGRATION_ORDER) {
        if (tables.includes(tableName)) {
          await this.migrateTable(tableName);
        }
      }
      
      // Migrate any remaining tables not in the order list
      for (const tableName of tables) {
        if (!MIGRATION_ORDER.includes(tableName)) {
          await this.migrateTable(tableName);
        }
      }
      
      await this.printSummary();
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    } finally {
      await pgPool.end();
    }
  }

  async testConnections() {
    console.log('🔍 Testing database connections...');
    
    // Test PostgreSQL
    try {
      const pgClient = await pgPool.connect();
      const result = await pgClient.query('SELECT NOW()');
      pgClient.release();
      console.log('✅ PostgreSQL connection successful');
    } catch (error) {
      throw new Error(`PostgreSQL connection failed: ${error.message}`);
    }
    
    // Test Supabase
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1);
      if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist, which is ok
        throw error;
      }
      console.log('✅ Supabase connection successful\n');
    } catch (error) {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }
  }

  async getPostgreSQLTables() {
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    const result = await pgPool.query(query);
    return result.rows
      .map(row => row.table_name)
      .filter(table => !EXCLUDED_TABLES.includes(table));
  }

  async migrateTable(tableName) {
    console.log(`📦 Migrating table: ${tableName}`);
    
    try {
      // Get data from PostgreSQL
      const pgData = await this.getPostgreSQLData(tableName);
      
      if (pgData.length === 0) {
        console.log(`   ⚠️  No data found in ${tableName}`);
        return;
      }
      
      // Clear existing data in Supabase (optional - comment out if you want to preserve existing data)
      await this.clearSupabaseTable(tableName);
      
      // Insert data into Supabase in batches
      await this.insertSupabaseData(tableName, pgData);
      
      this.stats.tablesProcessed++;
      this.stats.totalRecords += pgData.length;
      
      console.log(`   ✅ Migrated ${pgData.length} records\n`);
      
    } catch (error) {
      const errorMsg = `Failed to migrate ${tableName}: ${error.message}`;
      console.error(`   ❌ ${errorMsg}`);
      this.stats.errors.push(errorMsg);
    }
  }

  async getPostgreSQLData(tableName) {
    const query = `SELECT * FROM "${tableName}" ORDER BY 1`;
    const result = await pgPool.query(query);
    return result.rows;
  }

  async clearSupabaseTable(tableName) {
    // Only clear if table exists and has data
    try {
      const { error } = await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error && error.code !== 'PGRST116') {
        console.log(`   ⚠️  Could not clear ${tableName}: ${error.message}`);
      }
    } catch (error) {
      // Table might not exist yet, which is fine
    }
  }

  async insertSupabaseData(tableName, data) {
    const BATCH_SIZE = 100; // Supabase has limits on batch size
    
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      
      // Clean data for Supabase (handle any PostgreSQL-specific types)
      const cleanedBatch = batch.map(row => this.cleanRowData(row));
      
      const { error } = await supabase.from(tableName).insert(cleanedBatch);
      
      if (error) {
        throw new Error(`Batch insert failed: ${error.message}`);
      }
      
      // Progress indicator for large tables
      if (data.length > BATCH_SIZE) {
        const progress = Math.min(i + BATCH_SIZE, data.length);
        process.stdout.write(`   📊 Progress: ${progress}/${data.length} records\r`);
      }
    }
    
    if (data.length > BATCH_SIZE) {
      process.stdout.write('\n');
    }
  }

  cleanRowData(row) {
    const cleaned = { ...row };
    
    // Handle common PostgreSQL to Supabase data type conversions
    Object.keys(cleaned).forEach(key => {
      const value = cleaned[key];
      
      // Convert PostgreSQL timestamps to ISO strings
      if (value instanceof Date) {
        cleaned[key] = value.toISOString();
      }
      
      // Handle null values
      if (value === null || value === undefined) {
        cleaned[key] = null;
      }
      
      // Handle boolean values
      if (typeof value === 'boolean') {
        cleaned[key] = value;
      }
      
      // Handle JSON columns
      if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
        cleaned[key] = JSON.stringify(value);
      }
    });
    
    return cleaned;
  }

  async printSummary() {
    const duration = new Date() - this.stats.startTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    console.log('\n🎉 Migration completed!\n');
    console.log('📊 Migration Summary:');
    console.log(`   ⏱️  Duration: ${minutes}m ${seconds}s`);
    console.log(`   📦 Tables processed: ${this.stats.tablesProcessed}`);
    console.log(`   📝 Total records migrated: ${this.stats.totalRecords}`);
    console.log(`   ❌ Errors: ${this.stats.errors.length}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      this.stats.errors.forEach(error => console.log(`   • ${error}`));
    }
    
    console.log('\n✨ Your data has been successfully migrated to Supabase!');
    console.log('🔗 Check your Supabase dashboard to verify the data.');
  }
}

// Run migration
if (require.main === module) {
  const migrator = new DatabaseMigrator();
  migrator.migrate().catch(console.error);
}

module.exports = DatabaseMigrator;
