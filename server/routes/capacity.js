const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireInstructor } = require('../middleware/auth');

const router = express.Router();

// Get capacity planning overview
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Provide sample capacity data for demo
    const capacityData = {
      labs: [
        {
          id: 'f202a2b2-08b0-41cf-8f97-c0160f247ad8',
          name: 'Computer Lab 1',
          total_computers: 15,
          available_computers: 5,
          occupied_computers: 10,
          capacity_percentage: 67
        },
        {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          name: 'Computer Lab 2',
          total_computers: 19,
          available_computers: 7,
          occupied_computers: 12,
          capacity_percentage: 63
        }
      ],
      classes: [
        {
          id: 'e519c46b-7380-4ab4-9529-6bc258edbb8d',
          name: '11 NM C',
          total_students: 25,
          assigned_students: 20,
          lab_assignment: 'Computer Lab 2'
        }
      ],
      overall_capacity: 65,
      total_computers: 34,
      available_computers: 12,
      occupied_computers: 22
    };

    res.json({
      message: 'Capacity data retrieved successfully',
      data: capacityData
    });
  } catch (error) {
    console.error('Get capacity overview error:', error);
    res.status(500).json({ error: 'Failed to fetch capacity data' });
  }
});

// Get lab computers with assignment status
router.get('/labs/:labId/computers', authenticateToken, async (req, res) => {
  try {
    const { labId } = req.params;
    const { scheduleId } = req.query;

    let computersQuery = `
      SELECT 
        c.id,
        c.computer_name,
        c.computer_number,
        c.specifications,
        c.is_functional,
        sa.id as assignment_id,
        sa.group_id,
        sa.user_id,
        g.name as group_name,
        u.first_name,
        u.last_name,
        u.student_id
      FROM computers c
      LEFT JOIN schedule_assignments sa ON c.computer_number = sa.assigned_computer
      LEFT JOIN groups g ON sa.group_id = g.id
      LEFT JOIN users u ON sa.user_id = u.id
      WHERE c.lab_id = $1
    `;

    const queryParams = [labId];

    if (scheduleId) {
      computersQuery += ` AND (sa.schedule_id = $2 OR sa.schedule_id IS NULL)`;
      queryParams.push(scheduleId);
    }

    computersQuery += ` ORDER BY c.computer_number`;

    const result = await query(computersQuery, queryParams);

    res.json(result.rows);
  } catch (error) {
    console.error('Get lab computers error:', error);
    res.status(500).json({ error: 'Failed to fetch lab computers' });
  }
});

// Get lab seats with assignment status
router.get('/labs/:labId/seats', authenticateToken, async (req, res) => {
  try {
    const { labId } = req.params;
    const { scheduleId } = req.query;

    let seatsQuery = `
      SELECT
        s.id,
        s.seat_number,
        s.is_available,
        seat_a.id as assignment_id,
        seat_a.user_id,
        u.first_name,
        u.last_name,
        u.student_id
      FROM seats s
      LEFT JOIN seat_assignments seat_a ON s.id = seat_a.seat_id
      LEFT JOIN users u ON seat_a.user_id = u.id
      WHERE s.lab_id = $1
    `;

    const queryParams = [labId];

    if (scheduleId) {
      seatsQuery += ` AND (seat_a.schedule_id = $2 OR seat_a.schedule_id IS NULL)`;
      queryParams.push(scheduleId);
    }

    seatsQuery += ` ORDER BY s.seat_number`;

    const result = await query(seatsQuery, queryParams);

    res.json(result.rows);
  } catch (error) {
    console.error('Get lab seats error:', error);
    res.status(500).json({ error: 'Failed to fetch lab seats' });
  }
});

