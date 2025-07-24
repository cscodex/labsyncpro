#!/usr/bin/env node

/**
 * Check what tables exist in the database
 */

const { pool } = require('../config/database');

async function checkTables() {
  try {
    console.log('🔍 Checking database tables...\n');
    
    // Get all tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📋 Existing tables:');
    result.rows.forEach(row => {
      console.log(`   • ${row.table_name}`);
    });
    
    console.log(`\n📊 Total tables: ${result.rows.length}`);
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
