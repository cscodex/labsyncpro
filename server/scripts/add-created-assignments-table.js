const { query } = require('../config/database');

async function addCreatedAssignmentsTable() {
  try {
    console.log('Creating created_assignments table...');
    
    await query(`
      CREATE TABLE IF NOT EXISTS created_assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        pdf_filename VARCHAR(255),
        pdf_file_size INTEGER,
        creation_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
        created_by UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Creating indexes for created_assignments...');
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_created_assignments_created_by ON created_assignments(created_by)
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_created_assignments_status ON created_assignments(status)
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_created_assignments_creation_date ON created_assignments(creation_date)
    `);
    
    console.log('Creating trigger for created_assignments...');

    // Check if trigger exists first
    const triggerExists = await query(`
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'update_created_assignments_updated_at'
    `);

    if (triggerExists.rows.length === 0) {
      await query(`
        CREATE TRIGGER update_created_assignments_updated_at
        BEFORE UPDATE ON created_assignments
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);
    } else {
      console.log('Trigger already exists, skipping...');
    }
    
    console.log('created_assignments table and related objects created successfully!');
    
  } catch (error) {
    console.error('Error creating created_assignments table:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  addCreatedAssignmentsTable()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addCreatedAssignmentsTable;
