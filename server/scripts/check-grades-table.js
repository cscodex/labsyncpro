#!/usr/bin/env node

/**
 * Check grades table structure
 */

const { pool } = require('../config/database');

async function checkGradesTable() {
  try {
    console.log('🔍 Checking grades table structure...\n');
    
    // Check grades table structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'grades' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Grades table structure:');
    result.rows.forEach(row => {
      console.log(`   • ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking grades table:', error.message);
  } finally {
    await pool.end();
  }
}

checkGradesTable();
