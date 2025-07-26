#!/usr/bin/env node

/**
 * Supabase Schema Inspector
 * 
 * This script connects to your Supabase database and retrieves:
 * - All table names
 * - Column information for each table
 * - Sample data from existing tables
 * - Generates correct INSERT statements
 */

require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

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

class SupabaseInspector {
  constructor() {
    this.tables = [];
    this.tableSchemas = {};
  }

  async inspect() {
    console.log('🔍 Inspecting Supabase database schema...\n');
    
    try {
      // Get all tables
      await this.getTables();
      
      // Get schema for each table
      await this.getTableSchemas();
      
      // Get sample data
      await this.getSampleData();
      
      // Generate INSERT statements
      await this.generateInsertStatements();
      
    } catch (error) {
      console.error('❌ Inspection failed:', error);
    }
  }

  async getTables() {
    console.log('📋 Getting table list...');
    
    // Use raw SQL to get table information
    const { data, error } = await supabase.rpc('get_table_info');
    
    if (error) {
      // Fallback: try to get tables using information_schema
      const { data: tablesData, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');
      
      if (tablesError) {
        console.log('⚠️  Cannot access information_schema, trying direct table access...');
        // Try common table names
        this.tables = ['users', 'classes', 'groups', 'labs', 'computers', 'assignments', 'submissions', 'grades', 'schedules'];
      } else {
        this.tables = tablesData.map(row => row.table_name);
      }
    } else {
      this.tables = data.map(row => row.table_name);
    }
    
    console.log(`✅ Found ${this.tables.length} tables:`, this.tables);
  }

  async getTableSchemas() {
    console.log('\n📊 Getting table schemas...');
    
    for (const tableName of this.tables) {
      try {
        console.log(`\n🔍 Inspecting table: ${tableName}`);
        
        // Try to get a sample record to understand the structure
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`   ⚠️  Cannot access ${tableName}: ${error.message}`);
          continue;
        }
        
        if (data && data.length > 0) {
          const sampleRecord = data[0];
          const columns = Object.keys(sampleRecord);
          
          this.tableSchemas[tableName] = {
            columns: columns,
            sampleRecord: sampleRecord,
            recordCount: 0
          };
          
          console.log(`   ✅ Columns (${columns.length}):`, columns.join(', '));
          
          // Get record count
          const { count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
          
          this.tableSchemas[tableName].recordCount = count || 0;
          console.log(`   📊 Records: ${count || 0}`);
          
        } else {
          // Table exists but is empty, try to get column info another way
          console.log(`   📝 Table ${tableName} is empty`);
          this.tableSchemas[tableName] = {
            columns: [],
            sampleRecord: null,
            recordCount: 0
          };
        }
        
      } catch (error) {
        console.log(`   ❌ Error inspecting ${tableName}:`, error.message);
      }
    }
  }

  async getSampleData() {
    console.log('\n📋 Getting sample data from populated tables...');
    
    for (const [tableName, schema] of Object.entries(this.tableSchemas)) {
      if (schema.recordCount > 0) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(3);
          
          if (!error && data) {
            console.log(`\n📄 Sample data from ${tableName}:`);
            console.table(data);
          }
        } catch (error) {
          console.log(`   ⚠️  Could not get sample data from ${tableName}`);
        }
      }
    }
  }

  async generateInsertStatements() {
    console.log('\n🔧 Generating INSERT statements...');
    
    const insertStatements = [];
    
    // Users table
    if (this.tableSchemas.users) {
      const userColumns = this.tableSchemas.users.columns;
      console.log('\n👥 Users table columns:', userColumns);
      
      insertStatements.push(`
-- Insert Users
INSERT INTO users (${userColumns.filter(col => col !== 'created_at' && col !== 'updated_at').join(', ')}, created_at, updated_at) VALUES
('38588c11-a71d-4730-8278-c2efb1cb4436', 'admin@labsyncpro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System', 'Administrator', 'admin', NULL, true, NOW(), NOW()),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'instructor@labsyncpro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Instructor', 'instructor', NULL, true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();`);
    }
    
    // Generate for other tables based on discovered schema
    for (const [tableName, schema] of Object.entries(this.tableSchemas)) {
      if (tableName !== 'users' && schema.columns.length > 0) {
        insertStatements.push(`\n-- ${tableName} table structure: ${schema.columns.join(', ')}`);
      }
    }
    
    console.log('\n📝 Generated INSERT statements:');
    console.log(insertStatements.join('\n'));
    
    // Save to file
    const fs = require('fs');
    fs.writeFileSync('generated-supabase-inserts.sql', insertStatements.join('\n'));
    console.log('\n💾 Saved to: generated-supabase-inserts.sql');
  }

  printSummary() {
    console.log('\n📊 Database Summary:');
    console.log(`   📋 Total tables: ${this.tables.length}`);
    
    for (const [tableName, schema] of Object.entries(this.tableSchemas)) {
      console.log(`   📄 ${tableName}: ${schema.recordCount} records, ${schema.columns.length} columns`);
    }
  }
}

// Run inspection
if (require.main === module) {
  const inspector = new SupabaseInspector();
  inspector.inspect()
    .then(() => inspector.printSummary())
    .catch(console.error);
}

module.exports = SupabaseInspector;
