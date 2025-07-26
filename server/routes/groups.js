const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireStudentOrInstructor } = require('../middleware/auth');

const router = express.Router();

// Get all groups (with optional filtering)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { classId, userId } = req.query;
    const currentUser = req.user;

    let whereClause = '';
    const queryParams = [];
    let paramCount = 1;

    // Students can only see groups they belong to or groups in their classes
    if (currentUser.role === 'student') {
      whereClause = `WHERE (
        EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = $${paramCount})
        OR g.class_id IN (
          SELECT DISTINCT gr.class_id FROM groups gr
          JOIN group_members gm2 ON gr.id = gm2.group_id
          WHERE gm2.user_id = $${paramCount}
        )
      )`;
      queryParams.push(currentUser.id);
      paramCount++;
    }

    // Filter by class if provided
    if (classId) {
      const classCondition = `g.class_id = $${paramCount}`;
      whereClause += whereClause ? ` AND ${classCondition}` : `WHERE ${classCondition}`;
      queryParams.push(classId);
      paramCount++;
    }

    if (classId) {
      whereClause += whereClause ? ` AND g.class_id = $${paramCount}` : `WHERE g.class_id = $${paramCount}`;
      queryParams.push(classId);
      paramCount++;
    }

    if (userId) {
      whereClause += whereClause ? 
        ` AND EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = $${paramCount})` :
        `WHERE EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = $${paramCount})`;
      queryParams.push(userId);
      paramCount++;
    }

    // Add filter to exclude default groups
    const defaultGroupFilter = 'g.is_default = false';
    whereClause += whereClause ? ` AND ${defaultGroupFilter}` : `WHERE ${defaultGroupFilter}`;

    const result = await query(`
      SELECT
        g.*,
        c.name as class_name,
        COUNT(gm.user_id) as member_count,
        leader.first_name as leader_first_name,
        leader.last_name as leader_last_name
      FROM groups g
      JOIN classes c ON g.class_id = c.id
      LEFT JOIN group_members gm ON g.id = gm.group_id
      LEFT JOIN users leader ON g.leader_id = leader.id
      ${whereClause}
      GROUP BY g.id, c.name, leader.first_name, leader.last_name
      ORDER BY g.created_at DESC
    `, queryParams);

    // Get members for each group
    const groupsWithMembers = await Promise.all(
      result.rows.map(async (group) => {
        const membersResult = await query(`
          SELECT
            u.id, u.first_name, u.last_name, u.student_id, u.email
          FROM group_members gm
          JOIN users u ON gm.user_id = u.id
          WHERE gm.group_id = $1
          ORDER BY u.first_name, u.last_name
        `, [group.id]);

        return {
          id: group.id,
          name: group.name,
          description: group.description,
          leaderId: group.leader_id,
          leaderName: group.leader_first_name && group.leader_last_name
            ? `${group.leader_first_name} ${group.leader_last_name}`
            : 'No Leader',
          classId: group.class_id,
          className: group.class_name,
          memberCount: parseInt(group.member_count),
          members: membersResult.rows.map(member => ({
            id: member.id,
            firstName: member.first_name,
            lastName: member.last_name,
            email: member.email,
            studentId: member.student_id
          })),
          createdAt: group.created_at
        };
      })
    );

    res.json({ groups: groupsWithMembers });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Get dashboard statistics
