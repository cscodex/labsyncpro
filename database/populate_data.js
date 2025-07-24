#!/usr/bin/env node

/**
 * LabSyncPro Database Population Script
 * Populates the database with comprehensive sample data for all entities
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'labsyncpro',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

async function populateDatabase() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🚀 Starting LabSyncPro database population...\n');
    
    // Test connection
    console.log('📡 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    client.release();
    
    // Read and execute comprehensive seed data
    console.log('\n📊 Loading comprehensive seed data...');
    const seedPath = path.join(__dirname, 'comprehensive_seed.sql');
    
    if (!fs.existsSync(seedPath)) {
      throw new Error(`Seed file not found: ${seedPath}`);
    }
    
    const seedSQL = fs.readFileSync(seedPath, 'utf8');
    console.log('✅ Seed file loaded successfully');
    
    // Execute the seed data
    console.log('\n🌱 Populating database with sample data...');
    console.log('   This may take a few moments...');
    
    await pool.query(seedSQL);
    console.log('✅ Database populated successfully');
    
    // Verify data insertion
    console.log('\n🔍 Verifying data insertion...');
    
    const verificationQueries = [
      { name: 'Labs', query: 'SELECT COUNT(*) FROM labs' },
      { name: 'Computers', query: 'SELECT COUNT(*) FROM computers' },
      { name: 'Seats', query: 'SELECT COUNT(*) FROM seats' },
      { name: 'Users', query: 'SELECT COUNT(*) FROM users' },
      { name: 'Classes', query: 'SELECT COUNT(*) FROM classes' },
      { name: 'Students', query: 'SELECT COUNT(*) FROM users WHERE role = \'student\'' },
      { name: 'Instructors', query: 'SELECT COUNT(*) FROM users WHERE role = \'instructor\'' },
      { name: 'Groups', query: 'SELECT COUNT(*) FROM groups' },
      { name: 'Group Members', query: 'SELECT COUNT(*) FROM group_members' },
      { name: 'Class Enrollments', query: 'SELECT COUNT(*) FROM class_enrollments' },
      { name: 'Schedules', query: 'SELECT COUNT(*) FROM schedules' },
      { name: 'Assignments', query: 'SELECT COUNT(*) FROM assignments' },
      { name: 'Submissions', query: 'SELECT COUNT(*) FROM submissions' },
      { name: 'Grades', query: 'SELECT COUNT(*) FROM grades' },
    ];
    
    for (const { name, query } of verificationQueries) {
      try {
        const result = await pool.query(query);
        const count = parseInt(result.rows[0].count);
        console.log(`   ${name}: ${count} records`);
      } catch (error) {
        console.log(`   ${name}: Error - ${error.message}`);
      }
    }
    
    console.log('\n🎉 Database population completed successfully!');
    console.log('\n📋 Sample Data Summary:');
    console.log('   • 4 Computer Labs with equipment');
    console.log('   • 12 Classes across grades 11-12');
    console.log('   • 6 Instructors + 1 Admin user');
    console.log('   • 40+ Students with 8-digit IDs');
    console.log('   • Student groups (3-4 members each)');
    console.log('   • Lab schedules (past, current, future)');
    console.log('   • Assignments with submissions and grades');
    console.log('   • Seat and computer assignments');
    
    console.log('\n🔐 Login Credentials:');
    console.log('   Admin: admin@labsyncpro.com / admin123');
    console.log('   Instructor: dr.sarah.johnson@school.edu / password123');
    console.log('   Student: alice.johnson@student.edu / password123');
    console.log('   (All users have password: password123)');
    
    console.log('\n✨ Ready to use LabSyncPro with comprehensive sample data!');
    
  } catch (error) {
    console.error('\n❌ Error populating database:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle command line execution
if (require.main === module) {
  populateDatabase().catch(console.error);
}

module.exports = { populateDatabase };
