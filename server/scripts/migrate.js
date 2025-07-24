const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'labsyncpro',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schemaSQL);
    console.log('✅ Database schema created successfully');
    
    console.log('🎉 Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function runSeeds() {
  try {
    console.log('🌱 Running database seeds...');
    
    // Read and execute seed.sql
    const seedPath = path.join(__dirname, '../../database/seed.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf8');
    
    await pool.query(seedSQL);
    console.log('✅ Database seeded successfully');
    
    console.log('🎉 Seeding completed successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Check command line arguments
const command = process.argv[2];

if (command === 'seed') {
  runSeeds();
} else {
  runMigrations();
}
