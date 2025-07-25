const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const FileUploadService = require('../services/fileUploadService');

// No file upload needed for text-based assignments

// Get all created assignments
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;

    let whereClause = '';
    let queryParams = [];

    if (status) {
      whereClause = 'WHERE ca.status = $1';
      queryParams.push(status);
    }

    const assignments = await query(`
      SELECT
        ca.id,
        ca.name,
        ca.description,
        ca.pdf_filename,
        ca.pdf_file_size,
        ca.creation_date,
        ca.status,
        ca.created_at,
        ca.updated_at,
        CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
        u.id as created_by
      FROM created_assignments ca
      LEFT JOIN users u ON ca.created_by = u.id
      ${whereClause}
      ORDER BY ca.created_at DESC
    `, queryParams);

    // Map the data to match frontend expectations (camelCase)
    const mappedAssignments = assignments.rows.map(assignment => ({
      id: assignment.id,
      name: assignment.name,
      description: assignment.description,
      pdfFileName: assignment.pdf_filename,
      pdfFileSize: assignment.pdf_file_size,
      creationDate: assignment.creation_date,
      status: assignment.status,
      createdAt: assignment.created_at,
      updatedAt: assignment.updated_at,
      instructorName: assignment.instructor_name,
      createdBy: assignment.created_by
    }));

    res.json({
      success: true,
      assignments: mappedAssignments
    });
  } catch (error) {
    console.error('Error fetching created assignments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assignments'
    });
  }
});

// Create a new text-based assignment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      status,
      assignment_content,
      expected_output,
      programming_language,
      difficulty_level,
      time_limit_minutes,
      max_attempts
    } = req.body;
    const userId = req.user?.id;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Assignment name is required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Create text-based assignment
    const result = await query(`
      INSERT INTO created_assignments (
        name,
        description,
        assignment_content,
        expected_output,
        programming_language,
        difficulty_level,
        time_limit_minutes,
        max_attempts,
        creation_date,
        status,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      name,
      description || null,
      assignment_content || 'Assignment content will be provided by instructor',
      expected_output || null,
      programming_language || 'python',
      difficulty_level || 'beginner',
      time_limit_minutes || 60,
      max_attempts || 3,
      new Date().toISOString().split('T')[0],
      status || 'draft',
      userId
    ]);

    const assignment = result.rows[0];

    res.status(201).json({
      success: true,
      assignment: assignment,
      message: 'Text-based assignment created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create assignment'
    });
  }
});

// Update an assignment
router.put('/:id', authenticateToken, upload.single('pdf_file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;
    const userId = req.user.id;

    // Check if assignment exists and user has permission
    const existingAssignment = await query(`
      SELECT * FROM created_assignments 
      WHERE id = $1 AND (created_by = $2 OR $3 = 'admin')
    `, [id, userId, req.user.role]);

    if (existingAssignment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found or access denied'
      });
    }

    let updateFields = [];
    let updateValues = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(name);
      paramIndex++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description);
      paramIndex++;
    }

    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push(status);
      paramIndex++;
    }

    // Handle file upload
    if (req.file) {
      // Delete old file if it exists
      const oldAssignment = existingAssignment.rows[0];
      if (oldAssignment.pdf_filename) {
        const oldFilePath = path.join('uploads/assignments', oldAssignment.pdf_filename);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      updateFields.push(`pdf_filename = $${paramIndex}`);
      updateValues.push(req.file.filename);
      paramIndex++;

      updateFields.push(`pdf_file_size = $${paramIndex}`);
      updateValues.push(req.file.size);
      paramIndex++;
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    const updateQuery = `
      UPDATE created_assignments 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);

    // Handle assignment distributions based on status change
    if (status !== undefined) {
      const oldStatus = existingAssignment.rows[0].status;
      const newStatus = status;

      console.log(`Assignment ${id} status change: ${oldStatus} -> ${newStatus}`);

      // If assignment is changed to draft or archived, remove all distributions
      if ((newStatus === 'draft' || newStatus === 'archived') && oldStatus === 'published') {
        const deleteResult = await query(`
          DELETE FROM assignment_distributions
          WHERE assignment_id = $1
          RETURNING id
        `, [id]);

        console.log(`Removed ${deleteResult.rows.length} distributions for assignment ${id} due to status change to ${newStatus}`);
      } else if (newStatus === 'draft' || newStatus === 'archived') {
        // Also remove distributions if changing from any status to draft/archived
        const deleteResult = await query(`
          DELETE FROM assignment_distributions
          WHERE assignment_id = $1
          RETURNING id
        `, [id]);

        console.log(`Removed ${deleteResult.rows.length} distributions for assignment ${id} due to status change to ${newStatus} (from ${oldStatus})`);
      }
    }

    res.json({
      success: true,
      assignment: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update assignment'
    });
  }
});

// Delete an assignment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if assignment exists and user has permission
    const existingAssignment = await query(`
      SELECT * FROM created_assignments 
      WHERE id = $1 AND (created_by = $2 OR $3 = 'admin')
    `, [id, userId, req.user.role]);

    if (existingAssignment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found or access denied'
      });
    }

    // Delete associated file
    const assignment = existingAssignment.rows[0];
    if (assignment.pdf_filename) {
      const filePath = path.join('uploads/assignments', assignment.pdf_filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete assignment from database
    await query('DELETE FROM created_assignments WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete assignment'
    });
  }
});

// Download assignment PDF
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await query(`
      SELECT pdf_filename, name FROM created_assignments WHERE id = $1
    `, [id]);

    if (assignment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    const assignmentData = assignment.rows[0];
    if (!assignmentData.pdf_filename) {
      return res.status(404).json({
        success: false,
        error: 'No PDF file found for this assignment'
      });
    }

    const filePath = path.join('uploads/assignments', assignmentData.pdf_filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'PDF file not found on server'
      });
    }

    res.download(filePath, `${assignmentData.name}.pdf`);
  } catch (error) {
    console.error('Error downloading assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download assignment'
    });
  }
});

module.exports = router;
