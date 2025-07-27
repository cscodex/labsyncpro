const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireInstructor, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all classes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { grade, stream, labId } = req.query;

    let query = supabase.from('classes').select('*');

    if (grade) {
      query = query.eq('grade', parseInt(grade));
    }

    if (stream) {
      query = query.eq('stream', stream);
    }

    const { data: classes, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Get classes error:', error);
      return res.status(500).json({ error: 'Failed to fetch classes' });
    }

    res.json({
      message: 'Classes retrieved successfully',
      classes: classes || []
    });
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

    let whereClause = '';
    const queryParams = [];
    let paramCount = 1;

    if (grade) {
      whereClause += `WHERE c.grade = $${paramCount}`;
      queryParams.push(parseInt(grade));
      paramCount++;
    }

    if (stream) {
      whereClause += whereClause ? ` AND c.stream = $${paramCount}` : `WHERE c.stream = $${paramCount}`;
      queryParams.push(stream);
      paramCount++;
    }

    // Filter classes by lab - classes that have schedules in the specified lab
    if (labId) {
      const labCondition = `c.id IN (
// Removed SQL fragment: SELECT DISTINCT s.class_id
        FROM schedules s
        WHERE s.lab_id = $${paramCount} AND s.class_id IS NOT NULL
      )`;
      whereClause += whereClause ? ` AND ${labCondition}` : `WHERE ${labCondition}`;
      queryParams.push(labId);
      paramCount++;
    }

    const result = await query(`
// Removed SQL fragment: SELECT
        c.*,
        COUNT(DISTINCT g.id) as group_count,
        COUNT(DISTINCT gm.user_id) as student_count,
        COUNT(DISTINCT s.id) as schedule_count
      FROM classes c
      LEFT JOIN groups g ON c.id = g.class_id
      LEFT JOIN group_members gm ON g.id = gm.group_id
      LEFT JOIN schedules s ON c.id = s.class_id
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.grade, c.stream, c.name
    `, queryParams);

    res.json({
      classes: result.rows
    });
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// Create computer assignment for a group or student
router.post('/:id/assign-computer', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduleId, groupId, userId, computerNumber, labId } = req.body;
    const currentUser = req.user;

    // Check permissions
    if (currentUser.role !== 'instructor' && currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate that either groupId or userId is provided, but not both
    if ((!groupId && !userId) || (groupId && userId)) {
      return res.status(400).json({ error: 'Either groupId or userId must be provided, but not both' });
    }

    // Check if schedule exists and belongs to the class
    const scheduleCheck = await query(`
// Removed SQL fragment: SELECT s.*, l.name as lab_name
      FROM schedules s
      JOIN labs l ON s.lab_id = l.id
      WHERE s.id = $1 AND s.class_id = $2
    `, [scheduleId, id]);

    if (scheduleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found for this class' });
    }

    const schedule = scheduleCheck.rows[0];

    // Check if computer exists and is available
    const computerCheck = await query(`
// Removed SQL fragment: SELECT * FROM computers
      WHERE computer_number = $1 AND lab_id = $2 AND is_functional = true
    `, [computerNumber, labId || schedule.lab_id]);

    if (computerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Computer not found or not functional' });
    }

    // Check if computer is already assigned for this schedule
    const existingAssignment = await query(`
// Removed SQL fragment: SELECT * FROM schedule_assignments
      WHERE schedule_id = $1 AND assigned_computer = $2
    `, [scheduleId, computerNumber]);

    if (existingAssignment.rows.length > 0) {
      return res.status(400).json({ error: 'Computer is already assigned for this schedule' });
    }

    // Create the assignment
    const assignmentResult = await query(`
// Removed SQL fragment: INSERT INTO schedule_assignments (schedule_id, group_id, user_id, assigned_computer, status)
      VALUES ($1, $2, $3, $4, 'assigned')
      RETURNING *
    `, [scheduleId, groupId || null, userId || null, computerNumber]);

    // Get detailed assignment info for response
    const detailedAssignment = await query(`
// Removed SQL fragment: SELECT
        sa.*,
        s.title as schedule_title,
        s.scheduled_date,
        l.name as lab_name,
        g.group_name,
        CONCAT(u.first_name, ' ', u.last_name) as student_name,
        u.student_id,
        comp.computer_name
      FROM schedule_assignments sa
      JOIN schedules s ON sa.schedule_id = s.id
      JOIN labs l ON s.lab_id = l.id
      LEFT JOIN groups g ON sa.group_id = g.id
      LEFT JOIN users u ON sa.user_id = u.id
      LEFT JOIN computers comp ON sa.assigned_computer = comp.computer_number AND comp.lab_id = s.lab_id
      WHERE sa.id = $1
    `, [assignmentResult.rows[0].id]);

    res.status(201).json({
      message: 'Computer assigned successfully',
      assignment: detailedAssignment.rows[0]
    });
  } catch (error) {
    console.error('Create computer assignment error:', error);
    res.status(500).json({ error: 'Failed to create computer assignment' });
  }
});

