#!/usr/bin/env node

/**
 * Check schedule constraints
 */

const { pool } = require('../config/database');

async function checkScheduleConstraints() {
  try {
    console.log('🔍 Checking schedule constraints...\n');
    
    // Check schedules table constraints
    const constraintsResult = await pool.query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        cc.check_clause
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.check_constraints cc 
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_name = 'schedules'
      AND tc.table_schema = 'public';
    `);
    
    console.log('📋 Schedules table constraints:');
    constraintsResult.rows.forEach(row => {
      console.log(`   • ${row.constraint_name} (${row.constraint_type})`);
      if (row.check_clause) {
        console.log(`     Check: ${row.check_clause}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error checking constraints:', error.message);
  } finally {
    await pool.end();
  }
}

checkScheduleConstraints();
