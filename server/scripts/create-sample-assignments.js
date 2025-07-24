#!/usr/bin/env node

/**
 * Create sample seat assignments for classes across Computer Lab 1 and Computer Lab 2
 * Divide 20 classes equally between the two labs (10 each)
 */

const { pool } = require('../config/database');

async function createSampleAssignments() {
  try {
    console.log('🎯 Creating sample seat assignments...\n');
    
    // Get all classes
    const classesResult = await pool.query(`
      SELECT id, name, grade, stream, capacity 
      FROM classes 
      ORDER BY grade, stream, name
    `);
    const classes = classesResult.rows;
    console.log(`📚 Found ${classes.length} classes`);
    
    // Get Computer Lab 1 and Computer Lab 2
    const labsResult = await pool.query(`
      SELECT id, name 
      FROM labs 
      WHERE name IN ('Computer Lab 1', 'Computer Lab 2')
      ORDER BY name
    `);
    const labs = labsResult.rows;
    
    if (labs.length < 2) {
      console.error('❌ Need both Computer Lab 1 and Computer Lab 2');
      return;
    }
    
    const lab1 = labs.find(lab => lab.name === 'Computer Lab 1');
    const lab2 = labs.find(lab => lab.name === 'Computer Lab 2');
    
    console.log(`🏢 Lab 1: ${lab1.name} (${lab1.id})`);
    console.log(`🏢 Lab 2: ${lab2.name} (${lab2.id})`);
    
    // Get seats for both labs
    const lab1SeatsResult = await pool.query('SELECT id, seat_number FROM seats WHERE lab_id = $1 ORDER BY seat_number', [lab1.id]);
    const lab2SeatsResult = await pool.query('SELECT id, seat_number FROM seats WHERE lab_id = $1 ORDER BY seat_number', [lab2.id]);
    
    console.log(`💺 Lab 1 seats: ${lab1SeatsResult.rows.length}`);
    console.log(`💺 Lab 2 seats: ${lab2SeatsResult.rows.length}`);
    
    // Get some sample students
    const studentsResult = await pool.query(`
      SELECT id, first_name, last_name, student_id 
      FROM users 
      WHERE role = 'student' 
      ORDER BY student_id 
      LIMIT 100
    `);
    const students = studentsResult.rows;
    console.log(`👥 Found ${students.length} students for assignments\n`);
    
    // Divide classes between labs (10 each)
    const lab1Classes = classes.slice(0, 10);
    const lab2Classes = classes.slice(10, 20);
    
    console.log('📋 Class distribution:');
    console.log(`🏢 Computer Lab 1 classes (${lab1Classes.length}):`);
    lab1Classes.forEach(cls => console.log(`   • ${cls.name}`));
    
    console.log(`🏢 Computer Lab 2 classes (${lab2Classes.length}):`);
    lab2Classes.forEach(cls => console.log(`   • ${cls.name}`));
    
    // Create sample schedules and seat assignments
    let assignmentCount = 0;
    let studentIndex = 0;
    
    // Create assignments for Lab 1 classes
    for (let i = 0; i < lab1Classes.length; i++) {
      const cls = lab1Classes[i];
      
      // Create a sample schedule for this class
      const scheduleResult = await pool.query(`
        INSERT INTO schedules (title, description, lab_id, instructor_id, class_id, scheduled_date, duration_minutes, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        `${cls.name} Lab Session`,
        `Computer lab practical session for ${cls.name}`,
        lab1.id,
        '7fb620cb-47ad-473d-a810-08814fd296b0', // Admin user as instructor
        cls.id,
        new Date(Date.now() + ((i + 1) * 24 * 60 * 60 * 1000)), // Spread over different days (future dates)
        120, // 2 hours
        'scheduled'
      ]);
      
      const scheduleId = scheduleResult.rows[0].id;
      
      // Assign 3-5 seats for this class
      const seatsToAssign = Math.min(3 + Math.floor(Math.random() * 3), lab1SeatsResult.rows.length - (i * 5));
      
      for (let j = 0; j < seatsToAssign && studentIndex < students.length; j++) {
        const seatIndex = (i * 5) + j; // Distribute seats across the lab
        if (seatIndex < lab1SeatsResult.rows.length) {
          const seat = lab1SeatsResult.rows[seatIndex];
          const student = students[studentIndex];
          
          try {
            await pool.query(`
              INSERT INTO seat_assignments (schedule_id, user_id, seat_id)
              VALUES ($1, $2, $3)
            `, [scheduleId, student.id, seat.id]);
            
            assignmentCount++;
            console.log(`✅ Assigned ${student.first_name} ${student.last_name} to Lab 1 Seat ${seat.seat_number} for ${cls.name}`);
          } catch (error) {
            console.log(`⚠️  Failed to assign seat for ${cls.name}: ${error.message}`);
          }
          
          studentIndex++;
        }
      }
    }
    
    // Create assignments for Lab 2 classes
    for (let i = 0; i < lab2Classes.length; i++) {
      const cls = lab2Classes[i];
      
      // Create a sample schedule for this class
      const scheduleResult = await pool.query(`
        INSERT INTO schedules (title, description, lab_id, instructor_id, class_id, scheduled_date, duration_minutes, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        `${cls.name} Lab Session`,
        `Computer lab practical session for ${cls.name}`,
        lab2.id,
        '7fb620cb-47ad-473d-a810-08814fd296b0', // Admin user as instructor
        cls.id,
        new Date(Date.now() + ((i + 11) * 24 * 60 * 60 * 1000)), // Spread over different days (future dates)
        120, // 2 hours
        'scheduled'
      ]);
      
      const scheduleId = scheduleResult.rows[0].id;
      
      // Assign 3-5 seats for this class
      const seatsToAssign = Math.min(3 + Math.floor(Math.random() * 3), lab2SeatsResult.rows.length - (i * 5));
      
      for (let j = 0; j < seatsToAssign && studentIndex < students.length; j++) {
        const seatIndex = (i * 5) + j; // Distribute seats across the lab
        if (seatIndex < lab2SeatsResult.rows.length) {
          const seat = lab2SeatsResult.rows[seatIndex];
          const student = students[studentIndex];
          
          try {
            await pool.query(`
              INSERT INTO seat_assignments (schedule_id, user_id, seat_id)
              VALUES ($1, $2, $3)
            `, [scheduleId, student.id, seat.id]);
            
            assignmentCount++;
            console.log(`✅ Assigned ${student.first_name} ${student.last_name} to Lab 2 Seat ${seat.seat_number} for ${cls.name}`);
          } catch (error) {
            console.log(`⚠️  Failed to assign seat for ${cls.name}: ${error.message}`);
          }
          
          studentIndex++;
        }
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   • Total seat assignments created: ${assignmentCount}`);
    console.log(`   • Students assigned: ${studentIndex}`);
    console.log(`   • Classes with assignments: ${classes.length}`);
    
    console.log('\n✅ Sample assignments created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating sample assignments:', error.message);
  } finally {
    await pool.end();
  }
}

createSampleAssignments();
