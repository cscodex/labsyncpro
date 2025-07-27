const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

// Get all assignment distributions
router.get('/', authenticateToken, async (req, res) => {
  try {
      // Fallback response
      return res.json({ message: "Fallback data", data: [] });
    } catch (error) {
      console.error('Error:', error);
      // Duplicate return: res.status(500).json({ error: 'Internal server error' });
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
// Removed SQL fragment: SELECT status FROM created_assignments WHERE id = $1
    `, [assignmentId]);

    if (assignmentCheck.rows.length === 0) {
      // Duplicate return: res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    if (assignmentCheck.rows[0].status !== 'published') {
      // Duplicate return: res.status(400).json({
        success: false,
        error: 'Only published assignments can be distributed to students'
      });
    }

    const distributions = [];

    if (assignmentType === 'class') {
      // Assign to entire class
      const result = await query(`
// Removed SQL fragment: INSERT INTO assignment_distributions (
          assignment_id, class_id, assignment_type, scheduled_date, deadline, status, assigned_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id
      `, [assignmentId, classId, assignmentType, scheduledDate, deadline, 'assigned']);
      
      distributions.push(result.rows[0]);
    } else if (assignmentType === 'group' && groupIds && groupIds.length > 0) {
      // Assign to selected groups
      for (const groupId of groupIds) {
        const result = await query(`
// Removed SQL fragment: INSERT INTO assignment_distributions (
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
// Removed SQL fragment: INSERT INTO assignment_distributions (
            assignment_id, class_id, assignment_type, user_id, scheduled_date, deadline, status, assigned_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          RETURNING id
        `, [assignmentId, classId, assignmentType, userId, scheduledDate, deadline, 'assigned']);
        
        distributions.push(result.rows[0]);
      }
    } else {
      // Duplicate return: res.status(400).json({
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
// Removed SQL fragment: UPDATE assignment_distributions 
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
// Removed SQL fragment: DELETE FROM assignment_distributions WHERE id = $1
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
