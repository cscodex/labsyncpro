#!/usr/bin/env node

/**
 * Check the structure of specific tables
 */

const { pool } = require('../config/database');

async function checkTableStructure() {
  try {
    console.log('🔍 Checking table structures...\n');
    
    // Check labs table structure
    const labsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'labs' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Labs table structure:');
    labsResult.rows.forEach(row => {
      console.log(`   • ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Check classes table structure
    const classesResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'classes' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Classes table structure:');
    classesResult.rows.forEach(row => {
      console.log(`   • ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Check computers table structure
    const computersResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'computers' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Computers table structure:');
    computersResult.rows.forEach(row => {
      console.log(`   • ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking table structure:', error.message);
  } finally {
    await pool.end();
  }
}

checkTableStructure();
