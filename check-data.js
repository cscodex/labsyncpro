const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' });

const config = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'labsyncpro',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
};

async function checkData() {
  const pool = new Pool(config);
  try {
    console.log('🔍 Checking database connection and data...');
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    
    // Check tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log(`📊 Found ${tables.rows.length} tables:`, tables.rows.map(r => r.table_name).join(', '));
    
    // Check users
    const users = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Users: ${users.rows[0].count}`);
    
    // Check classes
    const classes = await pool.query('SELECT COUNT(*) as count FROM classes');
    console.log(`🎓 Classes: ${classes.rows[0].count}`);
    
    // Check groups
    const groups = await pool.query('SELECT COUNT(*) as count FROM groups');
    console.log(`👨‍👩‍👧‍👦 Groups: ${groups.rows[0].count}`);
    
    // Check schedules
    const schedules = await pool.query('SELECT COUNT(*) as count FROM schedules');
    console.log(`📅 Schedules: ${schedules.rows[0].count}`);
    
    // Check submissions
    const submissions = await pool.query('SELECT COUNT(*) as count FROM submissions');
    console.log(`📝 Submissions: ${submissions.rows[0].count}`);
    
    // Check grades
    const grades = await pool.query('SELECT COUNT(*) as count FROM grades');
    console.log(`📊 Grades: ${grades.rows[0].count}`);
    
    // Check recent schedules
    const recentSchedules = await pool.query(`
      SELECT s.title, s.scheduled_date, c.name as class_name, l.name as lab_name
      FROM schedules s
      JOIN classes c ON s.class_id = c.id
      JOIN labs l ON s.lab_id = l.id
      ORDER BY s.created_at DESC
      LIMIT 5
    `);
    
    console.log('\n📋 Recent schedules:');
    recentSchedules.rows.forEach(row => {
      console.log(`  - ${row.title} (${row.class_name} in ${row.lab_name}) - ${row.scheduled_date}`);
    });
    
    console.log('\n✅ Data check completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkData();
