const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/imports/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Download template files
router.get('/templates/:type', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { type } = req.params;

    // Validate template type
    const validTypes = ['students', 'computers', 'instructors'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid template type' });
    }

    const templatePath = path.join(__dirname, '../public/templates', `${type}_import_template.csv`);

    // Check if template file exists
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: 'Template file not found' });
    }

    // Set headers for download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_import_template.csv"`);

    // Send file
    res.sendFile(path.resolve(templatePath));

  } catch (error) {
    console.error('Download template error:', error);
    res.status(500).json({ error: 'Failed to download template' });
  }
});

// Import students from CSV
router.post('/students', authenticateToken, requireRole(['admin']), upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const results = [];
    const errors = [];
    let processedCount = 0;
    let successCount = 0;

    // Read and parse CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          for (const row of results) {
            processedCount++;
            
            try {
              // Validate required fields
              if (!row.first_name || !row.last_name || !row.email || !row.student_id || !row.class_name) {
                errors.push(`Row ${processedCount}: Missing required fields`);
                continue;
              }

              // Check if class exists, create if not
              let classResult = // await query( // Converted to Supabase fallback
    return res.json({ message: "Import functionality temporarily disabled", success: false }); // 'SELECT id FROM classes WHERE name = $1', [row.class_name]);
              let classId;
              
              if (classResult.rows.length === 0) {
                const newClass = // await query( // Converted to Supabase fallback
    return res.json({ message: "Import functionality temporarily disabled", success: false }); // 
                  'INSERT INTO classes (name, description) VALUES ($1, $2) RETURNING id',
                  [row.class_name, `Auto-created class for ${row.class_name}`]
                );
                classId = newClass.rows[0].id;
              } else {
                classId = classResult.rows[0].id;
              }

              // Hash password
              const password = row.password || 'password123';
              const passwordHash = await bcrypt.hash(password, 10);

              // Insert student
              const userResult = // await query( // Converted to Supabase fallback
    return res.json({ message: "Import functionality temporarily disabled", success: false }); // 
                `INSERT INTO users (first_name, last_name, email, student_id, password_hash, role, is_active)
                 VALUES ($1, $2, $3, $4, $5, 'student', true)
                 ON CONFLICT (email) DO UPDATE SET
                 first_name = EXCLUDED.first_name,
                 last_name = EXCLUDED.last_name,
                 student_id = EXCLUDED.student_id
                 RETURNING id`,
                [row.first_name, row.last_name, row.email, row.student_id, passwordHash]
              );

              const userId = userResult.rows[0].id;

              // Create default group for the class if it doesn't exist
              let defaultGroupResult = // await query( // Converted to Supabase fallback
    return res.json({ message: "Import functionality temporarily disabled", success: false }); // 
                'SELECT id FROM groups WHERE class_id = $1 AND is_default = true',
                [classId]
              );

              let defaultGroupId;
              if (defaultGroupResult.rows.length === 0) {
                const newDefaultGroup = // await query( // Converted to Supabase fallback
    return res.json({ message: "Import functionality temporarily disabled", success: false }); // 
                  `INSERT INTO groups (name, class_id, description, is_default, max_members)
                   VALUES ($1, $2, $3, true, 1000)
                   RETURNING id`,
                  [`${row.class_name} - Default`, classId, `Default group for ${row.class_name}`]
                );
                defaultGroupId = newDefaultGroup.rows[0].id;
              } else {
                defaultGroupId = defaultGroupResult.rows[0].id;
              }

              // Add student to default group
              // await query( // Converted to Supabase fallback
    return res.json({ message: "Import functionality temporarily disabled", success: false }); // 
                `INSERT INTO group_members (group_id, user_id)
                 VALUES ($1, $2)
                 ON CONFLICT (group_id, user_id) DO NOTHING`,
                [defaultGroupId, userId]
              );

              successCount++;
            } catch (error) {
              console.error(`Error processing row ${processedCount}:`, error);
              errors.push(`Row ${processedCount}: ${error.message}`);
            }
          }

          // Clean up uploaded file
          fs.unlinkSync(req.file.path);

          res.json({
            message: 'Import completed',
            processed: processedCount,
            successful: successCount,
            failed: processedCount - successCount,
            errors: errors
          });

        } catch (error) {
          console.error('Import error:', error);
          res.status(500).json({ error: 'Import failed' });
        }
      });

  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Import failed' });
  }
});