// Get seat assignments for a lab
router.get('/labs/:labId/seat-assignments', authenticateToken, async (req, res) => {
  try {
    const { labId } = req.params;
    const { scheduleId } = req.query;

    console.log('Fetching seat assignments for labId:', labId, 'scheduleId:', scheduleId);

    // For now, return sample data since the full schema isn't in Supabase yet
    // In a full implementation, this would query the seat_assignments, seats, and users tables
    const sampleAssignments = [
      {
        id: '1',
        user_id: '1',
        seat_id: 'seat1',
        seat_number: 'CL1-CR-001',
        first_name: 'John',
        last_name: 'Doe',
        student_id: 'ST000001',
        student_name: 'John Doe',
        assigned_at: new Date().toISOString()
      },
      {
        id: '2',
        user_id: '2',
        seat_id: 'seat2',
        seat_number: 'CL1-CR-002',
        first_name: 'Jane',
        last_name: 'Smith',
        student_id: 'ST000002',
        student_name: 'Jane Smith',
        assigned_at: new Date().toISOString()
      }
    ];

    res.json(sampleAssignments);
  } catch (error) {
    console.error('Get seat assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch seat assignments' });
  }
});

// Create seat assignment
router.post('/seat-assignments', [
  authenticateToken,
  requireInstructor,
  body('user_id').isUUID(),
  body('seat_id').isUUID(),
  body('schedule_id').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { user_id, seat_id, schedule_id } = req.body;

    // Check if seat is already assigned for this schedule
    const existingSeatAssignment = await query(
      'SELECT id FROM seat_assignments WHERE seat_id = $1 AND schedule_id = $2',
      [seat_id, schedule_id]
    );

    if (existingSeatAssignment.rows.length > 0) {
      return res.status(409).json({ error: 'Seat is already assigned for this schedule' });
    }

    // Check if user is already assigned a seat for this schedule
    const existingUserAssignment = await query(
      'SELECT id FROM seat_assignments WHERE user_id = $1 AND schedule_id = $2',
      [user_id, schedule_id]
    );

    if (existingUserAssignment.rows.length > 0) {
      return res.status(409).json({ error: 'User already has a seat assignment for this schedule' });
    }

    // Create the seat assignment
    const result = await query(`
      INSERT INTO seat_assignments (schedule_id, user_id, seat_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [schedule_id, user_id, seat_id]);

    res.status(201).json({
      message: 'Seat assignment created successfully',
      assignment: result.rows[0]
    });
  } catch (error) {
    console.error('Create seat assignment error:', error);
    res.status(500).json({ error: 'Failed to create seat assignment' });
  }
});

// Update seat assignment
router.put('/seat-assignments/:id', [
  authenticateToken,
  requireInstructor,
  body('seat_id').optional().isUUID(),
  body('user_id').optional().isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { seat_id, user_id } = req.body;

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (seat_id) {
      updateFields.push(`seat_id = $${paramCount}`);
      values.push(seat_id);
      paramCount++;
    }

    if (user_id) {
      updateFields.push(`user_id = $${paramCount}`);
      values.push(user_id);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const result = await query(`
      UPDATE seat_assignments 
      SET ${updateFields.join(', ')}, assigned_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Seat assignment not found' });
    }

    res.json({
      message: 'Seat assignment updated successfully',
      assignment: result.rows[0]
    });
  } catch (error) {
    console.error('Update seat assignment error:', error);
    res.status(500).json({ error: 'Failed to update seat assignment' });
  }
});

// Delete seat assignment
router.delete('/seat-assignments/:id', [authenticateToken, requireInstructor], async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM seat_assignments WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Seat assignment not found' });
    }

    res.json({ message: 'Seat assignment deleted successfully' });
  } catch (error) {
    console.error('Delete seat assignment error:', error);
    res.status(500).json({ error: 'Failed to delete seat assignment' });
  }
});

