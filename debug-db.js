// Quick database debug script
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'labsyncpro',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function debugDatabase() {
  try {
    console.log('🔍 Checking database connection...');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    
    // Check users table structure
    console.log('\n📋 Users table structure:');
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.table(tableInfo.rows);
    
    // Check if users exist
    console.log('\n👥 Users in database:');
    const users = await client.query('SELECT id, email, role FROM users LIMIT 5');
    console.table(users.rows);
    
    // Test login for admin user
    console.log('\n🔐 Testing admin user:');
    const adminUser = await client.query(`
      SELECT id, email, password_hash, first_name, last_name, role, student_id 
      FROM users 
      WHERE email = 'admin@labsyncpro.com'
    `);
    
    if (adminUser.rows.length > 0) {
      console.log('✅ Admin user found:', {
        id: adminUser.rows[0].id,
        email: adminUser.rows[0].email,
        role: adminUser.rows[0].role,
        hasPassword: !!adminUser.rows[0].password_hash
      });
    } else {
      console.log('❌ Admin user not found');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

debugDatabase();
