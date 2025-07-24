#!/usr/bin/env node

/**
 * Fix user passwords by generating correct hash for "password123"
 */

const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

async function fixPasswords() {
  try {
    console.log('🔧 Fixing user passwords...\n');
    
    // Generate correct hash for "password123"
    const correctHash = await bcrypt.hash('password123', 10);
    console.log(`✅ Generated hash for "password123": ${correctHash.substring(0, 20)}...`);
    
    // Update all non-admin users with the correct password hash
    const result = await pool.query(`
      UPDATE users 
      SET password_hash = $1 
      WHERE role != 'admin'
    `, [correctHash]);
    
    console.log(`✅ Updated ${result.rowCount} user passwords`);
    
    // Test a few users
    const testUsers = ['alice.johnson@student.edu', 'dr.sarah.johnson@school.edu'];
    
    for (const email of testUsers) {
      const user = await pool.query('SELECT email, password_hash FROM users WHERE email = $1', [email]);
      
      if (user.rows.length > 0) {
        const isValid = await bcrypt.compare('password123', user.rows[0].password_hash);
        console.log(`✅ ${email}: Password valid = ${isValid}`);
      }
    }
    
    console.log('\n🎉 Password fix completed!');
    console.log('\n🔐 Updated Login Credentials:');
    console.log('   Admin: admin@labsyncpro.com / admin123');
    console.log('   Instructor: dr.sarah.johnson@school.edu / password123');
    console.log('   Student: alice.johnson@student.edu / password123');
    console.log('   (All non-admin users now have password: password123)');
    
  } catch (error) {
    console.error('❌ Error fixing passwords:', error.message);
  } finally {
    await pool.end();
  }
}

fixPasswords();
