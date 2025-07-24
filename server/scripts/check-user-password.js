const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'labsyncpro',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function checkUserPassword() {
  try {
    console.log('🔍 Checking user password for senior.drew@student.edu...\n');
    
    // Get user details
    const userResult = await pool.query(`
      SELECT id, email, password_hash, first_name, last_name, role, student_id, is_active 
      FROM users 
      WHERE email = $1
    `, ['senior.drew@student.edu']);
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found!');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('👤 User found:');
    console.log(`   Name: ${user.first_name} ${user.last_name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Student ID: ${user.student_id}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.is_active}`);
    console.log(`   Password Hash: ${user.password_hash}`);
    
    // Test different passwords
    const testPasswords = ['instructor123', 'password', 'admin123', 'student123'];
    
    console.log('\n🔐 Testing passwords:');
    for (const password of testPasswords) {
      const isValid = await bcrypt.compare(password, user.password_hash);
      console.log(`   ${password}: ${isValid ? '✅ VALID' : '❌ Invalid'}`);
    }
    
    // Generate new hash for instructor123
    console.log('\n🔧 Generating new hash for "instructor123":');
    const newHash = await bcrypt.hash('instructor123', 10);
    console.log(`   New hash: ${newHash}`);
    
    // Update the user's password
    console.log('\n🔄 Updating user password...');
    await pool.query(`
      UPDATE users 
      SET password_hash = $1 
      WHERE email = $2
    `, [newHash, 'senior.drew@student.edu']);
    
    console.log('✅ Password updated successfully!');
    
    // Verify the update worked
    const verifyResult = await pool.query(`
      SELECT password_hash FROM users WHERE email = $1
    `, ['senior.drew@student.edu']);
    
    const isValidAfterUpdate = await bcrypt.compare('instructor123', verifyResult.rows[0].password_hash);
    console.log(`🔍 Verification: ${isValidAfterUpdate ? '✅ Password works!' : '❌ Password still not working'}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkUserPassword();
