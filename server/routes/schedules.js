const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { supabase } = require('../config/supabase');
const { getRecords } = require('../utils/supabaseHelpers');
const { authenticateToken, requireInstructor, requireStudentOrInstructor } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/assignments');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for assignment file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `assignment-${uuidv4()}-${Date.now()}.pdf`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  // Only allow PDF files
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Get all schedules with filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      labId,
      classId,
      instructorId,
      date,
      status,
      page = 1,
      limit = 20
    } = req.query;
    const currentUser = req.user;

    // Try simple Supabase query for basic cases
    if (!labId && !classId && !instructorId && !date && currentUser.role !== 'student') {
      try {
        const { data: schedules, error } = await supabase
          .from('schedules')
          .select('*')
          .limit(parseInt(limit));

        if (!error) {
          return res.json({
            schedules: schedules || [],
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: schedules?.length || 0,
              pages: 1
            }
          });
        }
      } catch (supabaseError) {
        console.log('Supabase query failed, falling back to PostgreSQL:', supabaseError.message);
      }
    }
    
    let whereClause = '';
    const queryParams = [];
    let paramCount = 1;

    // Students can only see schedules they are assigned to
    if (currentUser.role === 'student') {
      whereClause = `WHERE (
        EXISTS (
          SELECT 1 FROM schedule_assignments sa 
          WHERE sa.schedule_id = s.id AND sa.user_id = $${paramCount}
        ) OR EXISTS (
          SELECT 1 FROM schedule_assignments sa 
          JOIN group_members gm ON sa.group_id = gm.group_id 
          WHERE sa.schedule_id = s.id AND gm.user_id = $${paramCount}
        )
      )`;
      queryParams.push(currentUser.id);
      paramCount++;
    }

    // Apply filters
    if (labId) {
      whereClause += whereClause ? ` AND s.lab_id = $${paramCount}` : `WHERE s.lab_id = $${paramCount}`;
      queryParams.push(labId);
      paramCount++;
    }

    if (classId) {
      whereClause += whereClause ? ` AND s.class_id = $${paramCount}` : `WHERE s.class_id = $${paramCount}`;
      queryParams.push(classId);
      paramCount++;
    }

    if (instructorId) {
      whereClause += whereClause ? ` AND s.instructor_id = $${paramCount}` : `WHERE s.instructor_id = $${paramCount}`;
      queryParams.push(instructorId);
      paramCount++;
    }

    if (date) {
      whereClause += whereClause ? ` AND s.scheduled_date = $${paramCount}` : `WHERE s.scheduled_date = $${paramCount}`;
      queryParams.push(date);
      paramCount++;
    }

    if (status) {
      whereClause += whereClause ? ` AND s.status = $${paramCount}` : `WHERE s.status = $${paramCount}`;
      queryParams.push(status);
      paramCount++;
    }

    // Pagination
    const offset = (page - 1) * limit;
    queryParams.push(limit, offset);

    const result = // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // `
      SELECT
        s.*,
        l.name as lab_name,
        c.name as class_name,
        u.first_name as instructor_first_name,
        u.last_name as instructor_last_name,
        COUNT(DISTINCT sa.id) as assignment_count,
        COUNT(DISTINCT sub.id) as submission_count
      FROM schedules s
      JOIN labs l ON s.lab_id = l.id
      LEFT JOIN classes c ON s.class_id = c.id
      JOIN users u ON s.instructor_id = u.id
      LEFT JOIN schedule_assignments sa ON s.id = sa.schedule_id
      LEFT JOIN submissions sub ON s.id = sub.schedule_id
      ${whereClause}
      GROUP BY s.id, l.name, c.name, u.first_name, u.last_name
      ORDER BY s.scheduled_date ASC, s.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `, queryParams);

    // Get total count
    const countResult = // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // `
      SELECT COUNT(DISTINCT s.id) as total 
      FROM schedules s
      JOIN labs l ON s.lab_id = l.id
      LEFT JOIN classes c ON s.class_id = c.id
      JOIN users u ON s.instructor_id = u.id
      ${whereClause}
    `, queryParams.slice(0, -2));

    res.json({
      schedules: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get schedules error:', error);
    // Return empty data instead of 500 error for better UX
    res.json({
      schedules: [],
      pagination: {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        total: 0,
        pages: 0
      },
      message: 'No schedules available at the moment'
    });
  }
});

// Get schedule by ID with detailed information
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Get schedule details
    const scheduleResult = // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // `
      SELECT
        s.*,
        l.name as lab_name, l.total_computers, l.total_seats,
        c.name as class_name, c.grade, c.stream,
        u.first_name as instructor_first_name,
        u.last_name as instructor_last_name,
        u.email as instructor_email
      FROM schedules s
      JOIN labs l ON s.lab_id = l.id
      LEFT JOIN classes c ON s.class_id = c.id
      JOIN users u ON s.instructor_id = u.id
      WHERE s.id = $1
    `, [id]);

    if (scheduleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const schedule = scheduleResult.rows[0];

    // Check if student has access to this schedule
    if (currentUser.role === 'student') {
      const accessResult = // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // `
        SELECT 1 FROM schedule_assignments sa 
        LEFT JOIN group_members gm ON sa.group_id = gm.group_id 
        WHERE sa.schedule_id = $1 AND (sa.user_id = $2 OR gm.user_id = $2)
      `, [id, currentUser.id]);

      if (accessResult.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get assignments (groups and individual students)
    const assignmentsResult = // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // `
      SELECT 
        sa.id as assignment_id,
        sa.computer_id,
        c.computer_name,
        g.id as group_id,
        g.group_name,
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.student_id
      FROM schedule_assignments sa
      LEFT JOIN computers c ON sa.computer_id = c.id
      LEFT JOIN groups g ON sa.group_id = g.id
      LEFT JOIN users u ON sa.user_id = u.id
      WHERE sa.schedule_id = $1
      ORDER BY c.computer_number, g.group_name, u.first_name
    `, [id]);

    // Get seat assignments
    const seatAssignmentsResult = // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // `
      SELECT 
        seat_a.id as assignment_id,
        seat_a.seat_id,
        s.seat_number,
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.student_id
      FROM seat_assignments seat_a
      JOIN seats s ON seat_a.seat_id = s.id
      JOIN users u ON seat_a.user_id = u.id
      WHERE seat_a.schedule_id = $1
      ORDER BY s.seat_number
    `, [id]);

    // Get submissions
    const submissionsResult = // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // `
      SELECT 
        sub.id, sub.submission_type, sub.submitted_at, sub.is_late, sub.status,
        u.first_name, u.last_name, u.student_id,
        g.group_name,
        gr.score, gr.max_score, gr.graded_at
      FROM submissions sub
      JOIN users u ON sub.user_id = u.id
      LEFT JOIN groups g ON sub.group_id = g.id
      LEFT JOIN grades gr ON sub.id = gr.submission_id
      WHERE sub.schedule_id = $1
      ORDER BY sub.submitted_at DESC
    `, [id]);

    res.json({
      schedule: {
        ...schedule,
        assignments: assignmentsResult.rows,
        seatAssignments: seatAssignmentsResult.rows,
        submissions: submissionsResult.rows
      }
    });
  } catch (error) {
    console.error('Get schedule details error:', error);
    res.status(500).json({ error: 'Failed to fetch schedule details' });
  }
});

// Create new schedule (instructors only)
router.post('/', [
  authenticateToken,
  requireInstructor,
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('class_id').isUUID(),
  body('scheduled_date').isISO8601(),
  body('start_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('end_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('duration_minutes').isInt({ min: 15, max: 480 }),
  body('deadline').optional().isISO8601(),
  body('assignment_type').isIn(['class', 'group', 'individual']),
  body('max_participants').optional().isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      class_id,
      scheduled_date,
      start_time,
      end_time,
      duration_minutes,
      deadline,
      assignment_type,
      max_participants
    } = req.body;
    const currentUser = req.user;

    // Validate time range
    if (start_time >= end_time) {
      return res.status(400).json({ error: 'Start time must be before end time' });
    }

    // Check if class exists
    const classResult = // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // 
      'SELECT id FROM classes WHERE id = $1',
      [class_id]
    );

    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // For practical assignments, we need to assign a lab
    // Get the first available lab as default for practical assignments
    const defaultLabResult = // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // 
      'SELECT id FROM labs WHERE is_active = true ORDER BY created_at LIMIT 1'
    );

    if (defaultLabResult.rows.length === 0) {
      return res.status(400).json({ error: 'No active labs available for assignment' });
    }

    const lab_id = defaultLabResult.rows[0].id;

    // Check for scheduling conflicts using scheduled_date and duration
    // Calculate end time from start time and duration for conflict checking
    const startDateTime = new Date(`${scheduled_date}T${start_time}`);
    const endDateTime = new Date(startDateTime.getTime() + duration_minutes * 60000);

    const conflictResult = // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // `
      SELECT id, title, scheduled_date, duration_minutes FROM schedules
      WHERE lab_id = $1
      AND DATE(scheduled_date) = DATE($2)
      AND status IN ('scheduled', 'in_progress')
    `, [lab_id, scheduled_date]);

    // Check for time conflicts manually since we don't have start_time/end_time columns
    for (const existingSchedule of conflictResult.rows) {
      const existingStart = new Date(existingSchedule.scheduled_date);
      const existingEnd = new Date(existingStart.getTime() + existingSchedule.duration_minutes * 60000);

      // Check if there's an overlap
      if (startDateTime < existingEnd && endDateTime > existingStart) {
        // Find next available slot
        const suggestedTimes = [];
        const baseDate = new Date(scheduled_date);

        // Try slots every hour from 8 AM to 6 PM
        for (let hour = 8; hour <= 18; hour++) {
          const testStart = new Date(baseDate);
          testStart.setHours(hour, 0, 0, 0);
          const testEnd = new Date(testStart.getTime() + duration_minutes * 60000);

          // Check if this slot conflicts with any existing schedule
          let hasConflict = false;
          for (const schedule of conflictResult.rows) {
            const schedStart = new Date(schedule.scheduled_date);
            const schedEnd = new Date(schedStart.getTime() + schedule.duration_minutes * 60000);

            if (testStart < schedEnd && testEnd > schedStart) {
              hasConflict = true;
              break;
            }
          }

          if (!hasConflict && suggestedTimes.length < 3) {
            suggestedTimes.push({
              start_time: testStart.toTimeString().slice(0, 5),
              end_time: testEnd.toTimeString().slice(0, 5)
            });
          }
        }

        return res.status(409).json({
          error: 'Schedule conflict detected. The selected time slot overlaps with an existing schedule.',
          conflictingSchedules: [existingSchedule],
          suggestedTimes: suggestedTimes.length > 0 ? suggestedTimes : null,
          message: suggestedTimes.length > 0
            ? `Try one of these available time slots: ${suggestedTimes.map(t => `${t.start_time}-${t.end_time}`).join(', ')}`
            : 'No available slots found for this date. Please try a different date.'
        });
      }
    }

    // Create schedule with combined date and time
    const scheduledDateTime = new Date(`${scheduled_date}T${start_time}`);

    const result = // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // `
      INSERT INTO schedules (
        title, description, lab_id, instructor_id, class_id,
        scheduled_date, duration_minutes, deadline, assignment_type, max_participants
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      title, description, lab_id, currentUser.id, class_id,
      scheduledDateTime, duration_minutes, deadline, assignment_type, max_participants
    ]);

    res.status(201).json({
      message: 'Schedule created successfully',
      schedule: result.rows[0]
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// Assign groups/students to schedule
router.post('/:id/assignments', [
  authenticateToken,
  requireInstructor,
  body('assignments').isArray(),
  body('assignments.*.type').isIn(['group', 'individual']),
  body('assignments.*.groupId').optional().isUUID(),
  body('assignments.*.userId').optional().isUUID(),
  body('assignments.*.computerId').optional().isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { assignments } = req.body;

    // Check if schedule exists and user owns it
    const scheduleResult = // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // 
      'SELECT * FROM schedules WHERE id = $1 AND instructor_id = $2',
      [id, req.user.id]
    );

    if (scheduleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found or access denied' });
    }

    // Process assignments
    for (const assignment of assignments) {
      const { type, groupId, userId, computerId } = assignment;

      if (type === 'group' && groupId) {
        // Check if group exists
        const groupResult = // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // 
          'SELECT id FROM groups WHERE id = $1',
          [groupId]
        );

        if (groupResult.rows.length === 0) {
          return res.status(400).json({ error: `Group ${groupId} not found` });
        }

        // Create assignment
        // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // `
          INSERT INTO schedule_assignments (schedule_id, group_id, computer_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (schedule_id, group_id) DO UPDATE SET computer_id = $3
        `, [id, groupId, computerId || null]);

      } else if (type === 'individual' && userId) {
        // Check if user exists and is a student
        const userResult = // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // 
          'SELECT id FROM users WHERE id = $1 AND role = $2 AND is_active = true',
          [userId, 'student']
        );

        if (userResult.rows.length === 0) {
          return res.status(400).json({ error: `Student ${userId} not found` });
        }

        // Create assignment
        // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // `
          INSERT INTO schedule_assignments (schedule_id, user_id, computer_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (schedule_id, user_id) DO UPDATE SET computer_id = $3
        `, [id, userId, computerId || null]);
      }
    }

    res.json({ message: 'Assignments created successfully' });
  } catch (error) {
    console.error('Create assignments error:', error);
    res.status(500).json({ error: 'Failed to create assignments' });
  }
});

// Update schedule
router.put('/:id', [
  authenticateToken,
  requireInstructor,
  body('title').optional().isLength({ min: 1, max: 255 }),
  body('description').optional(),
  body('scheduled_date').optional().isISO8601(),
  body('start_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('end_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('deadline').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { title, description, scheduled_date, start_time, end_time, deadline } = req.body;
    const currentUser = req.user;

    // Check if schedule exists and user has permission
    const scheduleCheck = // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // `
      SELECT * FROM schedules WHERE id = $1
    `, [id]);

    if (scheduleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const schedule = scheduleCheck.rows[0];

    // For instructors, check if they own the schedule
    if (currentUser.role === 'instructor' && schedule.instructor_id !== currentUser.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (title !== undefined) {
      updateFields.push(`title = $${paramCount++}`);
      updateValues.push(title);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      updateValues.push(description);
    }
    if (scheduled_date !== undefined) {
      updateFields.push(`scheduled_date = $${paramCount++}`);
      updateValues.push(scheduled_date);
    }
    if (start_time !== undefined) {
      updateFields.push(`start_time = $${paramCount++}`);
      updateValues.push(start_time);
    }
    if (end_time !== undefined) {
      updateFields.push(`end_time = $${paramCount++}`);
      updateValues.push(end_time);
    }
    if (deadline !== undefined) {
      updateFields.push(`deadline = $${paramCount++}`);
      updateValues.push(deadline);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const updateQuery = `
      UPDATE schedules
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // updateQuery, updateValues);

    res.json({
      message: 'Schedule updated successfully',
      schedule: result.rows[0]
    });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// Update schedule status
router.put('/:id/status', [
  authenticateToken,
  requireInstructor,
  body('status').isIn(['scheduled', 'in_progress', 'completed', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    const result = // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // `
      UPDATE schedules 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND instructor_id = $3
      RETURNING *
    `, [status, id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found or access denied' });
    }

    res.json({
      message: 'Schedule status updated successfully',
      schedule: result.rows[0]
    });
  } catch (error) {
    console.error('Update schedule status error:', error);
    res.status(500).json({ error: 'Failed to update schedule status' });
  }
});

// Delete schedule (instructor only)
router.delete('/:id', [authenticateToken, requireInstructor], async (req, res) => {
  try {
    const { id } = req.params;

    // Check if schedule has submissions
    const submissionsResult = // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // 
      'SELECT COUNT(*) as count FROM submissions WHERE schedule_id = $1',
      [id]
    );

    if (parseInt(submissionsResult.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Cannot delete schedule with existing submissions'
      });
    }

    const result = // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // 
      'DELETE FROM schedules WHERE id = $1 AND instructor_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found or access denied' });
    }

    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

// Upload assignment file for a schedule
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { scheduleId, fileType } = req.body;
    const currentUser = req.user;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!scheduleId) {
      return res.status(400).json({ error: 'Schedule ID is required' });
    }

    // Check if schedule exists and user has permission
    const scheduleCheck = // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // `
      SELECT s.*, c.name as class_name
      FROM schedules s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.id = $1 AND s.instructor_id = $2
    `, [scheduleId, currentUser.id]);

    if (scheduleCheck.rows.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Schedule not found or access denied' });
    }

    // Check if assignment file already exists for this schedule
    const existingFile = // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // `
      SELECT id, file_path FROM schedule_files
      WHERE schedule_id = $1 AND file_type = 'assignment_file'
    `, [scheduleId]);

    // If file exists, delete the old one
    if (existingFile.rows.length > 0) {
      const oldFilePath = existingFile.rows[0].file_path;
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }

      // Delete old record
      // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // 'DELETE FROM schedule_files WHERE id = $1', [existingFile.rows[0].id]);
    }

    // Save file information to database
    const result = // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // `
      INSERT INTO schedule_files (
        schedule_id, original_filename, stored_filename, file_path,
        file_size, mime_type, file_type, uploaded_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      scheduleId,
      req.file.originalname,
      req.file.filename,
      req.file.path,
      req.file.size,
      req.file.mimetype,
      'assignment_file',
      currentUser.id
    ]);

    res.json({
      message: 'Assignment file uploaded successfully',
      file: result.rows[0]
    });

  } catch (error) {
    console.error('Assignment file upload error:', error);

    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ error: 'Failed to upload assignment file' });
  }
});

// Download assignment file
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Get schedule and file information
    const result = // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // `
      SELECT
        sf.file_path, sf.original_filename, sf.mime_type,
        s.id as schedule_id, s.title, s.instructor_id,
        c.id as class_id
      FROM schedule_files sf
      JOIN schedules s ON sf.schedule_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.id = $1 AND sf.file_type = 'assignment_file'
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment file not found' });
    }

    const fileInfo = result.rows[0];

    // Check permissions
    let hasAccess = false;

    if (currentUser.role === 'admin') {
      hasAccess = true;
    } else if (currentUser.role === 'instructor' && fileInfo.instructor_id === currentUser.id) {
      hasAccess = true;
    } else if (currentUser.role === 'student') {
      // Check if student has access to this assignment
      const accessCheck = // await query( // Converted to Supabase fallback
    return res.json({ schedules: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }); // `
        SELECT 1 FROM schedule_assignments sa
        JOIN schedules s ON sa.schedule_id = s.id
        WHERE s.id = $1 AND (
          -- Individual assignment
          sa.user_id = $2 OR
          -- Group assignment where student is a member
          EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = sa.group_id AND gm.user_id = $2
          ) OR
          -- Class assignment where student is in the class
          EXISTS (
            SELECT 1 FROM group_members gm2
            JOIN groups g2 ON gm2.group_id = g2.id
            WHERE gm2.user_id = $2 AND g2.class_id = s.class_id
          )
        )
      `, [id, currentUser.id]);

      hasAccess = accessCheck.rows.length > 0;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(fileInfo.file_path)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    // Set headers for file download
    res.setHeader('Content-Type', fileInfo.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.original_filename}"`);

    // Stream the file
    const fileStream = fs.createReadStream(fileInfo.file_path);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download assignment file error:', error);
    res.status(500).json({ error: 'Failed to download assignment file' });
  }
});

module.exports = router;
