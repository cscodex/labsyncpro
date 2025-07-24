const { Pool } = require('pg');
require('dotenv').config();

const config = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'labsyncpro',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
};

async function createAssignments() {
  const pool = new Pool(config);
  try {
    console.log('🔄 Creating sample assignments...');
    
    // First, check if schedule_assignments table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schedule_assignments'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ schedule_assignments table does not exist!');
      return;
    }
    
    // Clear existing assignments
    await pool.query('DELETE FROM schedule_assignments');
    console.log('🗑️ Cleared existing assignments');
    
    // Get schedules
    const schedules = await pool.query(`
      SELECT s.id, s.title, s.class_id, c.name as class_name
      FROM schedules s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.status = 'scheduled'
      ORDER BY s.created_at
      LIMIT 10
    `);
    
    console.log(`📅 Found ${schedules.rows.length} schedules`);
    
    for (const schedule of schedules.rows) {
      console.log(`\n📋 Creating assignments for: ${schedule.title}`);
      
      if (schedule.class_id) {
        // Get groups for this class
        const groups = await pool.query(`
          SELECT id, name FROM groups 
          WHERE class_id = $1 
          ORDER BY name 
          LIMIT 5
        `, [schedule.class_id]);
        
        console.log(`  👥 Found ${groups.rows.length} groups for ${schedule.class_name}`);
        
        // Assign groups to this schedule
        for (let i = 0; i < groups.rows.length; i++) {
          const group = groups.rows[i];
          
          await pool.query(`
            INSERT INTO schedule_assignments (schedule_id, group_id, assigned_computer, assigned_seat)
            VALUES ($1, $2, $3, $4)
          `, [
            schedule.id,
            group.id,
            i + 1, // Computer number
            null   // Seat will be assigned individually
          ]);
          
          console.log(`    ✅ Assigned group "${group.name}" to computer ${i + 1}`);
        }
        
        // Also create some individual assignments for students not in groups
        const ungroupedStudents = await pool.query(`
          SELECT u.id, u.first_name, u.last_name
          FROM users u
          WHERE u.role = 'student'
          AND NOT EXISTS (
            SELECT 1 FROM group_members gm
            JOIN groups g ON gm.group_id = g.id
            WHERE gm.user_id = u.id AND g.class_id = $1
          )
          LIMIT 3
        `, [schedule.class_id]);
        
        console.log(`  👤 Found ${ungroupedStudents.rows.length} ungrouped students`);
        
        for (let i = 0; i < ungroupedStudents.rows.length; i++) {
          const student = ungroupedStudents.rows[i];
          
          await pool.query(`
            INSERT INTO schedule_assignments (schedule_id, user_id, assigned_computer, assigned_seat)
            VALUES ($1, $2, $3, $4)
          `, [
            schedule.id,
            student.id,
            groups.rows.length + i + 1, // Computer number after groups
            i + 1 // Seat number
          ]);
          
          console.log(`    ✅ Assigned student "${student.first_name} ${student.last_name}" to computer ${groups.rows.length + i + 1}`);
        }
      }
    }
    
    // Check final count
    const finalCount = await pool.query('SELECT COUNT(*) as count FROM schedule_assignments');
    console.log(`\n✅ Created ${finalCount.rows[0].count} assignments total`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

createAssignments();
