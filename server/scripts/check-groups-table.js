#!/usr/bin/env node

/**
 * Check groups table structure
 */

const { pool } = require('../config/database');

async function checkGroupsTable() {
  try {
    console.log('🔍 Checking groups table structure...\n');
    
    // Check groups table structure
    const groupsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'groups' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Groups table structure:');
    groupsResult.rows.forEach(row => {
      console.log(`   • ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking groups table:', error.message);
  } finally {
    await pool.end();
  }
}

checkGroupsTable();
