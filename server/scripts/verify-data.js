#!/usr/bin/env node

/**
 * Verify and display the populated data
 */

const { pool } = require('../config/database');

async function verifyData() {
  try {
    console.log('🔍 Verifying populated data...\n');
    
    // Check labs
    const labs = await pool.query('SELECT name, total_computers, total_seats, location FROM labs ORDER BY name');
    console.log('🏢 Labs:');
    labs.rows.forEach(lab => {
      console.log(`   • ${lab.name}: ${lab.total_computers} computers, ${lab.total_seats} seats (${lab.location})`);
    });
    
    // Check classes
    const classes = await pool.query('SELECT name, grade, stream, capacity FROM classes ORDER BY grade, stream, name');
    console.log('\n📚 Classes:');
    classes.rows.forEach(cls => {
      console.log(`   • ${cls.name}: Grade ${cls.grade} ${cls.stream} (Capacity: ${cls.capacity})`);
    });
    
    // Check users by role
    const users = await pool.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role 
      ORDER BY role
    `);
    console.log('\n👥 Users by Role:');
    users.rows.forEach(user => {
      console.log(`   • ${user.role}: ${user.count} users`);
    });
    
    // Check some sample students
    const students = await pool.query(`
      SELECT first_name, last_name, student_id, email 
      FROM users 
      WHERE role = 'student' 
      ORDER BY student_id 
      LIMIT 5
    `);
    console.log('\n🎓 Sample Students:');
    students.rows.forEach(student => {
      console.log(`   • ${student.first_name} ${student.last_name} (${student.student_id}) - ${student.email}`);
    });
    
    // Check groups
    const groups = await pool.query(`
      SELECT g.name, c.name as class_name, COUNT(gm.user_id) as member_count
      FROM groups g
      JOIN classes c ON g.class_id = c.id
      LEFT JOIN group_members gm ON g.id = gm.group_id
      GROUP BY g.id, g.name, c.name
      ORDER BY c.name, g.name
    `);
    console.log('\n👥 Groups:');
    groups.rows.forEach(group => {
      console.log(`   • ${group.name} (${group.class_name}): ${group.member_count} members`);
    });
    
    // Check schedules
    const schedules = await pool.query(`
      SELECT s.title, c.name as class_name, l.name as lab_name, s.status, s.scheduled_date
      FROM schedules s
      JOIN classes c ON s.class_id = c.id
      JOIN labs l ON s.lab_id = l.id
      ORDER BY s.scheduled_date
    `);
    console.log('\n📅 Lab Schedules:');
    schedules.rows.forEach(schedule => {
      const date = new Date(schedule.scheduled_date).toLocaleDateString();
      console.log(`   • ${schedule.title} (${schedule.class_name}) - ${schedule.lab_name} [${schedule.status}] on ${date}`);
    });
    
    // Check submissions and grades
    const submissions = await pool.query(`
      SELECT s.submission_type, COUNT(*) as count, AVG(g.score) as avg_score
      FROM submissions s
      LEFT JOIN grades g ON s.id = g.submission_id
      GROUP BY s.submission_type
      ORDER BY s.submission_type
    `);
    console.log('\n📝 Submissions & Grades:');
    submissions.rows.forEach(sub => {
      const avgScore = sub.avg_score ? Math.round(sub.avg_score * 100) / 100 : 'N/A';
      console.log(`   • ${sub.submission_type}: ${sub.count} submissions (Avg Score: ${avgScore})`);
    });
    
    console.log('\n✅ Data verification complete!');
    
  } catch (error) {
    console.error('❌ Error verifying data:', error.message);
  } finally {
    await pool.end();
  }
}

verifyData();
