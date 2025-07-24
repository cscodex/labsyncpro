#!/usr/bin/env node

/**
 * Apply the full schema to ensure all tables exist
 */

const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function applyFullSchema() {
  try {
    console.log('🔧 Applying full database schema...\n');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await pool.query(schemaSQL);
    
    console.log('✅ Schema applied successfully');
    
    // Check what tables exist now
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Current tables:');
    result.rows.forEach(row => {
      console.log(`   • ${row.table_name}`);
    });
    
    console.log(`\n📊 Total tables: ${result.rows.length}`);
    
  } catch (error) {
    console.error('❌ Error applying schema:', error.message);
  } finally {
    await pool.end();
  }
}

applyFullSchema();