// Assign group to computer
router.post('/computer-assignments', [
  authenticateToken,
  requireInstructor,
  body('schedule_id').isUUID(),
  body('computer_number').isInt({ min: 1 }),
  body('group_id').optional().isUUID(),
  body('user_id').optional().isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { schedule_id, computer_number, group_id, user_id } = req.body;

    // Validate that either group_id or user_id is provided, but not both
    if ((!group_id && !user_id) || (group_id && user_id)) {
      return res.status(400).json({
        error: 'Either group_id or user_id must be provided, but not both'
      });
    }

    // Check if computer is already assigned for this schedule
    const existingAssignment = await query(
      'SELECT id FROM schedule_assignments WHERE assigned_computer = $1 AND schedule_id = $2',
      [computer_number, schedule_id]
    );

    if (existingAssignment.rows.length > 0) {
      return res.status(409).json({ error: 'Computer is already assigned for this schedule' });
    }

    // Create the assignment
    const result = await query(`
      INSERT INTO schedule_assignments (schedule_id, assigned_computer, group_id, user_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [schedule_id, computer_number, group_id || null, user_id || null]);

    res.status(201).json({
      message: 'Computer assignment created successfully',
      assignment: result.rows[0]
    });
  } catch (error) {
    console.error('Create computer assignment error:', error);
    res.status(500).json({ error: 'Failed to create computer assignment' });
  }
});

// Update computer assignment
router.put('/computer-assignments/:id', [
  authenticateToken,
  requireInstructor,
  body('computer_number').optional().isInt({ min: 1 }),
  body('group_id').optional().isUUID(),
  body('user_id').optional().isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { computer_number, group_id, user_id } = req.body;

    // Validate that either group_id or user_id is provided, but not both
    if (group_id && user_id) {
      return res.status(400).json({
        error: 'Cannot assign to both group and user simultaneously'
      });
    }

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (computer_number) {
      updateFields.push(`assigned_computer = $${paramCount}`);
      values.push(computer_number);
      paramCount++;
    }

    if (group_id !== undefined) {
      updateFields.push(`group_id = $${paramCount}`);
      values.push(group_id);
      paramCount++;
    }

    if (user_id !== undefined) {
      updateFields.push(`user_id = $${paramCount}`);
      values.push(user_id);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const result = await query(`
      UPDATE schedule_assignments
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Computer assignment not found' });
    }

    res.json({
      message: 'Computer assignment updated successfully',
      assignment: result.rows[0]
    });
  } catch (error) {
    console.error('Update computer assignment error:', error);
    res.status(500).json({ error: 'Failed to update computer assignment' });
  }
});

// Delete computer assignment
router.delete('/computer-assignments/:id', [authenticateToken, requireInstructor], async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM schedule_assignments WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Computer assignment not found' });
    }

    res.json({ message: 'Computer assignment deleted successfully' });
  } catch (error) {
    console.error('Delete computer assignment error:', error);
    res.status(500).json({ error: 'Failed to delete computer assignment' });
  }
});