router.get('/dashboard-stats', authenticateToken, async (req, res) => {
  try {
    // Get total students (excluding admins and instructors)
    const studentsResult = await query(`
      SELECT COUNT(*) as total_students
      FROM users
      WHERE role = 'student' AND is_active = true
    `);

    // Get total groups (excluding default groups)
    const groupsResult = await query(`
      SELECT COUNT(*) as total_groups
      FROM groups
      WHERE is_default = false
    `);

    // Get total computers across all labs
    const computersResult = await query(`
      SELECT COUNT(*) as total_computers
      FROM computers
      WHERE is_functional = true
    `);

    const stats = {
      totalStudents: parseInt(studentsResult.rows[0].total_students),
      totalGroups: parseInt(groupsResult.rows[0].total_groups),
      totalComputers: parseInt(computersResult.rows[0].total_computers)
    };

    res.json(stats);
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get current student's group information
router.get('/my-group', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Ensure only students can access this endpoint
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied. Students only.' });
    }

    // Find the student's group
    const groupResult = await query(`
      SELECT
        g.id,
        g.name,
        g.max_members,
        g.description,
        c.name as class_name,
        c.id as class_id,
        CASE WHEN g.leader_id = $1 THEN true ELSE false END as is_leader
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      JOIN classes c ON g.class_id = c.id
      WHERE gm.user_id = $1 AND g.is_default = false
      LIMIT 1
    `, [userId]);

    if (groupResult.rows.length === 0) {
      return res.json({
        success: true,
        group: null,
        message: 'Student is not assigned to any group'
      });
    }

    const group = groupResult.rows[0];

    // Get group members
    const membersResult = await query(`
      SELECT
        u.id, u.first_name, u.last_name, u.student_id,
        CASE WHEN g.leader_id = u.id THEN 'leader' ELSE 'member' END as role
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      JOIN groups g ON gm.group_id = g.id
      WHERE gm.group_id = $1
      ORDER BY (CASE WHEN g.leader_id = u.id THEN 0 ELSE 1 END), u.first_name, u.last_name
    `, [group.id]);

    const members = membersResult.rows.map(member => ({
      id: member.id,
      firstName: member.first_name,
      lastName: member.last_name,
      studentId: member.student_id,
      role: member.role
    }));

    const groupInfo = {
      id: group.id,
      name: group.name,
      className: group.class_name,
      classId: group.class_id,
      maxMembers: group.max_members,
      memberCount: members.length,
      isLeader: group.is_leader,
      description: group.description,
      members: members
    };

    res.json({
      success: true,
      group: groupInfo
    });

  } catch (error) {
    console.error('Error fetching student group:', error);
    // Return empty data instead of 500 error for better UX
    res.json({
      success: true,
      group: null,
      message: 'No group information available at the moment'
    });
  }
});

// Get student's seat assignments
router.get('/my-seat-info', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Ensure only students can access this endpoint
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied. Students only.' });
    }

    // Get student's seat assignments with computer assignments
    const result = await query(`
      SELECT
        sa.id,
        sa.schedule_id,
        s.seat_number,
        l.name as lab_name,
        l.location as lab_location,
        sch.title as schedule_title,
        sch.scheduled_date,
        sch.duration_minutes,
        c.name as class_name,
        sa.assigned_at,
        -- Computer assignment information
        comp_assign.assigned_computer,
        comp.computer_name,
        comp_assign.group_id as computer_group_id,
        g.name as computer_group_name
      FROM seat_assignments sa
      JOIN seats s ON sa.seat_id = s.id
      JOIN labs l ON s.lab_id = l.id
      JOIN schedules sch ON sa.schedule_id = sch.id
      LEFT JOIN classes c ON sch.class_id = c.id
      -- Join computer assignments (either individual or through group)
      LEFT JOIN schedule_assignments comp_assign ON comp_assign.schedule_id = sch.id
        AND (comp_assign.user_id = sa.user_id OR comp_assign.group_id IN (
          SELECT group_id FROM group_members WHERE user_id = sa.user_id
        ))
      LEFT JOIN computers comp ON comp.computer_number = comp_assign.assigned_computer
        AND comp.lab_id = l.id
      LEFT JOIN groups g ON comp_assign.group_id = g.id
      WHERE sa.user_id = $1
      ORDER BY sch.scheduled_date DESC, sa.assigned_at DESC
    `, [userId]);

    const seatAssignments = result.rows.map(row => {
      const startTime = new Date(row.scheduled_date);
      const endTime = new Date(startTime.getTime() + (row.duration_minutes * 60000));

      return {
        id: row.id,
        scheduleId: row.schedule_id,
        seatNumber: row.seat_number,
        labName: row.lab_name,
        labLocation: row.lab_location,
        scheduleTitle: row.schedule_title,
        scheduledDate: row.scheduled_date,
        startTime: startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        endTime: endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        durationMinutes: row.duration_minutes,
        className: row.class_name,
        assignedAt: row.assigned_at,
        // Computer assignment information
        computerNumber: row.assigned_computer,
        computerName: row.computer_name,
        computerGroupId: row.computer_group_id,
        computerGroupName: row.computer_group_name
      };
    });

    res.json({
      success: true,
      seatAssignments,
      total: seatAssignments.length
    });

  } catch (error) {
    console.error('Error fetching student seat info:', error);
    res.status(500).json({ error: 'Failed to fetch seat information' });
  }
});

