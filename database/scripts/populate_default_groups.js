const { query } = require('../../server/config/database');

async function populateDefaultGroups() {
  try {
    console.log('🚀 Starting to populate default groups...');

    // Get all students who are not in any group
    const studentsWithoutGroups = await query(`
      SELECT u.id, u.first_name, u.last_name, u.student_id
      FROM users u
      WHERE u.role = 'student' 
        AND u.is_active = true
        AND u.id NOT IN (
          SELECT DISTINCT gm.user_id 
          FROM group_members gm
        )
    `);

    console.log(`📊 Found ${studentsWithoutGroups.rows.length} students without groups`);

    // Get all classes and their default groups
    const classesWithDefaults = await query(`
      SELECT c.id as class_id, c.class_code, g.id as default_group_id
      FROM classes c
      JOIN groups g ON c.id = g.class_id
      WHERE g.is_default = true
      ORDER BY c.class_code
    `);

    console.log(`📊 Found ${classesWithDefaults.rows.length} classes with default groups`);

    // For demonstration, let's assign students to classes based on their student_id patterns
    // In a real system, you'd have proper enrollment data
    let assignmentCount = 0;

    for (const student of studentsWithoutGroups.rows) {
      // Simple assignment logic based on student_id
      // You can modify this logic based on your actual enrollment rules
      const studentIdNum = parseInt(student.student_id);
      const classIndex = studentIdNum % classesWithDefaults.rows.length;
      const targetClass = classesWithDefaults.rows[classIndex];

      try {
        await query(`
          INSERT INTO group_members (group_id, user_id)
          VALUES ($1, $2)
          ON CONFLICT (group_id, user_id) DO NOTHING
        `, [targetClass.default_group_id, student.id]);

        console.log(`✅ Assigned ${student.first_name} ${student.last_name} (${student.student_id}) to ${targetClass.class_code} default group`);
        assignmentCount++;
      } catch (error) {
        console.error(`❌ Failed to assign ${student.first_name} ${student.last_name}:`, error.message);
      }
    }

    console.log(`🎉 Successfully assigned ${assignmentCount} students to default groups`);

    // Show summary
    const summary = await query(`
      SELECT 
        c.class_code,
        g.name as group_name,
        COUNT(gm.user_id) as member_count
      FROM classes c
      JOIN groups g ON c.id = g.class_id AND g.is_default = true
      LEFT JOIN group_members gm ON g.id = gm.group_id
      GROUP BY c.class_code, g.name
      ORDER BY c.class_code
    `);

    console.log('\n📈 Default Groups Summary:');
    summary.rows.forEach(row => {
      console.log(`  ${row.class_code}: ${row.member_count} students`);
    });

  } catch (error) {
    console.error('❌ Error populating default groups:', error);
  }
}

// Run if called directly
if (require.main === module) {
  populateDefaultGroups().then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { populateDefaultGroups };
