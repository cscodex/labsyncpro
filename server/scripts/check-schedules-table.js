#!/usr/bin/env node

/**
 * Check schedules table structure
 */

const { pool } = require('../config/database');

async function checkSchedulesTable() {
  try {
    console.log('🔍 Checking schedules table structure...\n');
    
    // Check schedules table structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'schedules' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Schedules table structure:');
    result.rows.forEach(row => {
      console.log(`   • ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking schedules table:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchedulesTable();
