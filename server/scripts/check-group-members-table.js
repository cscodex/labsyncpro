#!/usr/bin/env node

/**
 * Check group_members table structure
 */

const { pool } = require('../config/database');

async function checkGroupMembersTable() {
  try {
    console.log('🔍 Checking group_members table structure...\n');
    
    // Check group_members table structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'group_members' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Group_members table structure:');
    result.rows.forEach(row => {
      console.log(`   • ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking group_members table:', error.message);
  } finally {
    await pool.end();
  }
}

checkGroupMembersTable();