// Get class by ID with detailed information
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get class details
    const classResult = await query(
      'SELECT * FROM classes WHERE id = $1',
      [id]
    );

    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const classData = classResult.rows[0];

    // Get groups in this class
    const groupsResult = await query(`
// Removed SQL fragment: SELECT 
        g.*,
        COUNT(gm.user_id) as member_count,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name
      FROM groups g
      LEFT JOIN group_members gm ON g.id = gm.group_id
      LEFT JOIN users u ON g.created_by = u.id
      WHERE g.class_id = $1
      GROUP BY g.id, u.first_name, u.last_name
      ORDER BY g.created_at
    `, [id]);

    // Get students in this class (through groups)
    const studentsResult = await query(`
// Removed SQL fragment: SELECT DISTINCT
        u.id, u.first_name, u.last_name, u.student_id, u.email,
        g.group_name, gm.role as group_role
      FROM users u
      JOIN group_members gm ON u.id = gm.user_id
      JOIN groups g ON gm.group_id = g.id
      WHERE g.class_id = $1 AND u.role = 'student'
      ORDER BY u.first_name, u.last_name
    `, [id]);

    res.json({
      class: {
        ...classData,
        groups: groupsResult.rows,
        students: studentsResult.rows
      }
    });
  } catch (error) {
    console.error('Get class details error:', error);
    res.status(500).json({ error: 'Failed to fetch class details' });
  }
});

