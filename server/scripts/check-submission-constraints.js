#!/usr/bin/env node

/**
 * Check submission constraints
 */

const { pool } = require('../config/database');

async function checkSubmissionConstraints() {
  try {
    console.log('🔍 Checking submission constraints...\n');
    
    // Check submissions table constraints
    const constraintsResult = await pool.query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        cc.check_clause
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.check_constraints cc 
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_name = 'submissions'
      AND tc.table_schema = 'public';
    `);
    
    console.log('📋 Submissions table constraints:');
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

checkSubmissionConstraints();
