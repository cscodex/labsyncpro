const { query } = require('../config/database');
require('dotenv').config();

async function checkData() {
  console.log('🔍 CHECKING YOUR DATABASE DATA');
  console.log('=' .repeat(40));

  try {
    // Check what tables exist
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📋 Available tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Check assignments table structure
    console.log('\n📚 ASSIGNMENTS TABLE:');
    try {
      const assignmentColumns = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'created_assignments' 
        ORDER BY ordinal_position
      `);
      
      console.log('   Columns:');
      assignmentColumns.rows.forEach(col => {
        console.log(`     - ${col.column_name} (${col.data_type})`);
      });

      // Check for assignments with files
      const assignmentsWithFiles = await query(`
        SELECT 
          id, 
          name, 
          pdf_filename,
          created_at
        FROM created_assignments 
        WHERE pdf_filename IS NOT NULL 
        ORDER BY created_at DESC 
        LIMIT 5
      `);

      console.log(`\n   Assignments with files (${assignmentsWithFiles.rows.length} found):`);
      assignmentsWithFiles.rows.forEach(row => {
        console.log(`     - "${row.name}": ${row.pdf_filename}`);
      });

    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }

    // Check submissions table structure
    console.log('\n📝 SUBMISSIONS TABLE:');
    try {
      const submissionColumns = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'submissions' 
        ORDER BY ordinal_position
      `);
      
      console.log('   Columns:');
      submissionColumns.rows.forEach(col => {
        console.log(`     - ${col.column_name} (${col.data_type})`);
      });

      // Check total submissions
      const totalSubmissions = await query('SELECT COUNT(*) as count FROM submissions');
      console.log(`\n   Total submissions: ${totalSubmissions.rows[0].count}`);

    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }

    // Check users
    console.log('\n👥 USERS:');
    try {
      const totalUsers = await query('SELECT COUNT(*) as count FROM users');
      const usersByRole = await query(`
        SELECT role, COUNT(*) as count 
        FROM users 
        GROUP BY role 
        ORDER BY role
      `);
      
      console.log(`   Total users: ${totalUsers.rows[0].count}`);
      console.log('   By role:');
      usersByRole.rows.forEach(row => {
        console.log(`     - ${row.role}: ${row.count}`);
      });

    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }

    // Summary for migration
    console.log('\n🚀 MIGRATION SUMMARY:');
    try {
      const assignmentCount = await query('SELECT COUNT(*) as count FROM created_assignments WHERE pdf_filename IS NOT NULL');
      console.log(`   Assignments with files: ${assignmentCount.rows[0].count}`);
      
      // Try to find submission files with different possible column names
      const possibleFileColumns = ['file_path', 'filename', 'attachment', 'pdf_filename', 'file_url'];
      let submissionFileCount = 0;
      
      for (let column of possibleFileColumns) {
        try {
          const result = await query(`SELECT COUNT(*) as count FROM submissions WHERE ${column} IS NOT NULL`);
          if (result.rows[0].count > 0) {
            submissionFileCount = result.rows[0].count;
            console.log(`   Submissions with files (${column}): ${submissionFileCount}`);
            break;
          }
        } catch (err) {
          // Column doesn't exist, continue
        }
      }
      
      if (submissionFileCount === 0) {
        console.log('   Submissions with files: 0 (no file column found)');
      }

      const totalFiles = parseInt(assignmentCount.rows[0].count) + submissionFileCount;
      console.log(`   Total files to migrate: ${totalFiles}`);

      if (totalFiles > 0) {
        console.log('\n✅ You have files that can be migrated to Google Drive!');
      } else {
        console.log('\n📝 No files found for migration. Your database has data but no uploaded files yet.');
      }

    } catch (error) {
      console.log(`   Error getting migration summary: ${error.message}`);
    }

    console.log('\n' + '='.repeat(40));
    console.log('✅ Data check complete!');

  } catch (error) {
    console.error('❌ Error checking data:', error);
  }
}

// Run the check
checkData()
  .then(() => {
    console.log('\nData check completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Data check failed:', error);
    process.exit(1);
  });
