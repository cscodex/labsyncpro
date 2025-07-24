#!/usr/bin/env node

/**
 * Cleanup script to delete all assignment submissions except for senior.drew's submissions from today
 */

const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const config = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'labsyncpro',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
};

async function cleanupSubmissions() {
  const pool = new Pool(config);
  
  try {
    console.log('🧹 Starting submission cleanup...\n');
    
    // First, find senior.drew's user ID
    const userResult = await pool.query(`
      SELECT id, email, first_name, last_name 
      FROM users 
      WHERE email = 'senior.drew@example.com' OR student_id = 'senior.drew'
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ User senior.drew not found. Checking all users with "drew" in email or student_id...');
      
      const drewUsers = await pool.query(`
        SELECT id, email, first_name, last_name, student_id 
        FROM users 
        WHERE email ILIKE '%drew%' OR student_id ILIKE '%drew%'
      `);
      
      console.log('👥 Found users with "drew":');
      drewUsers.rows.forEach(user => {
        console.log(`   • ID: ${user.id}, Email: ${user.email}, Name: ${user.first_name} ${user.last_name}, Student ID: ${user.student_id}`);
      });
      
      if (drewUsers.rows.length === 0) {
        console.log('❌ No users found with "drew" in email or student_id');
        return;
      }
      
      // Use the first drew user found
      var drewUserId = drewUsers.rows[0].id;
      console.log(`\n📌 Using user: ${drewUsers.rows[0].email} (ID: ${drewUserId})`);
    } else {
      var drewUserId = userResult.rows[0].id;
      console.log(`✅ Found senior.drew: ${userResult.rows[0].email} (ID: ${drewUserId})`);
    }
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Today's date: ${today}`);
    
    // Check existing assignment submissions
    const existingSubmissions = await pool.query(`
      SELECT 
        asub.id,
        asub.user_id,
        asub.assignment_distribution_id,
        asub.assignment_response_filename,
        asub.output_test_filename,
        asub.submitted_at,
        u.email,
        u.first_name,
        u.last_name
      FROM assignment_submissions asub
      JOIN users u ON asub.user_id = u.id
      ORDER BY asub.submitted_at DESC
    `);
    
    console.log(`\n📊 Found ${existingSubmissions.rows.length} assignment submissions:`);
    existingSubmissions.rows.forEach(sub => {
      const submittedDate = sub.submitted_at ? sub.submitted_at.toISOString().split('T')[0] : 'N/A';
      console.log(`   • ID: ${sub.id}, User: ${sub.email}, Submitted: ${submittedDate}`);
      if (sub.assignment_response_filename) {
        console.log(`     - Response: ${sub.assignment_response_filename}`);
      }
      if (sub.output_test_filename) {
        console.log(`     - Output: ${sub.output_test_filename}`);
      }
    });
    
    // Find submissions to keep (senior.drew's submissions from today)
    const keepSubmissions = await pool.query(`
      SELECT 
        asub.id,
        asub.assignment_response_filename,
        asub.output_test_filename,
        asub.submitted_at
      FROM assignment_submissions asub
      WHERE asub.user_id = $1 
      AND DATE(asub.submitted_at) = $2
    `, [drewUserId, today]);
    
    console.log(`\n🔒 Submissions to KEEP (senior.drew from today): ${keepSubmissions.rows.length}`);
    keepSubmissions.rows.forEach(sub => {
      console.log(`   • ID: ${sub.id}, Submitted: ${sub.submitted_at}`);
      if (sub.assignment_response_filename) {
        console.log(`     - Response: ${sub.assignment_response_filename}`);
      }
      if (sub.output_test_filename) {
        console.log(`     - Output: ${sub.output_test_filename}`);
      }
    });
    
    if (keepSubmissions.rows.length === 0) {
      console.log('⚠️  No submissions found for senior.drew from today. Proceeding with caution...');
    }
    
    // Get submissions to delete
    const deleteSubmissions = await pool.query(`
      SELECT 
        asub.id,
        asub.assignment_response_filename,
        asub.output_test_filename,
        u.email
      FROM assignment_submissions asub
      JOIN users u ON asub.user_id = u.id
      WHERE NOT (asub.user_id = $1 AND DATE(asub.submitted_at) = $2)
    `, [drewUserId, today]);
    
    console.log(`\n🗑️  Submissions to DELETE: ${deleteSubmissions.rows.length}`);
    deleteSubmissions.rows.forEach(sub => {
      console.log(`   • ID: ${sub.id}, User: ${sub.email}`);
    });
    
    // Confirm deletion
    if (deleteSubmissions.rows.length > 0) {
      console.log('\n⚠️  WARNING: This will permanently delete the above submissions!');
      console.log('🔄 Proceeding with deletion in 3 seconds...');
      
      // Wait 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Delete submissions
      const deleteResult = await pool.query(`
        DELETE FROM assignment_submissions 
        WHERE NOT (user_id = $1 AND DATE(submitted_at) = $2)
        RETURNING id
      `, [drewUserId, today]);
      
      console.log(`✅ Deleted ${deleteResult.rows.length} assignment submissions`);
    } else {
      console.log('✅ No submissions to delete');
    }
    
    // Verify final state
    const finalSubmissions = await pool.query(`
      SELECT 
        asub.id,
        asub.assignment_response_filename,
        asub.output_test_filename,
        asub.submitted_at,
        u.email
      FROM assignment_submissions asub
      JOIN users u ON asub.user_id = u.id
      ORDER BY asub.submitted_at DESC
    `);
    
    console.log(`\n📊 Final state: ${finalSubmissions.rows.length} assignment submissions remaining:`);
    finalSubmissions.rows.forEach(sub => {
      console.log(`   • ID: ${sub.id}, User: ${sub.email}, Submitted: ${sub.submitted_at}`);
    });
    
    console.log('\n✅ Cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run cleanup if this file is executed directly
if (require.main === module) {
  cleanupSubmissions();
}

module.exports = { cleanupSubmissions };
