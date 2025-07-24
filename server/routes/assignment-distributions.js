const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get all assignment distributions
router.get('/', authenticateToken, async (req, res) => {
  try {
    // First, clean up any distributions for non-published assignments
    const cleanupResult = await query(`
      DELETE FROM assignment_distributions
      WHERE assignment_id IN (
        SELECT id FROM created_assignments
        WHERE status != 'published'
      )
      RETURNING id
    `);

    if (cleanupResult.rows.length > 0) {
      console.log(`Cleaned up ${cleanupResult.rows.length} distributions for non-published assignments`);
    }

    const distributions = await query(`
      SELECT
        ad.id,
        ad.assignment_id,
        ca.name as assignment_name,
        ca.description as assignment_description,
        ca.pdf_filename,
        ca.status as assignment_status,
        ad.class_id,
        c.name as class_name,
        ad.assignment_type,
        ad.group_id,
        g.name as group_name,
        ad.user_id,
        CONCAT(u.first_name, ' ', u.last_name) as student_name,
        ad.scheduled_date,
        ad.deadline,
        ad.status,
        ad.assigned_at,
        CONCAT(instructor.first_name, ' ', instructor.last_name) as instructor_name
      FROM assignment_distributions ad
      INNER JOIN created_assignments ca ON ad.assignment_id = ca.id
      LEFT JOIN classes c ON ad.class_id = c.id
      LEFT JOIN groups g ON ad.group_id = g.id
      LEFT JOIN users u ON ad.user_id = u.id
      LEFT JOIN users instructor ON ca.created_by = instructor.id
      WHERE ca.status = 'published'
      ORDER BY ad.assigned_at DESC
    `);

    // Map the data to match frontend expectations (camelCase)
    const mappedDistributions = distributions.rows.map(distribution => ({
      id: distribution.id,
      assignmentId: distribution.assignment_id,
      assignmentName: distribution.assignment_name,
      assignmentDescription: distribution.assignment_description,
      pdfFileName: distribution.pdf_filename,
      assignmentStatus: distribution.assignment_status,
      classId: distribution.class_id,
      className: distribution.class_name,
      assignmentType: distribution.assignment_type,
      groupId: distribution.group_id,
      groupName: distribution.group_name,
      userId: distribution.user_id,
      studentName: distribution.student_name,
      scheduledDate: distribution.scheduled_date,
      deadline: distribution.deadline,
      status: distribution.status,
      assignedAt: distribution.assigned_at,
      instructorName: distribution.instructor_name
    }));

    res.json({
      success: true,
      distributions: mappedDistributions
    });
  } catch (error) {
    console.error('Error fetching assignment distributions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assignment distributions'
    });
  }
});

// Create new assignment distribution
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      assignmentId,
      classId,
      assignmentType,
      groupIds,
      userIds,
      scheduledDate,
      deadline
    } = req.body;

    if (!assignmentId || !classId || !assignmentType || !scheduledDate || !deadline) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Check if assignment is published
    const assignmentCheck = await query(`
      SELECT status FROM created_assignments WHERE id = $1
    `, [assignmentId]);

    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    if (assignmentCheck.rows[0].status !== 'published') {
      return res.status(400).json({
        success: false,
        error: 'Only published assignments can be distributed to students'
      });
    }

    const distributions = [];

    if (assignmentType === 'class') {
      // Assign to entire class
      const result = await query(`
        INSERT INTO assignment_distributions (
          assignment_id, class_id, assignment_type, scheduled_date, deadline, status, assigned_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id
      `, [assignmentId, classId, assignmentType, scheduledDate, deadline, 'assigned']);
      
      distributions.push(result.rows[0]);
    } else if (assignmentType === 'group' && groupIds && groupIds.length > 0) {
      // Assign to selected groups
      for (const groupId of groupIds) {
        const result = await query(`
          INSERT INTO assignment_distributions (
            assignment_id, class_id, assignment_type, group_id, scheduled_date, deadline, status, assigned_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          RETURNING id
        `, [assignmentId, classId, assignmentType, groupId, scheduledDate, deadline, 'assigned']);
        
        distributions.push(result.rows[0]);
      }
    } else if (assignmentType === 'individual' && userIds && userIds.length > 0) {
      // Assign to selected students
      for (const userId of userIds) {
        const result = await query(`
          INSERT INTO assignment_distributions (
            assignment_id, class_id, assignment_type, user_id, scheduled_date, deadline, status, assigned_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          RETURNING id
        `, [assignmentId, classId, assignmentType, userId, scheduledDate, deadline, 'assigned']);
        
        distributions.push(result.rows[0]);
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid assignment type or missing target selection'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Assignment distributions created successfully',
      distributions
    });
  } catch (error) {
    console.error('Error creating assignment distributions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create assignment distributions'
    });
  }
});

// Update assignment distribution
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledDate, deadline, status } = req.body;

    const result = await query(`
      UPDATE assignment_distributions 
      SET scheduled_date = $1, deadline = $2, status = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING id
    `, [scheduledDate, deadline, status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Assignment distribution not found'
      });
    }

    res.json({
      success: true,
      message: 'Assignment distribution updated successfully'
    });
  } catch (error) {
    console.error('Error updating assignment distribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update assignment distribution'
    });
  }
});

// Delete assignment distribution
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      DELETE FROM assignment_distributions WHERE id = $1
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Assignment distribution not found'
      });
    }

    res.json({
      success: true,
      message: 'Assignment distribution deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting assignment distribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete assignment distribution'
    });
  }
});

module.exports = router;
