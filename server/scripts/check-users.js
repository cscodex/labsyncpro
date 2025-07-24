#!/usr/bin/env node

/**
 * Check users and their credentials
 */

const { pool } = require('../config/database');

async function checkUsers() {
  try {
    console.log('🔍 Checking users...\n');
    
    // Check all users
    const users = await pool.query(`
      SELECT email, role, first_name, last_name, student_id
      FROM users 
      ORDER BY role, email
      LIMIT 10
    `);
    
    console.log('👥 Sample Users:');
    users.rows.forEach(user => {
      console.log(`   • ${user.email} (${user.role}) - ${user.first_name} ${user.last_name} ${user.student_id || ''}`);
    });
    
    // Check specific instructor
    const instructor = await pool.query(`
      SELECT email, password_hash, role
      FROM users 
      WHERE email = 'dr.sarah.johnson@school.edu'
    `);
    
    if (instructor.rows.length > 0) {
      console.log('\n🔍 Dr. Sarah Johnson:');
      console.log(`   Email: ${instructor.rows[0].email}`);
      console.log(`   Role: ${instructor.rows[0].role}`);
      console.log(`   Has Password: ${instructor.rows[0].password_hash ? 'Yes' : 'No'}`);
    } else {
      console.log('\n❌ Dr. Sarah Johnson not found');
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers();
