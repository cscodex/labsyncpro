#!/usr/bin/env node

/**
 * Check submissions table structure
 */

const { pool } = require('../config/database');

async function checkSubmissionsTable() {
  try {
    console.log('🔍 Checking submissions table structure...\n');
    
    // Check submissions table structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'submissions' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Submissions table structure:');
    result.rows.forEach(row => {
      console.log(`   • ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking submissions table:', error.message);
  } finally {
    await pool.end();
  }
}

checkSubmissionsTable();
