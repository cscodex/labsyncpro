const { Pool } = require('pg');
require('dotenv').config();

class DatabaseConnectionTester {
  constructor() {
    this.configs = [];
  }

  // Test Supabase connection
  async testSupabaseConnection() {
    console.log('🔍 Testing Supabase connection...');
    
    const config = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: {
        rejectUnauthorized: false
      }
    };

    console.log('📋 Connection config:');
    console.log(`   Host: ${config.host}`);
    console.log(`   Port: ${config.port}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.user}`);
    console.log(`   Password: ${config.password ? '***' + config.password.slice(-3) : 'NOT SET'}`);

    if (config.password === '[YOUR-PASSWORD]' || !config.password) {
      console.log('❌ Password not set! Please update your .env file with the real Supabase password.');
      return false;
    }

    try {
      const pool = new Pool(config);
      const client = await pool.connect();
      
      // Test basic connection
      const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
      console.log('✅ Supabase connection successful!');
      console.log(`   Time: ${result.rows[0].current_time}`);
      console.log(`   Version: ${result.rows[0].postgres_version.split(' ')[0]}`);
      
      client.release();
      await pool.end();
      return true;
      
    } catch (error) {
      console.log('❌ Supabase connection failed:');
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      
      if (error.code === '28P01') {
        console.log('   💡 This is an authentication error. Check your password.');
      } else if (error.code === 'ENOTFOUND') {
        console.log('   💡 This is a network error. Check your host URL.');
      }
      
      return false;
    }
  }

  // Test local PostgreSQL connection
  async testLocalConnection() {
    console.log('\n🔍 Testing local PostgreSQL connection...');
    
    const localConfigs = [
      {
        name: 'Default local',
        host: 'localhost',
        port: 5432,
        database: 'labsyncpro',
        user: 'postgres',
        password: 'password'
      },
      {
        name: 'XAMPP PostgreSQL',
        host: 'localhost',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: ''
      },
      {
        name: 'Homebrew PostgreSQL',
        host: 'localhost',
        port: 5432,
        database: 'postgres',
        user: process.env.USER || 'postgres',
        password: ''
      }
    ];

    for (let config of localConfigs) {
      try {
        console.log(`\n   Testing ${config.name}...`);
        const pool = new Pool(config);
        const client = await pool.connect();
        
        const result = await client.query('SELECT NOW() as current_time');
        console.log(`   ✅ ${config.name} connection successful!`);
        console.log(`      Host: ${config.host}:${config.port}`);
        console.log(`      Database: ${config.database}`);
        console.log(`      User: ${config.user}`);
        
        // Check if our tables exist
        const tablesResult = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('created_assignments', 'submissions', 'users')
        `);
        
        if (tablesResult.rows.length > 0) {
          console.log(`      📋 Found LabSyncPro tables: ${tablesResult.rows.map(r => r.table_name).join(', ')}`);
        } else {
          console.log(`      📋 No LabSyncPro tables found (empty database)`);
        }
        
        client.release();
        await pool.end();
        return config;
        
      } catch (error) {
        console.log(`   ❌ ${config.name} failed: ${error.message}`);
      }
    }
    
    return null;
  }

  // Check what databases exist
  async listDatabases(config) {
    try {
      console.log('\n📋 Available databases:');
      const pool = new Pool({...config, database: 'postgres'});
      const client = await pool.connect();
      
      const result = await client.query(`
        SELECT datname 
        FROM pg_database 
        WHERE datistemplate = false 
        ORDER BY datname
      `);
      
      result.rows.forEach(row => {
        console.log(`   - ${row.datname}`);
      });
      
      client.release();
      await pool.end();
      
    } catch (error) {
      console.log(`   Error listing databases: ${error.message}`);
    }
  }

  // Generate .env configuration
  generateEnvConfig(config) {
    console.log('\n📝 Suggested .env configuration:');
    console.log('# Database Configuration');
    console.log(`DB_HOST=${config.host}`);
    console.log(`DB_PORT=${config.port}`);
    console.log(`DB_NAME=${config.database}`);
    console.log(`DB_USER=${config.user}`);
    console.log(`DB_PASSWORD=${config.password}`);
  }

  // Run all tests
  async runTests() {
    console.log('🔍 DATABASE CONNECTION TESTER');
    console.log('=' .repeat(40));

    // Test Supabase first
    const supabaseWorking = await this.testSupabaseConnection();
    
    if (supabaseWorking) {
      console.log('\n🎉 Supabase connection is working! You can proceed with the database analysis.');
      return 'supabase';
    }

    // Test local connections
    const localConfig = await this.testLocalConnection();
    
    if (localConfig) {
      console.log('\n🎉 Local PostgreSQL connection found!');
      this.generateEnvConfig(localConfig);
      await this.listDatabases(localConfig);
      return 'local';
    }

    console.log('\n❌ No working database connections found.');
    console.log('\n💡 Next steps:');
    console.log('   1. For Supabase: Get your real password and update .env');
    console.log('   2. For local: Install PostgreSQL or use Docker');
    console.log('   3. Create the database schema using the provided SQL files');
    
    return null;
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new DatabaseConnectionTester();
  tester.runTests()
    .then((result) => {
      if (result) {
        console.log(`\n✅ Database connection test completed: ${result}`);
      } else {
        console.log('\n❌ No database connections available');
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('Database connection test failed:', error);
      process.exit(1);
    });
}

module.exports = DatabaseConnectionTester;
