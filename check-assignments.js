const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' });

const config = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'labsyncpro',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
};

async function checkAssignments() {
  const pool = new Pool(config);
  try {
    console.log('🔍 Checking assignments-related tables...');
    
    // Check if schedule_assignments table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schedule_assignments'
      );
    `);
    
    console.log(`📋 schedule_assignments table exists: ${tableExists.rows[0].exists}`);
    
    if (tableExists.rows[0].exists) {
      // Check table structure
      const structure = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'schedule_assignments'
        ORDER BY ordinal_position
      `);
      
      console.log('📊 Table structure:');
      structure.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
      
      // Check data count
      const count = await pool.query('SELECT COUNT(*) as count FROM schedule_assignments');
      console.log(`📈 Records in schedule_assignments: ${count.rows[0].count}`);
      
      if (count.rows[0].count > 0) {
        // Show sample data
        const sample = await pool.query(`
          SELECT sa.*, s.title as schedule_title
          FROM schedule_assignments sa
          JOIN schedules s ON sa.schedule_id = s.id
          LIMIT 5
        `);
        
        console.log('📋 Sample assignments:');
        sample.rows.forEach(row => {
          console.log(`  - ${row.schedule_title}: group_id=${row.group_id}, user_id=${row.user_id}`);
        });
      }
    } else {
      console.log('❌ schedule_assignments table does not exist!');
      
      // Check what tables do exist
      const allTables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      
      console.log('📋 Available tables:');
      allTables.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    }
    
    // Check schedules table
    const schedules = await pool.query('SELECT COUNT(*) as count FROM schedules');
    console.log(`📅 Schedules available: ${schedules.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

checkAssignments();
