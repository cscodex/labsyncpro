const { Pool } = require('pg');
const { supabase, testSupabaseConnection } = require('./supabase');
require('dotenv').config();

// Database configuration
const dbConfig = process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
} : {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'labsyncpro',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.DB_HOST && process.env.DB_HOST.includes('supabase.co') ? {
    rejectUnauthorized: false
  } : false
};

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test database connection
const testConnection = async () => {
  try {
    // Test Supabase connection first if using Supabase
    if (process.env.SUPABASE_URL) {
      const supabaseConnected = await testSupabaseConnection();
      if (!supabaseConnected) {
        console.log('⚠️ Supabase connection failed, falling back to direct PostgreSQL...');
      } else {
        console.log('🚀 Using Supabase as database provider');
      }
    }

    // Test PostgreSQL connection
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');

    // Test query
    const result = await client.query('SELECT NOW()');
    console.log('📅 Database time:', result.rows[0].now);

    client.release();
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
};

// Query helper function with logging
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Query executed:', {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rows: res.rowCount
      });
    }

    return res;
  } catch (err) {
    const duration = Date.now() - start;
    console.error('❌ Query error:', {
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      duration: `${duration}ms`,
      error: err.message
    });
    throw err;
  }
};

// Transaction helper function
const transaction = async (callback) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Initialize database connection test
testConnection();

module.exports = {
  pool,
  supabase, // Export Supabase client
  query,
  transaction,
  testConnection,
  testSupabaseConnection
};