// Get students and groups for a specific class
router.get('/students-groups/:classId', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;

    console.log('Fetching students and groups for classId:', classId);

    // For now, return sample data since the full schema isn't in Supabase yet
    // In a full implementation, this would query the groups and group_members tables
    const sampleResponse = {
      students: [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          studentId: 'ST000001',
          email: 'john.doe@student.com',
          groupId: 'group1',
          groupName: 'Group A',
          groupRole: 'leader'
        },
        {
          id: '2',
          firstName: 'Jane',
          lastName: 'Smith',
          studentId: 'ST000002',
          email: 'jane.smith@student.com',
          groupId: 'group1',
          groupName: 'Group A',
          groupRole: 'member'
        }
      ],
      groups: [
        {
          id: 'group1',
          name: 'Group A',
          description: 'Sample group for demonstration',
          maxMembers: 4,
          leaderId: '1',
          leaderName: 'John Doe',
          memberCount: 2,
          members: [
            {
              id: '1',
              first_name: 'John',
              last_name: 'Doe',
              student_id: 'ST000001',
              email: 'john.doe@student.com',
              role: 'leader'
            },
            {
              id: '2',
              first_name: 'Jane',
              last_name: 'Smith',
              student_id: 'ST000002',
              email: 'jane.smith@student.com',
              role: 'member'
            }
          ]
        }
      ]
    };

    return res.json(sampleResponse);

    // Get all groups in the class with member details
    const groupsResult = await query(`
      SELECT
        g.id,
        g.name,
        g.description,
        g.max_members,
        g.leader_id,
        COUNT(gm.user_id) as member_count,
        leader.first_name as leader_first_name,
        leader.last_name as leader_last_name
      FROM groups g
      LEFT JOIN group_members gm ON g.id = gm.group_id
      LEFT JOIN users leader ON g.leader_id = leader.id
      WHERE g.class_id = $1
      GROUP BY g.id, g.name, g.description, g.max_members, g.leader_id, leader.first_name, leader.last_name
      ORDER BY g.name
    `, [classId]);

    // Get members for each group
    const groups = [];
    for (const group of groupsResult.rows) {
      const membersResult = await query(`
        SELECT
          u.id,
          u.first_name,
          u.last_name,
          u.student_id,
          u.email,
          CASE WHEN g.leader_id = u.id THEN 'leader' ELSE 'member' END as role
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        JOIN groups g ON gm.group_id = g.id
        WHERE gm.group_id = $1
        ORDER BY (CASE WHEN g.leader_id = u.id THEN 0 ELSE 1 END), u.first_name
      `, [group.id]);

      groups.push({
        id: group.id,
        name: group.name,
        description: group.description,
        maxMembers: group.max_members,
        leaderId: group.leader_id,
        leaderName: group.leader_first_name && group.leader_last_name
          ? `${group.leader_first_name} ${group.leader_last_name}`
          : null,
        memberCount: parseInt(group.member_count),
        members: membersResult.rows.map(member => ({
          id: member.id,
          first_name: member.first_name,
          last_name: member.last_name,
          student_id: member.student_id,
          email: member.email,
          role: member.role
        }))
      });
    }

    res.json({
      students: studentsResult.rows.map(student => ({
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        studentId: student.student_id,
        email: student.email,
        groupId: student.group_id,
        groupName: student.group_name,
        groupRole: student.group_role
      })),
      groups: groups
    });
  } catch (error) {
    console.error('Get students and groups error:', error);
    res.status(500).json({ error: 'Failed to fetch students and groups' });
  }
});

// Get unassigned students for seat assignment in a specific class and lab
router.get('/unassigned-students/:classId/:labId', authenticateToken, async (req, res) => {
  try {
    const { classId, labId } = req.params;
    const { scheduleId } = req.query;

    // Query to get students who are in the class but not assigned to any seat
    // for the given lab and schedule (if provided)
    let unassignedQuery = `
      SELECT DISTINCT
        u.id,
        u.first_name,
        u.last_name,
        u.student_id,
        u.email
      FROM users u
      JOIN group_members gm ON u.id = gm.user_id
      JOIN groups g ON gm.group_id = g.id
      WHERE g.class_id = $1
        AND u.role = 'student'
        AND u.is_active = true
        AND u.id NOT IN (
          SELECT DISTINCT sa.user_id
          FROM seat_assignments sa
          JOIN seats s ON sa.seat_id = s.id
          WHERE s.lab_id = $2
    `;

    const queryParams = [classId, labId];
    let paramCount = 3;

    // If scheduleId is provided, only exclude students assigned for that specific schedule
    if (scheduleId) {
      unassignedQuery += ` AND sa.schedule_id = $${paramCount}`;
      queryParams.push(scheduleId);
      paramCount++;
    }

    unassignedQuery += `
        )
      ORDER BY u.first_name, u.last_name
    `;

    const result = await query(unassignedQuery, queryParams);

    const unassignedStudents = result.rows.map(student => ({
      id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      student_id: student.student_id,
      email: student.email
    }));

    res.json({
      unassignedStudents: unassignedStudents,
      count: unassignedStudents.length
    });

  } catch (error) {
    console.error('Get unassigned students error:', error);
    res.status(500).json({ error: 'Failed to fetch unassigned students' });
  }
});

module.exports = router;
