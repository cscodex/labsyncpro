const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireInstructor, requireAdmin } = require('../middleware/auth');
const {
  createEmailAccount,
  generateEmailAddress,
  sendWelcomeEmail
} = require('../services/emailService');

const router = express.Router();

// Get all users (instructors and admins only)
router.get('/', [authenticateToken, requireInstructor], async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20, classId } = req.query;

    // Try Supabase first, fallback to PostgreSQL if needed
    try {
      let query = supabase.from('users').select('*');

      // Filter by role
      if (role && ['student', 'instructor', 'admin'].includes(role)) {
        query = query.eq('role', role);
      }

      // Filter by active status for non-admin users
      if (req.user.role !== 'admin') {
        query = query.eq('is_active', true);
      }

      // Search functionality
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,student_id.ilike.%${search}%`);
      }

      // Pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query = query.range(offset, offset + parseInt(limit) - 1);

      const { data: users, error, count } = await query;

      if (error) throw error;

      return res.json({
        users: users || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / parseInt(limit))
        }
      });
    } catch (supabaseError) {
      console.log('Supabase query failed, falling back to PostgreSQL:', supabaseError.message);
      // Continue with original PostgreSQL logic below
    }

    // Show all users for admin, only active for instructors
    let whereClause = req.user.role === 'admin' ? 'WHERE 1=1' : 'WHERE u.is_active = true';
    const queryParams = [];
    let paramCount = 1;

    // Filter by role
    if (role && ['student', 'instructor', 'admin'].includes(role)) {
      whereClause += ` AND u.role = $${paramCount}`;
      queryParams.push(role);
      paramCount++;
    }

    // Filter students by class (students who belong to groups in the specified class)
    if (classId && role === 'student') {
      whereClause += ` AND EXISTS (
// Removed SQL fragment: SELECT 1 FROM group_members gm
        JOIN groups g ON gm.group_id = g.id
        WHERE gm.user_id = u.id AND g.class_id = $${paramCount}
      )`;
      queryParams.push(classId);
      paramCount++;
    }

    // Search functionality
    if (search) {
      whereClause += ` AND (
        u.first_name ILIKE $${paramCount} OR
        u.last_name ILIKE $${paramCount} OR
        u.email ILIKE $${paramCount} OR
        u.student_id ILIKE $${paramCount}
      )`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    // Get all users with additional role-specific information
    const result = await query(`
// Removed SQL fragment: SELECT
        u.id, u.email, u.first_name, u.last_name, u.role, u.student_id,
        u.is_active, u.created_at,
        CASE 
          WHEN u.role = 'student' THEN (
            SELECT json_agg(
              json_build_object(
                'class_id', c.id,
                'class_name', c.name,
                'grade', c.grade,
                'stream', c.stream
              )
            )
            FROM group_members gm
            JOIN groups g ON gm.group_id = g.id
            JOIN classes c ON g.class_id = c.id
            WHERE gm.user_id = u.id
          )
          WHEN u.role = 'instructor' THEN (
            SELECT json_agg(
              json_build_object(
                'lab_id', l.id,
                'lab_name', l.name,
                'location', l.location
              )
            )
            FROM (
              SELECT DISTINCT l.id, l.name, l.location
              FROM schedules s
              JOIN labs l ON s.lab_id = l.id
              WHERE s.instructor_id = u.id
            ) l
          )
          ELSE NULL
        END as role_data
      FROM users u
      ${whereClause}
      ORDER BY u.created_at DESC
    `, queryParams);

    // Format the response for the frontend
    const formattedUsers = result.rows.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      studentId: user.student_id,
      isActive: user.is_active,
      createdAt: user.created_at,
      classes: user.role === 'student' ? user.role_data : null,
      labs: user.role === 'instructor' ? user.role_data : null
    }));

    res.json({ users: formattedUsers });
  } catch (error) {
    console.error('Get users error:', error);
    // Return empty data instead of 500 error for better UX
    res.json({
      users: [],
      pagination: {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        total: 0,
        pages: 0
      },
      message: 'No users available at the moment'
    });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Students can only view their own profile, instructors can view all
    if (currentUser.role === 'student' && currentUser.id !== id) {
      return res.status(403).json({ error: 'Access denied' });
// Removed orphaned closing brace
    // Try Supabase first
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, student_id, is_active, created_at')
      .eq('id', id)
      .limit(1);

    if (error) {
      console.error('Supabase error:', error);
      // Duplicate return: res.status(500).json({ error: 'Failed to fetch user' });
// Removed orphaned closing brace
    if (!users || users.length === 0) {
      // Duplicate return: res.status(404).json({ error: 'User not found' });
// Removed orphaned closing brace
    const user = users[0];

    // If it's a student, get additional information
    if (user.role === 'student') {
      // Get groups the student belongs to
      const groupsResult = await query(`
// Removed SQL fragment: SELECT 
          g.id, g.group_name, g.max_members,
          c.class_code, c.grade, c.stream, c.section,
          gm.role as group_role, gm.joined_at
        FROM group_members gm
        JOIN groups g ON gm.group_id = g.id
        JOIN classes c ON g.class_id = c.id
        WHERE gm.user_id = $1
        ORDER BY gm.joined_at DESC
      `, [id]);

      user.groups = groupsResult.rows;

      // Get recent submissions
      const submissionsResult = await query(`
// Removed SQL fragment: SELECT 
          s.id, s.submission_type, s.submitted_at, s.is_late, s.status,
          sch.title as schedule_title, sch.scheduled_date,
          g.score, g.max_score, g.graded_at
        FROM submissions s
        JOIN schedules sch ON s.schedule_id = sch.id
        LEFT JOIN grades g ON s.id = g.submission_id
        WHERE s.user_id = $1
        ORDER BY s.submitted_at DESC
        LIMIT 10
      `, [id]);

      user.recentSubmissions = submissionsResult.rows;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user (admin only)
router.post('/', [
  authenticateToken,
  requireAdmin,
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('role').isIn(['student', 'instructor', 'admin']),
  body('studentId').optional().isLength({ min: 8, max: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
// Removed orphaned closing brace
    const { email, password, firstName, lastName, role, studentId } = req.body;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 OR ($2::text IS NOT NULL AND student_id = $2)',
      [email, studentId || null]
    );

    if (existingUser.rows.length > 0) {
      // Duplicate return: res.status(409).json({ error: 'User already exists' });
// Removed orphaned closing brace
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate email address for mail server
    const mailAddress = generateEmailAddress(firstName, lastName, studentId);
    const tempMailPassword = `temp${Math.random().toString(36).slice(-8)}`;

    // Insert new user
    const result = await query(`
// Removed SQL fragment: INSERT INTO users (email, password_hash, first_name, last_name, role, student_id, mail_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, first_name, last_name, role, student_id, mail_address, created_at
    `, [email, passwordHash, firstName, lastName, role, studentId || null, mailAddress]);

    const user = result.rows[0];

    // Create email account on mail server
    const emailResult = await createEmailAccount(mailAddress, tempMailPassword);

    if (emailResult.success) {
      console.log(`Email account created for ${user.first_name} ${user.last_name}: ${mailAddress}`);

      // Send welcome email with mail credentials
      await sendWelcomeEmail(email, firstName, tempMailPassword, mailAddress);
    } else {
      console.error(`Failed to create email account for ${mailAddress}:`, emailResult.error);
    }

    res.status(201).json({
      message: 'User created successfully',
      user: {
        ...user,
        mailAddress: user.mail_address
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', [
  authenticateToken,
  body('email').optional().isEmail().normalizeEmail(),
  body('firstName').optional().trim().isLength({ min: 1 }),
  body('lastName').optional().trim().isLength({ min: 1 }),
  body('studentId').optional().isLength({ min: 8, max: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
// Removed orphaned closing brace
    const { id } = req.params;
    const currentUser = req.user;
    const { email, firstName, lastName, studentId, isActive } = req.body;

    // Students can only update their own profile
    // Instructors can update student profiles
    // Admins can update any profile
    if (currentUser.role === 'student' && currentUser.id !== id) {
      // Duplicate return: res.status(403).json({ error: 'Access denied' });
// Removed orphaned closing brace
    // Only admins can change isActive status
    if (isActive !== undefined && currentUser.role !== 'admin') {
      // Duplicate return: res.status(403).json({ error: 'Only admins can change account status' });
// Removed orphaned closing brace
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (email) {
      updateFields.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }

    if (firstName) {
      updateFields.push(`first_name = $${paramCount}`);
      values.push(firstName);
      paramCount++;
    }

    if (lastName) {
      updateFields.push(`last_name = $${paramCount}`);
      values.push(lastName);
      paramCount++;
    }

    if (studentId) {
      updateFields.push(`student_id = $${paramCount}`);
      values.push(studentId);
      paramCount++;
    }

    if (isActive !== undefined && currentUser.role === 'admin') {
      updateFields.push(`is_active = $${paramCount}`);
      values.push(isActive);
      paramCount++;
    }

    if (updateFields.length === 0) {
      // Duplicate return: res.status(400).json({ error: 'No valid fields to update' });
// Removed orphaned closing brace
    values.push(id);

    const result = await query(`
// Removed SQL fragment: UPDATE users 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, email, first_name, last_name, role, student_id, is_active, updated_at
    `, values);

    if (result.rows.length === 0) {
      // Duplicate return: res.status(404).json({ error: 'User not found' });
// Removed orphaned closing brace
    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Block/Unblock user (admin only)
router.put('/:id/block', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean value' });
// Removed orphaned closing brace
    // Check if user exists
    const userCheck = await query(
      'SELECT id, email, first_name, last_name, role FROM users WHERE id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      // Duplicate return: res.status(404).json({ error: 'User not found' });
// Removed orphaned closing brace
    const user = userCheck.rows[0];

    // Prevent admin from blocking themselves
    if (req.user.id === id && !isActive) {
      // Duplicate return: res.status(400).json({ error: 'You cannot block yourself' });
// Removed orphaned closing brace
    // Update user status
    const result = await query(
      'UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, is_active',
      [isActive, id]
    );

    const action = isActive ? 'unblocked' : 'blocked';
    res.json({
      message: `User ${action} successfully`,
      user: {
        id: result.rows[0].id,
        isActive: result.rows[0].is_active
      }
    });

  } catch (error) {
    console.error('Block/unblock user error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Delete user (admin only)
router.delete('/:id', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete by setting is_active to false
    const result = await query(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
// Removed orphaned closing brace
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// Get students for group assignment
router.get('/students/available', authenticateToken, async (req, res) => {
  try {
    const { classId, excludeGroupId } = req.query;

    let whereClause = "WHERE u.role = 'student' AND u.is_active = true";
    const queryParams = [];
    let paramCount = 1;

    // Filter by class if provided
    if (classId) {
      whereClause += ` AND EXISTS (
// Removed SQL fragment: SELECT 1 FROM group_members gm 
        JOIN groups g ON gm.group_id = g.id 
        WHERE gm.user_id = u.id AND g.class_id = $${paramCount}
      )`;
      queryParams.push(classId);
      paramCount++;
    }

    // Exclude students already in a specific group
    if (excludeGroupId) {
      whereClause += ` AND NOT EXISTS (
// Removed SQL fragment: SELECT 1 FROM group_members gm 
        WHERE gm.user_id = u.id AND gm.group_id = $${paramCount}
      )`;
      queryParams.push(excludeGroupId);
      paramCount++;
    }

    const result = await query(`
// Removed SQL fragment: SELECT 
        u.id, u.first_name, u.last_name, u.student_id, u.email,
        COUNT(gm.id) as group_count
      FROM users u
      LEFT JOIN group_members gm ON u.id = gm.user_id
      ${whereClause}
      GROUP BY u.id, u.first_name, u.last_name, u.student_id, u.email
      ORDER BY u.first_name, u.last_name
    `, queryParams);

    res.json({
      students: result.rows
    });
  } catch (error) {
    console.error('Get available students error:', error);
    res.status(500).json({ error: 'Failed to fetch available students' });
  }
});

// Assign lab to instructor (admin only)
router.post('/:id/assign-lab', [
  authenticateToken,
  requireAdmin,
  body('labId').isUUID(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
// Removed orphaned closing brace
    const { id: instructorId } = req.params;
    const { labId } = req.body;

    // Verify the user is an instructor
    const userResult = await query(
      'SELECT role FROM users WHERE id = $1 AND role = $2',
      [instructorId, 'instructor']
    );

    if (userResult.rows.length === 0) {
      // Duplicate return: res.status(404).json({ error: 'Instructor not found' });
// Removed orphaned closing brace
    // Verify the lab exists
    const labResult = await query(
      'SELECT id FROM labs WHERE id = $1',
      [labId]
    );

    if (labResult.rows.length === 0) {
      // Duplicate return: res.status(404).json({ error: 'Lab not found' });
// Removed orphaned closing brace
    // Check if assignment already exists through schedules
    const existingAssignment = await query(
      'SELECT id FROM schedules WHERE instructor_id = $1 AND lab_id = $2',
      [instructorId, labId]
    );

    if (existingAssignment.rows.length > 0) {
      // Duplicate return: res.status(400).json({ error: 'Instructor is already assigned to this lab' });
// Removed orphaned closing brace
    // Create a default schedule entry for the assignment
    await query(`
// Removed SQL fragment: INSERT INTO schedules (title, description, lab_id, instructor_id, scheduled_date, start_time, end_time)
      VALUES ($1, $2, $3, $4, CURRENT_DATE, '09:00', '17:00')
    `, [
      'Default Lab Assignment',
      'Default assignment created for lab access',
      labId,
      instructorId
    ]);

    res.json({ message: 'Lab assigned to instructor successfully' });
  } catch (error) {
    console.error('Assign lab to instructor error:', error);
    res.status(500).json({ error: 'Failed to assign lab to instructor' });
  }
});

// Remove lab assignment from instructor (admin only)
router.delete('/:id/assign-lab/:labId', [
  authenticateToken,
  requireAdmin
], async (req, res) => {
  try {
    const { id: instructorId, labId } = req.params;

    // Remove the default schedule assignment
    const result = await query(`
// Removed SQL fragment: DELETE FROM schedules 
      WHERE instructor_id = $1 AND lab_id = $2 AND title = 'Default Lab Assignment'
    `, [instructorId, labId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
// Removed orphaned closing brace
    res.json({ message: 'Lab assignment removed successfully' });
  } catch (error) {
    console.error('Remove lab assignment error:', error);
    res.status(500).json({ error: 'Failed to remove lab assignment' });
  }
});

// Get all labs for assignment dropdown
router.get('/labs/available', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
// Removed SQL fragment: SELECT id, lab_name, lab_code, total_computers, total_seats
      FROM labs 
      WHERE is_active = true
      ORDER BY lab_name
    `);

    res.json({ labs: result.rows });
  } catch (error) {
    console.error('Get available labs error:', error);
    res.status(500).json({ error: 'Failed to fetch available labs' });
  }
});

module.exports = router;
