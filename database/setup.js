const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../server/.env' });

// Database configuration for setup (connects to postgres database first)
const setupConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: 'postgres', // Connect to default postgres database first
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
};

// Target database configuration
const targetConfig = {
  ...setupConfig,
  database: process.env.DB_NAME || 'labsyncpro'
};

async function createDatabase() {
  const pool = new Pool(setupConfig);
  
  try {
    console.log('🔍 Checking if database exists...');
    
    // Check if database exists
    const dbCheckResult = await pool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetConfig.database]
    );
    
    if (dbCheckResult.rows.length === 0) {
      console.log('📦 Creating database...');
      await pool.query(`CREATE DATABASE ${targetConfig.database}`);
      console.log('✅ Database created successfully');
    } else {
      console.log('✅ Database already exists');
    }
    
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function runInitScript() {
  const pool = new Pool(targetConfig);
  
  try {
    console.log('📜 Running initialization script...');
    
    // Read the init.sql file
    const initScript = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
    
    // Remove the \c command as we're already connected to the right database
    const cleanScript = initScript.replace(/\\c labsyncpro;/g, '');
    
    // Execute the script
    await pool.query(cleanScript);
    
    console.log('✅ Database initialization completed');
    
    // Verify tables were created
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 Created tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error running initialization script:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function testConnection() {
  const pool = new Pool(targetConfig);
  
  try {
    console.log('🔗 Testing database connection...');
    
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    
    console.log('✅ Connection successful!');
    console.log('📅 Current time:', result.rows[0].current_time);
    console.log('🗄️  Database version:', result.rows[0].db_version.split(' ')[0]);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function setupDatabase() {
  try {
    console.log('🚀 Starting LabSyncPro database setup...\n');
    
    // Step 1: Create database
    await createDatabase();
    console.log('');
    
    // Step 2: Run initialization script
    await runInitScript();
    console.log('');
    
    // Step 3: Test connection
    await testConnection();
    console.log('');
    
    console.log('🎉 Database setup completed successfully!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('  1. Update your .env file with the correct database credentials');
    console.log('  2. Start the server with: npm run dev');
    console.log('  3. Access the application at: http://localhost:5173');
    console.log('');
    console.log('👤 Default accounts:');
    console.log('  Admin: admin@labsyncpro.com / admin123');
    console.log('  Instructor: instructor@labsyncpro.com / instructor123');
    
  } catch (error) {
    console.error('\n💥 Database setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('  1. Make sure PostgreSQL is running');
    console.log('  2. Check your database credentials in .env file');
    console.log('  3. Ensure the database user has CREATE DATABASE privileges');
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = {
  createDatabase,
  runInitScript,
  testConnection,
  setupDatabase
};