// Create new class (instructor/admin only)
router.post('/', [
  authenticateToken,
  requireInstructor,
  body('classCode').trim().isLength({ min: 1 }),
  body('grade').isInt({ min: 11, max: 12 }),
  body('stream').isIn(['NM', 'M', 'COM']),
  body('section').trim().isLength({ min: 1, max: 5 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { classCode, grade, stream, section, description } = req.body;

    // Check if class code already exists
    const existingClass = await query(
      'SELECT id FROM classes WHERE class_code = $1',
      [classCode]
    );

    if (existingClass.rows.length > 0) {
      return res.status(409).json({ error: 'Class code already exists' });
    }

    // Create class
    const result = await query(`
// Removed SQL fragment: INSERT INTO classes (class_code, grade, stream, section, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [classCode, grade, stream, section, description]);

    res.status(201).json({
      message: 'Class created successfully',
      class: result.rows[0]
    });
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// Update class
router.put('/:id', [
  authenticateToken,
  requireInstructor,
  body('classCode').optional().trim().isLength({ min: 1 }),
  body('grade').optional().isInt({ min: 11, max: 12 }),
  body('stream').optional().isIn(['NM', 'M', 'COM']),
  body('section').optional().trim().isLength({ min: 1, max: 5 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { classCode, grade, stream, section, description } = req.body;

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (classCode) {
      updateFields.push(`class_code = $${paramCount}`);
      values.push(classCode);
      paramCount++;
    }

    if (grade) {
      updateFields.push(`grade = $${paramCount}`);
      values.push(grade);
      paramCount++;
    }

    if (stream) {
      updateFields.push(`stream = $${paramCount}`);
      values.push(stream);
      paramCount++;
    }

    if (section) {
      updateFields.push(`section = $${paramCount}`);
      values.push(section);
      paramCount++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id);

    const result = await query(`
// Removed SQL fragment: UPDATE classes 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json({
      message: 'Class updated successfully',
      class: result.rows[0]
    });
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

// Delete class (admin only - this will cascade delete groups and memberships)
router.delete('/:id', [authenticateToken, requireInstructor], async (req, res) => {
  try {
    const { id } = req.params;

    // Check if class has any schedules
    const schedulesResult = await query(
      'SELECT COUNT(*) as count FROM schedules WHERE class_id = $1',
      [id]
    );

    if (parseInt(schedulesResult.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete class with existing schedules. Please remove schedules first.' 
      });
    }

    const result = await query(
      'DELETE FROM classes WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

// Get class statistics
router.get('/:id/statistics', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if class exists
    const classResult = await query(
      'SELECT class_code FROM classes WHERE id = $1',
      [id]
    );

    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Get various statistics
    const statsResult = await query(`
// Removed SQL fragment: SELECT 
        COUNT(DISTINCT g.id) as total_groups,
        COUNT(DISTINCT gm.user_id) as total_students,
        COUNT(DISTINCT s.id) as total_schedules,
        COUNT(DISTINCT sub.id) as total_submissions,
        AVG(gr.score) as average_score
      FROM classes c
      LEFT JOIN groups g ON c.id = g.class_id
      LEFT JOIN group_members gm ON g.id = gm.group_id
      LEFT JOIN schedules s ON c.id = s.class_id
      LEFT JOIN submissions sub ON s.id = sub.schedule_id
      LEFT JOIN grades gr ON sub.id = gr.submission_id
      WHERE c.id = $1
      GROUP BY c.id
    `, [id]);

    // Get recent activity
    const recentActivityResult = await query(`
// Removed SQL fragment: SELECT 
        'schedule' as type,
        s.title as title,
        s.scheduled_date as date,
        s.created_at as timestamp
      FROM schedules s
      WHERE s.class_id = $1
      UNION ALL
      SELECT 
        'submission' as type,
        'Submission for ' || sch.title as title,
        sch.scheduled_date as date,
        sub.submitted_at as timestamp
      FROM submissions sub
      JOIN schedules sch ON sub.schedule_id = sch.id
      WHERE sch.class_id = $1
      ORDER BY timestamp DESC
      LIMIT 10
    `, [id]);

    const stats = statsResult.rows[0];

    res.json({
      statistics: {
        totalGroups: parseInt(stats.total_groups) || 0,
        totalStudents: parseInt(stats.total_students) || 0,
        totalSchedules: parseInt(stats.total_schedules) || 0,
        totalSubmissions: parseInt(stats.total_submissions) || 0,
        averageScore: parseFloat(stats.average_score) || 0,
        recentActivity: recentActivityResult.rows
      }
    });
  } catch (error) {
    console.error('Get class statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch class statistics' });
  }
});

// Get class assignments (groups and computer assignments)
router.get('/:id/assignments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { labId } = req.query;

    // Get groups for this class
    const groupsResult = await query(`
// Removed SQL fragment: SELECT
        g.*,
        COUNT(gm.user_id) as member_count,
        u.first_name as leader_first_name,
        u.last_name as leader_last_name
      FROM groups g
      LEFT JOIN group_members gm ON g.id = gm.group_id
      LEFT JOIN users u ON g.leader_id = u.id
      WHERE g.class_id = $1
      GROUP BY g.id, u.first_name, u.last_name
      ORDER BY g.name
    `, [id]);

    // Get group members for each group
    const groups = [];
    for (const group of groupsResult.rows) {
      const membersResult = await query(`
// Removed SQL fragment: SELECT
          u.id,
          u.first_name,
          u.last_name,
          u.student_id,
          CASE WHEN g.leader_id = u.id THEN 'leader' ELSE 'member' END as role
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        JOIN groups g ON gm.group_id = g.id
        WHERE gm.group_id = $1
        ORDER BY (CASE WHEN g.leader_id = u.id THEN 0 ELSE 1 END), u.first_name
      `, [group.id]);

      groups.push({
        ...group,
        leader_name: group.leader_first_name && group.leader_last_name
          ? `${group.leader_first_name} ${group.leader_last_name}`
          : null,
        members: membersResult.rows
      });
    }

    // Get computer assignments for this class in the specified lab
    let assignments = [];
    if (labId) {
      const assignmentsResult = await query(`
// Removed SQL fragment: SELECT
          sa.*,
          g.name as group_name,
          u.first_name,
          u.last_name,
          u.student_id,
          sch.title as schedule_title,
          c.computer_name
        FROM schedule_assignments sa
        JOIN schedules sch ON sa.schedule_id = sch.id
        LEFT JOIN groups g ON sa.group_id = g.id
        LEFT JOIN users u ON sa.user_id = u.id
        LEFT JOIN computers c ON c.computer_number = sa.assigned_computer AND c.lab_id = sch.lab_id
        WHERE sch.class_id = $1 AND sch.lab_id = $2
        ORDER BY sa.assigned_computer
      `, [id, labId]);

      assignments = assignmentsResult.rows.map(assignment => ({
        ...assignment,
        student_name: assignment.first_name && assignment.last_name
          ? `${assignment.first_name} ${assignment.last_name}`
          : null
      }));
    }

    res.json({
      groups,
      assignments
    });
  } catch (error) {
    console.error('Get class assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch class assignments' });
  }
});