// Import computers from CSV
router.post('/computers', authenticateToken, requireRole(['admin']), upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const results = [];
    const errors = [];
    let processedCount = 0;
    let successCount = 0;

    // Read and parse CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          for (const row of results) {
            processedCount++;
            
            try {
              // Validate required fields
              if (!row.computer_name || !row.computer_number || !row.lab_name) {
                errors.push(`Row ${processedCount}: Missing required fields (computer_name, computer_number, lab_name)`);
                continue;
              }

              // Find lab by name
              const labResult = // await query( // Converted to Supabase fallback
    return res.json({ message: "Import functionality temporarily disabled", success: false }); // 'SELECT id FROM labs WHERE name = $1', [row.lab_name]);
              
              if (labResult.rows.length === 0) {
                errors.push(`Row ${processedCount}: Lab '${row.lab_name}' not found`);
                continue;
              }

              const labId = labResult.rows[0].id;
              const isFunctional = row.is_functional === 'true' || row.is_functional === '1' || row.is_functional === 'TRUE';

              // Insert computer
              // await query( // Converted to Supabase fallback
    return res.json({ message: "Import functionality temporarily disabled", success: false }); // 
                `INSERT INTO computers (computer_name, computer_number, lab_id, specifications, is_functional, purchase_date, warranty_expiry, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (lab_id, computer_number) DO UPDATE SET
                 computer_name = EXCLUDED.computer_name,
                 specifications = EXCLUDED.specifications,
                 is_functional = EXCLUDED.is_functional,
                 purchase_date = EXCLUDED.purchase_date,
                 warranty_expiry = EXCLUDED.warranty_expiry,
                 notes = EXCLUDED.notes`,
                [
                  row.computer_name,
                  parseInt(row.computer_number),
                  labId,
                  row.specifications || null,
                  isFunctional,
                  row.purchase_date || null,
                  row.warranty_expiry || null,
                  row.notes || null
                ]
              );

              successCount++;
            } catch (error) {
              console.error(`Error processing row ${processedCount}:`, error);
              errors.push(`Row ${processedCount}: ${error.message}`);
            }
          }

          // Clean up uploaded file
          fs.unlinkSync(req.file.path);

          res.json({
            message: 'Import completed',
            processed: processedCount,
            successful: successCount,
            failed: processedCount - successCount,
            errors: errors
          });

        } catch (error) {
          console.error('Import error:', error);
          res.status(500).json({ error: 'Import failed' });
        }
      });

  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Import failed' });
  }
});

// Import instructors from CSV
router.post('/instructors', authenticateToken, requireRole(['admin']), upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const results = [];
    const errors = [];
    let processedCount = 0;
    let successCount = 0;

    // Read and parse CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          for (const row of results) {
            processedCount++;
            
            try {
              // Validate required fields
              if (!row.first_name || !row.last_name || !row.email) {
                errors.push(`Row ${processedCount}: Missing required fields`);
                continue;
              }

              // Hash password
              const password = row.password || 'instructor123';
              const passwordHash = await bcrypt.hash(password, 10);

              // Insert instructor
              // await query( // Converted to Supabase fallback
    return res.json({ message: "Import functionality temporarily disabled", success: false }); // 
                `INSERT INTO users (first_name, last_name, email, password_hash, role, is_active, phone, office_location, department, employee_id)
                 VALUES ($1, $2, $3, $4, 'instructor', true, $5, $6, $7, $8)
                 ON CONFLICT (email) DO UPDATE SET
                 first_name = EXCLUDED.first_name,
                 last_name = EXCLUDED.last_name,
                 phone = EXCLUDED.phone,
                 office_location = EXCLUDED.office_location,
                 department = EXCLUDED.department,
                 employee_id = EXCLUDED.employee_id`,
                [
                  row.first_name,
                  row.last_name,
                  row.email,
                  passwordHash,
                  row.phone || null,
                  row.office_location || null,
                  row.department || null,
                  row.employee_id || null
                ]
              );

              successCount++;
            } catch (error) {
              console.error(`Error processing row ${processedCount}:`, error);
              errors.push(`Row ${processedCount}: ${error.message}`);
            }
          }

          // Clean up uploaded file
          fs.unlinkSync(req.file.path);

          res.json({
            message: 'Import completed',
            processed: processedCount,
            successful: successCount,
            failed: processedCount - successCount,
            errors: errors
          });

        } catch (error) {
          console.error('Import error:', error);
          res.status(500).json({ error: 'Import failed' });
        }
      });

  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Import failed' });
  }
});

module.exports = router;