// Get group by ID with members
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Get group details
    const groupResult = await query(`
      SELECT
        g.*,
        c.name as class_name,
        u.first_name as leader_first_name,
        u.last_name as leader_last_name
      FROM groups g
      JOIN classes c ON g.class_id = c.id
      LEFT JOIN users u ON g.leader_id = u.id
      WHERE g.id = $1
    `, [id]);

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = groupResult.rows[0];

    // Check if student has access to this group
    if (currentUser.role === 'student') {
      const membershipResult = await query(
        'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
        [id, currentUser.id]
      );

      if (membershipResult.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get group members
    const membersResult = await query(`
      SELECT 
        u.id, u.first_name, u.last_name, u.student_id, u.email,
        gm.role, gm.joined_at
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = $1
      ORDER BY gm.role DESC, gm.joined_at
    `, [id]);

    // Get recent schedules for this group
    const schedulesResult = await query(`
      SELECT 
        s.id, s.title, s.scheduled_date, s.start_time, s.end_time, s.status,
        l.lab_name
      FROM schedules s
      JOIN labs l ON s.lab_id = l.id
      JOIN schedule_assignments sa ON s.id = sa.schedule_id
      WHERE sa.group_id = $1
      ORDER BY s.scheduled_date DESC, s.start_time DESC
      LIMIT 10
    `, [id]);

    res.json({
      group: {
        ...group,
        members: membersResult.rows,
        recentSchedules: schedulesResult.rows
      }
    });
  } catch (error) {
    console.error('Get group details error:', error);
    res.status(500).json({ error: 'Failed to fetch group details' });
  }
});

