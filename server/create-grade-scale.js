const { query } = require('./config/database');

async function createGradeScaleTable() {
  try {
    console.log('🔄 Creating grade_scales table...');
    
    // Create grade_scales table
    await query(`
      CREATE TABLE IF NOT EXISTS grade_scales (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        grade_letter VARCHAR(2) NOT NULL,
        min_percentage DECIMAL(5,2) NOT NULL,
        max_percentage DECIMAL(5,2) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT valid_percentage_range CHECK (min_percentage >= 0 AND max_percentage <= 100 AND min_percentage <= max_percentage),
        CONSTRAINT valid_grade_letter CHECK (grade_letter IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F')),
        
        UNIQUE(grade_letter)
      );
    `);
    
    console.log('✅ grade_scales table created successfully!');
    
    // Insert default grade scale
    await query(`
      INSERT INTO grade_scales (grade_letter, min_percentage, max_percentage) VALUES
      ('A+', 97.00, 100.00),
      ('A', 93.00, 96.99),
      ('A-', 90.00, 92.99),
      ('B+', 87.00, 89.99),
      ('B', 83.00, 86.99),
      ('B-', 80.00, 82.99),
      ('C+', 77.00, 79.99),
      ('C', 73.00, 76.99),
      ('C-', 70.00, 72.99),
      ('D+', 67.00, 69.99),
      ('D', 63.00, 66.99),
      ('D-', 60.00, 62.99),
      ('F', 0.00, 59.99)
      ON CONFLICT (grade_letter) DO NOTHING;
    `);
    
    console.log('✅ Default grade scale inserted successfully!');
    
    // Verify that grade_scales table exists and has data
    const result = await query(`
      SELECT grade_letter, min_percentage, max_percentage 
      FROM grade_scales 
      ORDER BY max_percentage DESC
    `);
    
    console.log('✅ Grade scale data:', result.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Grade scale creation failed:', error.message);
    process.exit(1);
  }
}

createGradeScaleTable();
