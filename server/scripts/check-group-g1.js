const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'labsyncpro',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function checkGroupG1() {
  try {
    console.log('🔍 Checking for Group G-1 and similar groups...\n');
    
    // First, let's see all groups
    const allGroupsResult = await pool.query(`
      SELECT g.name, g.id, c.name as class_name 
      FROM groups g 
      JOIN classes c ON g.class_id = c.id 
      ORDER BY g.name
    `);
    
    console.log('📋 All Groups:');
    allGroupsResult.rows.forEach(group => {
      console.log(`  - ${group.name} (Class: ${group.class_name})`);
    });
    
    // Look for groups that might be G-1 or similar
    const g1GroupsResult = await pool.query(`
      SELECT g.name, g.id, c.name as class_name 
      FROM groups g 
      JOIN classes c ON g.class_id = c.id 
      WHERE g.name ILIKE '%G-1%' OR g.name ILIKE '%Group A%' OR g.name ILIKE 'G%1%'
      ORDER BY g.name
    `);
    
    console.log('\n🎯 Groups matching G-1 pattern:');
    if (g1GroupsResult.rows.length === 0) {
      console.log('  No groups found matching G-1 pattern');
      
      // Let's check the first group and its members
      if (allGroupsResult.rows.length > 0) {
        const firstGroup = allGroupsResult.rows[0];
        console.log(`\n📝 Using first available group: ${firstGroup.name}`);
        
        const membersResult = await pool.query(`
          SELECT 
            u.id,
            u.first_name,
            u.last_name,
            u.email,
            u.student_id,
            CASE WHEN g.leader_id = u.id THEN 'leader' ELSE 'member' END as role
          FROM group_members gm
          JOIN users u ON gm.user_id = u.id
          JOIN groups g ON gm.group_id = g.id
          WHERE gm.group_id = $1
          ORDER BY (CASE WHEN g.leader_id = u.id THEN 0 ELSE 1 END), u.first_name
        `, [firstGroup.id]);
        
        console.log(`\n👥 Members of ${firstGroup.name}:`);
        membersResult.rows.forEach(member => {
          console.log(`  - ${member.first_name} ${member.last_name} (${member.student_id})`);
          console.log(`    Email: ${member.email}`);
          console.log(`    Role: ${member.role}`);
          console.log(`    Password: instructor123 (default password)\n`);
        });
        
        if (membersResult.rows.length > 0) {
          const firstStudent = membersResult.rows[0];
          console.log('🔑 LOGIN CREDENTIALS FOR TESTING:');
          console.log(`   Email: ${firstStudent.email}`);
          console.log(`   Password: instructor123`);
          console.log(`   Student ID: ${firstStudent.student_id}`);
          console.log(`   Name: ${firstStudent.first_name} ${firstStudent.last_name}`);
        }
      }
    } else {
      g1GroupsResult.rows.forEach(group => {
        console.log(`  - ${group.name} (Class: ${group.class_name})`);
      });
      
      // Get members of the first matching group
      const targetGroup = g1GroupsResult.rows[0];
      const membersResult = await pool.query(`
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.student_id,
          CASE WHEN g.leader_id = u.id THEN 'leader' ELSE 'member' END as role
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        JOIN groups g ON gm.group_id = g.id
        WHERE gm.group_id = $1
        ORDER BY (CASE WHEN g.leader_id = u.id THEN 0 ELSE 1 END), u.first_name
      `, [targetGroup.id]);
      
      console.log(`\n👥 Members of ${targetGroup.name}:`);
      membersResult.rows.forEach(member => {
        console.log(`  - ${member.first_name} ${member.last_name} (${member.student_id})`);
        console.log(`    Email: ${member.email}`);
        console.log(`    Role: ${member.role}`);
        console.log(`    Password: instructor123 (default password)\n`);
      });
      
      if (membersResult.rows.length > 0) {
        const firstStudent = membersResult.rows[0];
        console.log('🔑 LOGIN CREDENTIALS FOR TESTING:');
        console.log(`   Email: ${firstStudent.email}`);
        console.log(`   Password: instructor123`);
        console.log(`   Student ID: ${firstStudent.student_id}`);
        console.log(`   Name: ${firstStudent.first_name} ${firstStudent.last_name}`);
      }
    }
    
    // Check for assignments
    console.log('\n📚 Checking for assignments...');
    const assignmentsResult = await pool.query(`
      SELECT 
        sa.id,
        s.title,
        s.description,
        s.scheduled_date,
        c.name as class_name,
        g.name as group_name,
        CONCAT(u.first_name, ' ', u.last_name) as student_name
      FROM schedule_assignments sa
      JOIN schedules s ON sa.schedule_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN groups g ON sa.group_id = g.id
      LEFT JOIN users u ON sa.user_id = u.id
      ORDER BY s.scheduled_date DESC
      LIMIT 10
    `);
    
    if (assignmentsResult.rows.length > 0) {
      console.log('Recent assignments:');
      assignmentsResult.rows.forEach(assignment => {
        console.log(`  - ${assignment.title}`);
        console.log(`    Class: ${assignment.class_name || 'N/A'}`);
        console.log(`    Group: ${assignment.group_name || 'N/A'}`);
        console.log(`    Student: ${assignment.student_name || 'N/A'}`);
        console.log(`    Date: ${assignment.scheduled_date}\n`);
      });
    } else {
      console.log('No assignments found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkGroupG1();