// Create new group
router.post('/', [
  authenticateToken,
  requireStudentOrInstructor,
  body('groupName').trim().isLength({ min: 1, max: 100 }),
  body('classId').isUUID(),
  body('maxMembers').optional().isInt({ min: 1, max: 10 }),
  body('studentIds').optional().isArray(),
  body('studentIds.*').optional().isUUID(),
  body('leaderId').optional().isUUID(),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      groupName,
      classId,
      maxMembers = 4,
      studentIds = [],
      leaderId,
      description = ''
    } = req.body;
    const currentUser = req.user;

    // Check if class exists
    const classResult = await query(
      'SELECT id FROM classes WHERE id = $1',
      [classId]
    );

    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check if group name already exists in this class
    const existingGroup = await query(
      'SELECT id FROM groups WHERE name = $1 AND class_id = $2',
      [groupName, classId]
    );

    if (existingGroup.rows.length > 0) {
      return res.status(409).json({ error: 'Group name already exists in this class' });
    }

    // Validate student selection and leader
    if (studentIds.length > 0) {
      if (studentIds.length < 2) {
        return res.status(400).json({ error: 'A group must have at least 2 students' });
      }

      if (!leaderId || !studentIds.includes(leaderId)) {
        return res.status(400).json({ error: 'Leader must be selected from the group members' });
      }

      if (studentIds.length > maxMembers) {
        return res.status(400).json({ error: `Cannot add more than ${maxMembers} students to this group` });
      }

      // Verify all students exist and are not already in a NON-DEFAULT group for this class
      console.log('Validating students:', { classId, studentIds });

      const studentCheck = await query(`
        SELECT DISTINCT
          u.id, u.first_name, u.last_name,
          CASE WHEN EXISTS (
            SELECT 1 FROM group_members gm2
            JOIN groups g2 ON gm2.group_id = g2.id
            WHERE gm2.user_id = u.id AND g2.class_id = $1 AND g2.is_default = false
          ) THEN true ELSE false END as already_grouped
        FROM users u
        WHERE u.id = ANY($2) AND u.role = 'student' AND u.is_active = true
      `, [classId, studentIds]);

      console.log('Student validation results:', {
        expectedCount: studentIds.length,
        foundCount: studentCheck.rows.length,
        foundStudents: studentCheck.rows.map(r => ({ id: r.id, name: `${r.first_name} ${r.last_name}` }))
      });

      if (studentCheck.rows.length !== studentIds.length) {
        console.log('Student validation failed - count mismatch');
        return res.status(400).json({
          error: 'One or more selected students are invalid',
          details: {
            expected: studentIds.length,
            found: studentCheck.rows.length,
            missingStudents: studentIds.filter(id => !studentCheck.rows.find(r => r.id === id))
          }
        });
      }

      const alreadyGrouped = studentCheck.rows.filter(row => row.already_grouped);
      if (alreadyGrouped.length > 0) {
        return res.status(400).json({ error: 'One or more selected students are already in a non-default group for this class' });
      }
    }

    // Create group
    const result = await query(`
      INSERT INTO groups (name, class_id, max_members, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [groupName, classId, maxMembers, description]);

    const group = result.rows[0];

    // Set the leader in the groups table
    if (leaderId) {
      await query(`
        UPDATE groups SET leader_id = $1 WHERE id = $2
      `, [leaderId, group.id]);
    }

    // Add students to group
    if (studentIds.length > 0) {
      // Remove students from default group of the same class first
      const defaultGroupResult = await query(
        'SELECT id FROM groups WHERE class_id = $1 AND is_default = true',
        [classId]
      );

      if (defaultGroupResult.rows.length > 0) {
        const defaultGroupId = defaultGroupResult.rows[0].id;
        for (const studentId of studentIds) {
          await query(
            'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
            [defaultGroupId, studentId]
          );
        }
      }

      // Add students to the new group
      for (const studentId of studentIds) {
        await query(`
          INSERT INTO group_members (group_id, user_id)
          VALUES ($1, $2)
        `, [group.id, studentId]);
      }
    } else {
      // If no students specified, add creator as member (backward compatibility)
      await query(`
        INSERT INTO group_members (group_id, user_id)
        VALUES ($1, $2)
      `, [group.id, currentUser.id]);

      // Set creator as leader
      await query(`
        UPDATE groups SET leader_id = $1 WHERE id = $2
      `, [currentUser.id, group.id]);
    }

    res.status(201).json({
      message: 'Group created successfully',
      group
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Add member to group
router.post('/:id/members', [
  authenticateToken,
  body('userId').isUUID(),
  body('role').optional().isIn(['leader', 'member'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { userId, role = 'member' } = req.body;
    const currentUser = req.user;

    // Get group details
    const groupResult = await query(
      'SELECT * FROM groups WHERE id = $1',
      [id]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = groupResult.rows[0];

    // Check if current user can add members (must be group leader or instructor)
    if (currentUser.role === 'student') {
      const leadershipResult = await query(
        'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND role = $3',
        [id, currentUser.id, 'leader']
      );

      if (leadershipResult.rows.length === 0) {
        return res.status(403).json({ error: 'Only group leaders can add members' });
      }
    }

    // Check if user exists and is a student
    const userResult = await query(
      'SELECT id, role FROM users WHERE id = $1 AND is_active = true',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userResult.rows[0].role !== 'student') {
      return res.status(400).json({ error: 'Only students can be added to groups' });
    }

    // Check if user is already a member of this specific group
    const membershipResult = await query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (membershipResult.rows.length > 0) {
      return res.status(409).json({ error: 'User is already a member of this group' });
    }

    // Check group capacity
    const currentMembersResult = await query(
      'SELECT COUNT(*) as count FROM group_members WHERE group_id = $1',
      [id]
    );

    const currentMemberCount = parseInt(currentMembersResult.rows[0].count);
    if (currentMemberCount >= group.max_members) {
      return res.status(400).json({ error: 'Group is at maximum capacity' });
    }

    // If this is not a default group, remove user from default group of the same class
    if (!group.is_default) {
      const defaultGroupResult = await query(
        'SELECT id FROM groups WHERE class_id = $1 AND is_default = true',
        [group.class_id]
      );

      if (defaultGroupResult.rows.length > 0) {
        const defaultGroupId = defaultGroupResult.rows[0].id;
        await query(
          'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
          [defaultGroupId, userId]
        );
      }
    }

    // Add member to the target group
    await query(`
      INSERT INTO group_members (group_id, user_id)
      VALUES ($1, $2)
    `, [id, userId]);

    res.json({ message: 'Member added successfully' });
  } catch (error) {
    console.error('Add group member error:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// Remove member from group
router.delete('/:id/members/:userId', authenticateToken, async (req, res) => {
  try {
    const { id, userId } = req.params;
    const currentUser = req.user;

    // Check if current user can remove members
    if (currentUser.role === 'student') {
      // Students can only remove themselves or if they are group leader
      if (currentUser.id !== userId) {
        // Check if current user is the group leader
        const groupDetails = await query(
          'SELECT leader_id FROM groups WHERE id = $1',
          [id]
        );

        if (groupDetails.rows.length === 0 || groupDetails.rows[0].leader_id !== currentUser.id) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
    }

    // Get group details to find the class
    const groupResult = await query(
      'SELECT class_id, is_default FROM groups WHERE id = $1',
      [id]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = groupResult.rows[0];

    // Don't allow removing from default group
    if (group.is_default) {
      return res.status(400).json({ error: 'Cannot remove members from default group' });
    }

    // Check if membership exists
    const membershipResult = await query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (membershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    // Don't allow removing the group leader (if this user is the leader)
    const groupDetails = await query(
      'SELECT leader_id FROM groups WHERE id = $1',
      [id]
    );

    if (groupDetails.rows.length > 0 && groupDetails.rows[0].leader_id === userId) {
      return res.status(400).json({ error: 'Cannot remove the group leader. Please assign a new leader first.' });
    }

    // Remove member from current group
    await query(
      'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
      [id, userId]
    );

    // Add member to default group of the same class
    const defaultGroupResult = await query(
      'SELECT id FROM groups WHERE class_id = $1 AND is_default = true',
      [group.class_id]
    );

    if (defaultGroupResult.rows.length > 0) {
      const defaultGroupId = defaultGroupResult.rows[0].id;

      // Check if user is already in default group
      const existingMembershipResult = await query(
        'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
        [defaultGroupId, userId]
      );

      if (existingMembershipResult.rows.length === 0) {
        await query(
          'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
          [defaultGroupId, userId]
        );
      }
    }

    res.json({ message: 'Member removed successfully and moved to default group' });
  } catch (error) {
    console.error('Remove group member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Update group
router.put('/:id', [
  authenticateToken,
  body('groupName').optional().trim().isLength({ min: 1, max: 100 }),
  body('maxMembers').optional().isInt({ min: 1, max: 10 }),
  body('leaderId').optional().isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { groupName, maxMembers, description, leaderId } = req.body;
    const currentUser = req.user;

    // Check if current user can update group
    if (currentUser.role === 'student') {
      const leadershipResult = await query(
        'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND role = $3',
        [id, currentUser.id, 'leader']
      );

      if (leadershipResult.rows.length === 0) {
        return res.status(403).json({ error: 'Only group leaders can update group details' });
      }
    }

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (groupName) {
      updateFields.push(`name = $${paramCount}`);
      values.push(groupName);
      paramCount++;
    }

    if (maxMembers) {
      // Check if new max is not less than current member count
      const currentMembersResult = await query(
        'SELECT COUNT(*) as count FROM group_members WHERE group_id = $1',
        [id]
      );

      const currentMemberCount = parseInt(currentMembersResult.rows[0].count);
      if (maxMembers < currentMemberCount) {
        return res.status(400).json({ 
          error: `Cannot set max members to ${maxMembers}. Current member count is ${currentMemberCount}` 
        });
      }

      updateFields.push(`max_members = $${paramCount}`);
      values.push(maxMembers);
      paramCount++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (leaderId !== undefined) {
      updateFields.push(`leader_id = $${paramCount}`);
      values.push(leaderId);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id);

    const result = await query(`
      UPDATE groups 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Update group leader if changed
    if (leaderId !== undefined) {
      // The leader_id is already updated in the groups table via the UPDATE query above
      // No need to update group_members table since we don't have role column
    }

    res.json({
      message: 'Group updated successfully',
      group: result.rows[0]
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// Delete group
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Check if current user can delete group
    if (currentUser.role === 'student') {
      const leadershipResult = await query(
        'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND role = $3',
        [id, currentUser.id, 'leader']
      );

      if (leadershipResult.rows.length === 0) {
        return res.status(403).json({ error: 'Only group leaders can delete groups' });
      }
    }

    // Check if group has any schedule assignments
    const assignmentsResult = await query(
      'SELECT COUNT(*) as count FROM schedule_assignments WHERE group_id = $1',
      [id]
    );

    if (parseInt(assignmentsResult.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete group with existing schedule assignments' 
      });
    }

    const result = await query(
      'DELETE FROM groups WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// Get available students for a class (students from default group of the class)
router.get('/available-students/:classId', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;

    // Get students from the default group of this class
    const result = await query(`
      SELECT DISTINCT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.student_id
      FROM users u
      JOIN group_members gm ON u.id = gm.user_id
      JOIN groups g ON gm.group_id = g.id
      WHERE g.class_id = $1
        AND g.is_default = true
        AND u.role = 'student'
        AND u.is_active = true
      ORDER BY u.first_name, u.last_name
    `, [classId]);

    const students = result.rows.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      studentId: row.student_id
    }));

    res.json(students);
  } catch (error) {
    console.error('Get available students error:', error);
    res.status(500).json({ error: 'Failed to fetch available students' });
  }
});


module.exports = router;
