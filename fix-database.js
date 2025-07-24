// Fix database users script
const { Pool } = require('pg');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'labsyncpro',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function fixDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing database users...');
    
    // Hash the password 'admin123'
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Check current users
    console.log('\n📋 Current users:');
    const currentUsers = await client.query('SELECT email, role, is_active FROM users ORDER BY role, email');
    console.table(currentUsers.rows);
    
    // Add/update test users
    console.log('\n➕ Adding/updating test users...');
    
    // Admin user
    await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, is_active) VALUES
      ($1, $2, 'System', 'Administrator', 'admin', true)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        is_active = true
    `, ['admin@labsyncpro.com', hashedPassword]);
    
    // Instructor user
    await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, is_active) VALUES
      ($1, $2, 'Test', 'Instructor', 'instructor', true)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        is_active = true
    `, ['instructor@labsyncpro.com', hashedPassword]);
    
    // Student user
    await client.query(`
      INSERT INTO users (student_id, email, password_hash, first_name, last_name, role, is_active) VALUES
      ('20240999', $1, $2, 'Test', 'Student', 'student', true)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        is_active = true
    `, ['student@labsyncpro.com', hashedPassword]);
    
    console.log('✅ Test users added/updated successfully!');
    
    // Verify the users
    console.log('\n✅ Verification - Test users:');
    const testUsers = await client.query(`
      SELECT email, first_name, last_name, role, is_active 
      FROM users 
      WHERE email IN ('admin@labsyncpro.com', 'instructor@labsyncpro.com', 'student@labsyncpro.com')
      ORDER BY role
    `);
    console.table(testUsers.rows);
    
    console.log('\n🔑 Login credentials:');
    console.log('Admin: admin@labsyncpro.com / admin123');
    console.log('Instructor: instructor@labsyncpro.com / admin123');
    console.log('Student: student@labsyncpro.com / admin123');
    
  } catch (error) {
    console.error('❌ Error fixing database:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixDatabase().catch(console.error);