// Assign computer to group or student
router.post('/:id/assign-computer', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduleId, groupId, userId, computerNumber } = req.body;

    // Validate input
    if (!scheduleId || !computerNumber) {
      return res.status(400).json({ error: 'Schedule ID and computer number are required' });
    }

    if (!groupId && !userId) {
      return res.status(400).json({ error: 'Either group ID or user ID must be provided' });
    }

    if (groupId && userId) {
      return res.status(400).json({ error: 'Cannot assign to both group and user simultaneously' });
    }

    // Check if computer is available and functional
    const computerResult = await query(`
// Removed SQL fragment: SELECT c.*, l.name as lab_name
      FROM computers c
      JOIN labs l ON c.lab_id = l.id
      JOIN schedules s ON s.lab_id = l.id
      WHERE s.id = $1 AND c.computer_number = $2 AND c.is_functional = true
    `, [scheduleId, computerNumber]);

    if (computerResult.rows.length === 0) {
      return res.status(400).json({ error: 'Computer not found or not functional' });
    }

    // Check if computer is already assigned for this schedule
    const existingAssignment = await query(`
// Removed SQL fragment: SELECT id FROM schedule_assignments
      WHERE schedule_id = $1 AND assigned_computer = $2
    `, [scheduleId, computerNumber]);

    if (existingAssignment.rows.length > 0) {
      return res.status(400).json({ error: 'Computer is already assigned for this schedule' });
    }

    // Create the assignment
    const assignmentResult = await query(`
// Removed SQL fragment: INSERT INTO schedule_assignments (schedule_id, group_id, user_id, assigned_computer, status)
      VALUES ($1, $2, $3, $4, 'assigned')
      RETURNING *
    `, [scheduleId, groupId || null, userId || null, computerNumber]);

    res.json({
      message: 'Computer assigned successfully',
      assignment: assignmentResult.rows[0]
    });
  } catch (error) {
    console.error('Assign computer error:', error);
    res.status(500).json({ error: 'Failed to assign computer' });
  }
});

module.exports = router;
