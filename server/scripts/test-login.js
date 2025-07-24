#!/usr/bin/env node

/**
 * Test login functionality with populated users
 */

const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

async function testLogin() {
  try {
    console.log('🔍 Testing login functionality...\n');
    
    // Test password verification for a few users
    const testUsers = [
      'admin@labsyncpro.com',
      'alice.johnson@student.edu',
      'dr.sarah.johnson@school.edu'
    ];
    
    for (const email of testUsers) {
      const user = await pool.query('SELECT email, password_hash FROM users WHERE email = $1', [email]);
      
      if (user.rows.length > 0) {
        const storedHash = user.rows[0].password_hash;
        const testPassword = email === 'admin@labsyncpro.com' ? 'admin123' : 'password123';
        
        console.log(`👤 Testing ${email}:`);
        console.log(`   Password Hash: ${storedHash.substring(0, 20)}...`);
        
        try {
          const isValid = await bcrypt.compare(testPassword, storedHash);
          console.log(`   Password Valid: ${isValid ? '✅ Yes' : '❌ No'}`);
        } catch (error) {
          console.log(`   Password Check Error: ${error.message}`);
        }
      } else {
        console.log(`❌ User ${email} not found`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error testing login:', error.message);
  } finally {
    await pool.end();
  }
}

testLogin();
