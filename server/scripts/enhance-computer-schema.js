const { Pool } = require('pg');
require('dotenv').config();

const config = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'labsyncpro',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
};

async function enhanceComputerSchema() {
  const pool = new Pool(config);
  
  try {
    console.log('🔧 Enhancing computer schema...');
    
    // Check if status column already exists
    const statusCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'computers' AND column_name = 'status'
    `);
    
    if (statusCheck.rows.length === 0) {
      console.log('📦 Adding status column to computers table...');
      
      // Add new columns for enhanced computer state management
      await pool.query(`
        ALTER TABLE computers 
        ADD COLUMN status VARCHAR(20) DEFAULT 'functional' 
        CHECK (status IN ('functional', 'in_repair', 'maintenance', 'retired', 'offline')),
        ADD COLUMN condition_notes TEXT,
        ADD COLUMN last_maintenance_date DATE,
        ADD COLUMN next_maintenance_date DATE,
        ADD COLUMN purchase_date DATE,
        ADD COLUMN warranty_expiry DATE,
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      
      console.log('✅ Status column added successfully');
      
      // Update existing records based on is_functional
      console.log('📝 Updating existing computer statuses...');
      await pool.query(`
        UPDATE computers 
        SET status = CASE 
          WHEN is_functional = true THEN 'functional'
          WHEN is_functional = false THEN 'maintenance'
        END
      `);
      
      console.log('✅ Existing computer statuses updated');
      
    } else {
      console.log('✅ Status column already exists');
    }
    
    // Create computer maintenance log table
    const maintenanceLogCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'computer_maintenance_logs'
      );
    `);
    
    if (!maintenanceLogCheck.rows[0].exists) {
      console.log('📦 Creating computer maintenance logs table...');
      
      await pool.query(`
        CREATE TABLE computer_maintenance_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          computer_id UUID NOT NULL REFERENCES computers(id) ON DELETE CASCADE,
          maintenance_type VARCHAR(50) NOT NULL CHECK (maintenance_type IN (
            'routine_maintenance', 'repair', 'upgrade', 'inspection', 'cleaning', 'software_update'
          )),
          description TEXT NOT NULL,
          performed_by UUID REFERENCES users(id),
          performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          cost DECIMAL(10,2),
          parts_replaced JSONB DEFAULT '[]',
          before_status VARCHAR(20),
          after_status VARCHAR(20),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('✅ Computer maintenance logs table created');
    } else {
      console.log('✅ Computer maintenance logs table already exists');
    }
    
    // Create indexes for better performance
    console.log('📊 Creating indexes...');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_computers_status ON computers(status);
      CREATE INDEX IF NOT EXISTS idx_computers_lab_status ON computers(lab_id, status);
      CREATE INDEX IF NOT EXISTS idx_maintenance_logs_computer ON computer_maintenance_logs(computer_id);
      CREATE INDEX IF NOT EXISTS idx_maintenance_logs_date ON computer_maintenance_logs(performed_at);
    `);
    
    console.log('✅ Indexes created successfully');
    
    console.log('🎉 Computer schema enhancement completed successfully!');
    
  } catch (error) {
    console.error('❌ Error enhancing computer schema:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the enhancement
if (require.main === module) {
  enhanceComputerSchema()
    .then(() => {
      console.log('✅ Schema enhancement completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Schema enhancement failed:', error);
      process.exit(1);
    });
}

module.exports = { enhanceComputerSchema };
