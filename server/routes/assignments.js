const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { assignmentUpload } = require('../config/googleDrive');
const FileUploadService = require('../services/fileUploadService');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/assignments/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow common file types
    const allowedTypes = /\.(pdf|doc|docx|txt|zip|rar|jpg|jpeg|png)$/i;
    if (allowedTypes.test(path.extname(file.originalname))) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, ZIP, RAR, JPG, JPEG, PNG files are allowed.'));
    }
  }
});

// Get consolidated assignments (grouped by schedule)
router.get('/consolidated', authenticateToken, async (req, res) => {
  try {
    const {
      classId,
      labId,
      type,
      status,
      page = 1,
      limit = 20
    } = req.query;
    const currentUser = req.user;

    let whereClause = '';
    const queryParams = [];
    let paramCount = 1;

    // Base query to get consolidated assignments
    let baseQuery = `
      SELECT
        s.id as schedule_id,
        s.title as schedule_title,
        s.description,
        s.scheduled_date,
        s.deadline,
        s.duration_minutes,
        s.status,
        s.assignment_type,
        l.name as lab_name,
        c.name as class_name,
        s.class_id,
        CONCAT(instructor.first_name, ' ', instructor.last_name) as instructor_name,
        -- Aggregate assigned groups and individuals
        STRING_AGG(
          DISTINCT CASE
            WHEN sa.group_id IS NOT NULL THEN g.name
            WHEN sa.user_id IS NOT NULL THEN CONCAT(student.first_name, ' ', student.last_name, ' (', student.student_id, ')')
            ELSE NULL
          END,
          ', '
        ) as assigned_to,
        COUNT(DISTINCT sa.id) as assignment_count,
        sf.id as file_id,
        sf.original_filename,
        sf.file_size
      FROM schedules s
      JOIN labs l ON s.lab_id = l.id
      LEFT JOIN classes c ON s.class_id = c.id
      JOIN users instructor ON s.instructor_id = instructor.id
      LEFT JOIN schedule_assignments sa ON s.id = sa.schedule_id
      LEFT JOIN groups g ON sa.group_id = g.id
      LEFT JOIN users student ON sa.user_id = student.id
      LEFT JOIN schedule_files sf ON (s.id = sf.schedule_id AND sf.file_type = 'assignment_file')
    `;

    // Base filter
    whereClause = `WHERE s.id IS NOT NULL`;

    // Filter based on user role
    if (currentUser.role === 'student') {
      // Students see schedules they are assigned to
      whereClause += ` AND EXISTS (
        SELECT 1 FROM schedule_assignments sa2
        WHERE sa2.schedule_id = s.id AND (
          sa2.user_id = $${paramCount} OR
          EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = sa2.group_id AND gm.user_id = $${paramCount}
          ) OR
          (s.assignment_type = 'class' AND EXISTS (
            SELECT 1 FROM group_members gm2
            JOIN groups g2 ON gm2.group_id = g2.id
            WHERE gm2.user_id = $${paramCount} AND g2.class_id = s.class_id
          ))
        )
      )`;
      queryParams.push(currentUser.id);
      paramCount++;
    } else if (currentUser.role === 'instructor') {
      // Instructors see schedules they created
      whereClause += ` AND s.instructor_id = $${paramCount}`;
      queryParams.push(currentUser.id);
      paramCount++;
    }

    // Add additional filters
    if (classId) {
      whereClause += ` AND s.class_id = $${paramCount}`;
      queryParams.push(classId);
      paramCount++;
    }

    if (labId) {
      whereClause += ` AND s.lab_id = $${paramCount}`;
      queryParams.push(labId);
      paramCount++;
    }

    if (type && type !== 'all') {
      whereClause += ` AND s.assignment_type = $${paramCount}`;
      queryParams.push(type);
      paramCount++;
    }

    if (status && status !== 'all') {
      whereClause += ` AND s.status = $${paramCount}`;
      queryParams.push(status);
      paramCount++;
    }

    // Group by schedule and add pagination
    const groupByClause = `
      GROUP BY s.id, s.title, s.description, s.scheduled_date,
               s.deadline, s.duration_minutes, s.status, s.assignment_type, l.name,
               c.name, s.class_id, instructor.first_name, instructor.last_name,
               sf.id, sf.original_filename, sf.file_size
      ORDER BY s.scheduled_date DESC
    `;

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT s.id) as total
      FROM schedules s
      JOIN labs l ON s.lab_id = l.id
      LEFT JOIN classes c ON s.class_id = c.id
      JOIN users instructor ON s.instructor_id = instructor.id
      LEFT JOIN schedule_assignments sa ON s.id = sa.schedule_id
      LEFT JOIN groups g ON sa.group_id = g.id
      LEFT JOIN users student ON sa.user_id = student.id
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams);
    const totalAssignments = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalAssignments / limit);

    // Add pagination to main query
    const offset = (page - 1) * limit;
    queryParams.push(limit, offset);

    const fullQuery = `
      ${baseQuery}
      ${whereClause}
      ${groupByClause}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const result = await query(fullQuery, queryParams);

    res.json({
      assignments: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalAssignments,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching consolidated assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// Get all assignments for the current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      classId,
      labId,
      type,
      status,
      page = 1,
      limit = 20
    } = req.query;
    const currentUser = req.user;

    let whereClause = '';
    const queryParams = [];
    let paramCount = 1;

    // Get assignments with proper grouping for class assignments
    let baseQuery = `
      SELECT DISTINCT
        CASE
          WHEN s.assignment_type = 'class' THEN CONCAT('class_', s.id)
          ELSE sa.id::text
        END as id,
        sa.schedule_id,
        s.title as schedule_title,
        s.description,
        s.scheduled_date,
        s.duration_minutes,
        s.status,
        s.assignment_type,
        l.name as lab_name,
        c.name as class_name,
        s.class_id,
        CONCAT(instructor.first_name, ' ', instructor.last_name) as instructor_name,
        CASE
          WHEN s.assignment_type = 'class' THEN NULL
          ELSE sa.group_id
        END as group_id,
        CASE
          WHEN s.assignment_type = 'class' THEN 'Entire Class'
          ELSE g.name
        END as group_name,
        CASE
          WHEN s.assignment_type = 'class' THEN NULL
          ELSE sa.user_id
        END as user_id,
        CASE
          WHEN s.assignment_type = 'class' THEN NULL
          ELSE CONCAT(student.first_name, ' ', student.last_name)
        END as student_name,
        sa.assigned_computer,
        comp.computer_name,
        sa.assigned_seat,
        sa.created_at as assigned_at,
        s.assignment_type as assignment_scope,
        sf.id as file_id,
        sf.original_filename,
        sf.file_size
      FROM schedule_assignments sa
      JOIN schedules s ON sa.schedule_id = s.id
      JOIN labs l ON s.lab_id = l.id
      LEFT JOIN classes c ON s.class_id = c.id
      JOIN users instructor ON s.instructor_id = instructor.id
      LEFT JOIN groups g ON sa.group_id = g.id
      LEFT JOIN users student ON sa.user_id = student.id
      LEFT JOIN computers comp ON (sa.assigned_computer = comp.computer_number AND comp.lab_id = s.lab_id)
      LEFT JOIN schedule_files sf ON (s.id = sf.schedule_id AND sf.file_type = 'assignment_file')
    `;

    // Base filter to remove invalid assignments
    whereClause = `WHERE (
      -- Remove assignments with no group name when they should have one
      (sa.group_id IS NULL OR g.name IS NOT NULL)
    )`;

    // Filter based on user role
    if (currentUser.role === 'student') {
      // Students see assignments they are directly assigned to or through groups or class-wide
      whereClause += ` AND (
        -- Individual assignments to this student
        sa.user_id = $${paramCount} OR
        -- Group assignments where student is a member
        EXISTS (
          SELECT 1 FROM group_members gm
          WHERE gm.group_id = sa.group_id AND gm.user_id = $${paramCount}
        ) OR
        -- Class-wide assignments through group membership
        EXISTS (
          SELECT 1 FROM group_members gm2
          JOIN groups g2 ON gm2.group_id = g2.id
          WHERE gm2.user_id = $${paramCount} AND g2.class_id = s.class_id
        )
      )`;
      queryParams.push(currentUser.id);
      paramCount++;
    } else if (currentUser.role === 'instructor') {
      // Instructors see assignments for schedules they created
      whereClause += ` AND s.instructor_id = $${paramCount}`;
      queryParams.push(currentUser.id);
      paramCount++;
    }
    // Admins see all assignments (no additional filter)

    // Add additional filters
    if (classId) {
      whereClause += whereClause ? ' AND' : 'WHERE';
      whereClause += ` s.class_id = $${paramCount}`;
      queryParams.push(classId);
      paramCount++;
    }

    if (labId) {
      whereClause += whereClause ? ' AND' : 'WHERE';
      whereClause += ` s.lab_id = $${paramCount}`;
      queryParams.push(labId);
      paramCount++;
    }

    if (type && type !== 'all') {
      whereClause += whereClause ? ' AND' : 'WHERE';
      whereClause += ` s.assignment_type = $${paramCount}`;
      queryParams.push(type);
      paramCount++;
    }

    if (status && status !== 'all') {
      whereClause += whereClause ? ' AND' : 'WHERE';
      whereClause += ` s.status = $${paramCount}`;
      queryParams.push(status);
      paramCount++;
    }

    // Add pagination
    const offset = (page - 1) * limit;
    queryParams.push(limit, offset);

    const fullQuery = `
      WITH deduplicated_assignments AS (
        ${baseQuery}
        ${whereClause}
      )
      SELECT DISTINCT ON (
        CASE
          WHEN assignment_type = 'class' THEN schedule_id::text
          ELSE id
        END
      ) *
      FROM deduplicated_assignments
      ORDER BY
        CASE
          WHEN assignment_type = 'class' THEN schedule_id::text
          ELSE id
        END,
        scheduled_date ASC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const result = await query(fullQuery, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT sa.id) as total
      FROM schedule_assignments sa
      JOIN schedules s ON sa.schedule_id = s.id
      JOIN labs l ON s.lab_id = l.id
      LEFT JOIN classes c ON s.class_id = c.id
      JOIN users instructor ON s.instructor_id = instructor.id
      LEFT JOIN groups g ON sa.group_id = g.id
      LEFT JOIN users student ON sa.user_id = student.id
      LEFT JOIN computers comp ON (sa.assigned_computer = comp.computer_number AND comp.lab_id = s.lab_id)
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams.slice(0, -2));

    // If no assignments found, fall back to showing schedules as potential assignments
    if (result.rows.length === 0) {
      console.log('No assignments found, falling back to schedules...');

      let scheduleQuery = `
        SELECT DISTINCT
          s.id,
          s.id as schedule_id,
          s.title as schedule_title,
          s.description,
          s.scheduled_date,
          s.duration_minutes,
          s.status,
          s.assignment_type,
          l.name as lab_name,
          c.name as class_name,
          CONCAT(instructor.first_name, ' ', instructor.last_name) as instructor_name,
          NULL as group_id,
          NULL as group_name,
          NULL as user_id,
          NULL as student_name,
          NULL as assigned_computer,
          NULL as computer_name,
          NULL as assigned_seat,
          s.created_at as assigned_at,
          'class' as assignment_scope
        FROM schedules s
        JOIN labs l ON s.lab_id = l.id
        LEFT JOIN classes c ON s.class_id = c.id
        JOIN users instructor ON s.instructor_id = instructor.id
        WHERE s.status = 'scheduled'
      `;

      let scheduleParams = [];
      let scheduleParamCount = 1;

      // Apply user role filters for schedules
      if (currentUser.role === 'student') {
        scheduleQuery += ` AND (
          -- Student can see schedules for classes they belong to through groups
          EXISTS (
            SELECT 1 FROM group_members gm
            JOIN groups g ON gm.group_id = g.id
            WHERE gm.user_id = $${scheduleParamCount} AND g.class_id = s.class_id
          )
        )`;
        scheduleParams.push(currentUser.id);
        scheduleParamCount++;
      } else if (currentUser.role === 'instructor') {
        scheduleQuery += ` AND s.instructor_id = $${scheduleParamCount}`;
        scheduleParams.push(currentUser.id);
        scheduleParamCount++;
      }

      scheduleQuery += ` ORDER BY s.scheduled_date ASC LIMIT $${scheduleParamCount} OFFSET $${scheduleParamCount + 1}`;
      scheduleParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

      const scheduleResult = await query(scheduleQuery, scheduleParams);

      // Count query for schedules
      let scheduleCountQuery = scheduleQuery.replace(/SELECT DISTINCT[\s\S]*?FROM/, 'SELECT COUNT(DISTINCT s.id) as total FROM').replace(/ORDER BY[\s\S]*$/, '');
      const scheduleCountResult = await query(scheduleCountQuery, scheduleParams.slice(0, -2));

      const assignments = scheduleResult.rows.map(row => ({
        id: row.id,
        scheduleId: row.schedule_id,
        scheduleTitle: row.schedule_title,
        description: row.description || '',
        labName: row.lab_name,
        className: row.class_name || 'No Class',
        instructorName: row.instructor_name,
        scheduledDate: row.scheduled_date,
        durationMinutes: row.duration_minutes,
        status: row.status,
        assignmentType: row.assignment_type,
        groupId: row.group_id,
        groupName: row.group_name,
        userId: row.user_id,
        studentName: row.student_name,
        computerId: row.assigned_computer,
        computerName: row.computer_name,
        assignedAt: row.assigned_at
      }));

      return res.json({
        assignments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(scheduleCountResult.rows[0].total),
          pages: Math.ceil(scheduleCountResult.rows[0].total / limit)
        }
      });
    }

    // Transform the data to match frontend interface
    const assignments = result.rows.map(row => ({
      id: row.id,
      scheduleId: row.schedule_id,
      scheduleTitle: row.schedule_title,
      description: row.description || '',
      labName: row.lab_name,
      className: row.class_name || 'No Class',
      instructorName: row.instructor_name,
      scheduledDate: row.scheduled_date,
      durationMinutes: row.duration_minutes,
      status: row.status,
      assignmentType: row.assignment_type,
      groupId: row.group_id,
      groupName: row.group_name,
      userId: row.user_id,
      studentName: row.student_name,
      computerId: row.assigned_computer,
      computerName: row.computer_name,
      assignedAt: row.assigned_at
    }));

    res.json({
      assignments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// Get assignments for the current student
router.get('/student', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Ensure only students can access this endpoint
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied. Students only.' });
    }

    // Get assignments for the student from assignment_distributions table with submission tracking
    const result = await query(`
      SELECT DISTINCT
        ad.id,
        ad.assignment_id,
        ca.name as title,
        ca.description,
        ad.deadline as due_date,
        ad.scheduled_date,
        ad.assignment_type,
        c.name as class_name,
        CONCAT(instructor.first_name, ' ', instructor.last_name) as instructor_name,
        ad.assigned_at,
        g.name as group_name,
        ca.pdf_filename,
        ca.created_at as assignment_created_at,
        -- Submission tracking
        sub.id as submission_id,
        sub.assignment_response_filename,
        sub.output_test_filename,
        sub.submitted_at,
        sub.is_locked,
        -- Dynamic status calculation
        CASE
          WHEN ad.scheduled_date::date > CURRENT_DATE THEN 'upcoming'
          WHEN sub.assignment_response_filename IS NOT NULL AND sub.output_test_filename IS NOT NULL THEN 'completed'
          WHEN ad.deadline < NOW() AND (sub.assignment_response_filename IS NULL OR sub.output_test_filename IS NULL) THEN 'cancelled'
          ELSE 'in_progress'
        END as assignment_status,
        -- PDF access control
        CASE
          WHEN ad.scheduled_date::date > CURRENT_DATE THEN false
          ELSE true
        END as can_access_pdf,
        -- Debug info
        ad.scheduled_date,
        CURRENT_DATE as current_date,
        NOW() as current_timestamp,
        -- Upload permission (allow uploads within 7 days after deadline for testing)
        CASE
          WHEN sub.is_locked = true THEN false
          WHEN ad.deadline < NOW() - INTERVAL '7 days' THEN false
          ELSE true
        END as can_upload
      FROM assignment_distributions ad
      JOIN created_assignments ca ON ad.assignment_id = ca.id
      JOIN classes c ON ad.class_id = c.id
      JOIN users instructor ON ca.created_by = instructor.id
      LEFT JOIN groups g ON ad.group_id = g.id
      LEFT JOIN assignment_submissions sub ON ad.id = sub.assignment_distribution_id AND sub.user_id = $1
      WHERE ca.status = 'published' AND (
        -- Individual assignments
        ad.user_id = $1 OR
        -- Group assignments where student is a member
        (ad.assignment_type = 'group' AND ad.group_id IN (
          SELECT group_id FROM group_members WHERE user_id = $1
        )) OR
        -- Class assignments where student belongs to the class
        (ad.assignment_type = 'class' AND ad.class_id IN (
          SELECT DISTINCT g.class_id
          FROM groups g
          JOIN group_members gm ON g.id = gm.group_id
          WHERE gm.user_id = $1
        ))
      )
      ORDER BY ad.deadline ASC, ad.assigned_at DESC
    `, [userId]);

    const assignments = result.rows.map(row => {
      // Format date as DD-MMM-YYYY for upcoming assignments
      const formatDateDDMMYYYY = (dateString) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;

        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const year = date.getFullYear();

        return `${day}-${month}-${year}`;
      };

      return {
        id: row.id,
        assignmentId: row.assignment_id,
        title: row.title,
        description: row.description,
        dueDate: row.due_date,
        scheduledDate: row.scheduled_date,
        scheduledDateFormatted: formatDateDDMMYYYY(row.scheduled_date),
        status: row.assignment_status, // Use the dynamic status
        assignmentType: row.assignment_type,
        className: row.class_name,
        instructorName: row.instructor_name,
        assignmentStatus: row.assignment_status,
        assignedAt: row.assigned_at,
        groupName: row.group_name,
        pdfFileName: row.pdf_filename,
        canAccessPdf: row.can_access_pdf,
        canUpload: row.can_upload,
        type: row.assignment_type,
        isUpcoming: row.assignment_status === 'upcoming',
        // Submission details
        submission: {
          id: row.submission_id,
          assignmentResponseFilename: row.assignment_response_filename,
          outputTestFilename: row.output_test_filename,
          submittedAt: row.submitted_at,
          isLocked: row.is_locked,
          hasResponse: !!row.assignment_response_filename,
          hasOutput: !!row.output_test_filename,
          isComplete: !!(row.assignment_response_filename && row.output_test_filename)
        }
      };
    });

    res.json({
      success: true,
      assignments,
      total: assignments.length
    });

  } catch (error) {
    console.error('Error fetching student assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// Get assignment details by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    const result = await query(`
      SELECT
        sa.id,
        sa.schedule_id,
        sa.group_id,
        sa.user_id,
        sa.assigned_computer,
        sa.assigned_seat,
        sa.status,
        sa.notes,
        sa.created_at,
        s.title as schedule_title,
        s.description,
        s.scheduled_date,
        s.duration_minutes,
        s.status,
        s.assignment_type,
        l.name as lab_name,
        l.location as lab_location,
        c.name as class_name,
        CONCAT(instructor.first_name, ' ', instructor.last_name) as instructor_name,
        g.name as group_name,
        CONCAT(student.first_name, ' ', student.last_name) as student_name
      FROM schedule_assignments sa
      JOIN schedules s ON sa.schedule_id = s.id
      JOIN labs l ON s.lab_id = l.id
      LEFT JOIN classes c ON s.class_id = c.id
      JOIN users instructor ON s.instructor_id = instructor.id
      LEFT JOIN groups g ON sa.group_id = g.id
      LEFT JOIN users student ON sa.user_id = student.id

      WHERE sa.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const assignment = result.rows[0];

    // Check access permissions
    if (currentUser.role === 'student') {
      const hasAccess = assignment.user_id === currentUser.id || 
        await query(`
          SELECT 1 FROM group_members 
          WHERE group_id = $1 AND user_id = $2
        `, [assignment.group_id, currentUser.id]);
      
      if (!hasAccess.rows.length && assignment.user_id !== currentUser.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (currentUser.role === 'instructor') {
      const scheduleCheck = await query(
        'SELECT instructor_id FROM schedules WHERE id = $1',
        [assignment.schedule_id]
      );
      
      if (scheduleCheck.rows[0]?.instructor_id !== currentUser.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json({ assignment });

  } catch (error) {
    console.error('Get assignment details error:', error);
    res.status(500).json({ error: 'Failed to fetch assignment details' });
  }
});

// Update assignment (for instructors)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { computerId, notes, status } = req.body;
    const currentUser = req.user;

    if (currentUser.role !== 'instructor' && currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if assignment exists and user has permission
    const assignmentCheck = await query(`
      SELECT sa.*, s.instructor_id
      FROM schedule_assignments sa
      JOIN schedules s ON sa.schedule_id = s.id
      WHERE sa.id = $1
    `, [id]);

    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (currentUser.role === 'instructor' &&
        assignmentCheck.rows[0].instructor_id !== currentUser.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (computerId !== undefined) {
      updateFields.push(`assigned_computer = $${paramCount++}`);
      updateValues.push(computerId || null);
    }
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramCount++}`);
      updateValues.push(notes || null);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      updateValues.push(status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(id);

    const updateQuery = `
      UPDATE schedule_assignments
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);

    res.json({
      message: 'Assignment updated successfully',
      assignment: result.rows[0]
    });

  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});

// Create new assignment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      schedule_id,
      group_id,
      user_id,
      class_id,
      assigned_computer,
      assigned_seat,
      assignment_type
    } = req.body;
    const currentUser = req.user;

    // Check permissions
    if (currentUser.role !== 'instructor' && currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate assignment type and required fields
    if (assignment_type === 'class') {
      if (!class_id) {
        return res.status(400).json({
          error: 'class_id is required for class assignments'
        });
      }
    } else if (assignment_type === 'group') {
      if (!group_id) {
        return res.status(400).json({
          error: 'group_id is required for group assignments'
        });
      }
    } else if (assignment_type === 'individual') {
      if (!user_id) {
        return res.status(400).json({
          error: 'user_id is required for individual assignments'
        });
      }
    } else {
      return res.status(400).json({
        error: 'Invalid assignment_type. Must be class, group, or individual'
      });
    }

    // If schedule_id is not provided, we need to find or create a schedule
    let scheduleId = schedule_id;

    if (!scheduleId) {
      // For capacity planning assignments, we need to create a default schedule
      // or find an existing one for the current class/lab combination
      return res.status(400).json({
        error: 'schedule_id is required for assignments'
      });
    }

    // Check if schedule exists and user has permission
    const scheduleCheck = await query(`
      SELECT s.*, c.name as class_name, l.name as lab_name
      FROM schedules s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN labs l ON s.lab_id = l.id
      WHERE s.id = $1
    `, [scheduleId]);

    if (scheduleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const schedule = scheduleCheck.rows[0];

    // For instructors, check if they own the schedule
    if (currentUser.role === 'instructor' && schedule.instructor_id !== currentUser.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if computer is available (if assigned)
    if (assigned_computer) {
      // Validate that assigned_computer is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(assigned_computer)) {
        return res.status(400).json({
          error: 'Invalid computer ID format. Expected UUID.'
        });
      }

      const computerCheck = await query(`
        SELECT c.*,
               EXISTS(
                 SELECT 1 FROM schedule_assignments sa
                 WHERE sa.assigned_computer = c.computer_number
                 AND sa.schedule_id = $1
               ) as is_assigned
        FROM computers c
        WHERE c.id = $2
      `, [scheduleId, assigned_computer]);

      if (computerCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Computer not found' });
      }

      if (!computerCheck.rows[0].is_functional) {
        return res.status(400).json({ error: 'Computer is not functional' });
      }

      if (computerCheck.rows[0].is_assigned) {
        return res.status(409).json({ error: 'Computer is already assigned' });
      }
    }

    // Get computer number if computer is assigned
    let computerNumber = null;
    if (assigned_computer) {
      const computerInfo = await query(`
        SELECT computer_number FROM computers WHERE id = $1
      `, [assigned_computer]);

      if (computerInfo.rows.length > 0) {
        computerNumber = computerInfo.rows[0].computer_number;
      }
    }

    // Create the assignment(s)
    let results = [];

    if (assignment_type === 'class') {
      // For class assignments, create a single assignment for the first group in the class
      // This represents that the entire class is assigned to this schedule
      const groupsResult = await query(`
        SELECT id FROM groups WHERE class_id = $1 LIMIT 1
      `, [class_id]);

      if (groupsResult.rows.length > 0) {
        // Use the first group to represent the class assignment
        const result = await query(`
          INSERT INTO schedule_assignments (
            schedule_id, group_id, user_id, assigned_computer, assigned_seat, status
          )
          VALUES ($1, $2, $3, $4, $5, 'assigned')
          RETURNING *
        `, [
          scheduleId,
          groupsResult.rows[0].id,
          null,
          computerNumber,
          assigned_seat || null
        ]);
        results.push(result.rows[0]);
      } else {
        // If no groups exist, create assignment for the first student in the class
        const studentsResult = await query(`
          SELECT u.id FROM users u
          WHERE u.role = 'student'
          LIMIT 1
        `, []);

        if (studentsResult.rows.length > 0) {
          const result = await query(`
            INSERT INTO schedule_assignments (
              schedule_id, group_id, user_id, assigned_computer, assigned_seat, status
            )
            VALUES ($1, $2, $3, $4, $5, 'assigned')
            RETURNING *
          `, [
            scheduleId,
            null,
            studentsResult.rows[0].id,
            computerNumber,
            assigned_seat || null
          ]);
          results.push(result.rows[0]);
        }
      }

      res.status(201).json({
        message: 'Class assignment created successfully',
        assignment: results[0] || null
      });
    } else {
      // Single assignment (group or individual)
      const result = await query(`
        INSERT INTO schedule_assignments (
          schedule_id, group_id, user_id, assigned_computer, assigned_seat, status
        )
        VALUES ($1, $2, $3, $4, $5, 'assigned')
        RETURNING *
      `, [
        scheduleId,
        group_id || null,
        user_id || null,
        computerNumber,
        assigned_seat || null
      ]);

      res.status(201).json({
        message: 'Assignment created successfully',
        assignment: result.rows[0]
      });
    }

  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// Submit assignment (upload response and output files)
router.post('/submit/:assignmentDistributionId', authenticateToken, upload.fields([
  { name: 'assignmentResponse', maxCount: 1 },
  { name: 'outputTest', maxCount: 1 }
]), async (req, res) => {
  try {
    const { assignmentDistributionId } = req.params;
    const userId = req.user.userId;

    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can submit assignments' });
    }

    // Check if assignment exists and user has access
    const assignmentCheck = await query(`
      SELECT ad.*, ca.name as assignment_name
      FROM assignment_distributions ad
      JOIN created_assignments ca ON ad.assignment_id = ca.id
      WHERE ad.id = $1 AND (
        ad.user_id = $2 OR
        (ad.assignment_type = 'group' AND ad.group_id IN (
          SELECT group_id FROM group_members WHERE user_id = $2
        )) OR
        (ad.assignment_type = 'class' AND ad.class_id IN (
          SELECT DISTINCT g.class_id
          FROM groups g
          JOIN group_members gm ON g.id = gm.group_id
          WHERE gm.user_id = $2
        ))
      )
    `, [assignmentDistributionId, userId]);

    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found or access denied' });
    }

    const assignment = assignmentCheck.rows[0];

    // Check if deadline has passed
    if (new Date() > new Date(assignment.deadline)) {
      return res.status(400).json({ error: 'Assignment deadline has passed. Submission not allowed.' });
    }

    // Check if already submitted and locked
    const existingSubmission = await query(`
      SELECT * FROM assignment_submissions
      WHERE assignment_distribution_id = $1 AND user_id = $2
    `, [assignmentDistributionId, userId]);

    if (existingSubmission.rows.length > 0 && existingSubmission.rows[0].is_locked) {
      return res.status(400).json({ error: 'Assignment already submitted and locked. No further uploads allowed.' });
    }

    // Validate files
    if (!req.files || !req.files.assignmentResponse || !req.files.outputTest) {
      return res.status(400).json({ error: 'Both assignment response and output test files are required' });
    }

    const assignmentResponseFile = req.files.assignmentResponse[0];
    const outputTestFile = req.files.outputTest[0];

    // Create or update submission
    if (existingSubmission.rows.length === 0) {
      // Create new submission
      await query(`
        INSERT INTO assignment_submissions (
          assignment_distribution_id, user_id, assignment_response_filename,
          output_test_filename, is_locked, submitted_at
        ) VALUES ($1, $2, $3, $4, true, NOW())
      `, [assignmentDistributionId, userId, assignmentResponseFile.filename, outputTestFile.filename]);
    } else {
      // Update existing submission
      await query(`
        UPDATE assignment_submissions
        SET assignment_response_filename = $3, output_test_filename = $4,
            is_locked = true, submitted_at = NOW(), updated_at = NOW()
        WHERE assignment_distribution_id = $1 AND user_id = $2
      `, [assignmentDistributionId, userId, assignmentResponseFile.filename, outputTestFile.filename]);
    }

    res.json({
      success: true,
      message: 'Assignment submitted successfully',
      submission: {
        assignmentResponseFilename: assignmentResponseFile.filename,
        outputTestFilename: outputTestFile.filename,
        submittedAt: new Date(),
        isLocked: true
      }
    });

  } catch (error) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({ error: 'Failed to submit assignment' });
  }
});

// Download submitted assignment files
router.get('/download/:assignmentDistributionId/:fileType', authenticateToken, async (req, res) => {
  try {
    const { assignmentDistributionId, fileType } = req.params;
    const userId = req.user.id;

    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can download their submissions' });
    }

    // Validate file type
    if (!['assignment_response', 'output_test'].includes(fileType)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    // Check if assignment exists and user has access
    const assignmentCheck = await query(`
      SELECT ad.*, ca.name as assignment_name
      FROM assignment_distributions ad
      JOIN created_assignments ca ON ad.assignment_id = ca.id
      WHERE ad.id = $1 AND (
        ad.user_id = $2 OR
        (ad.assignment_type = 'group' AND ad.group_id IN (
          SELECT group_id FROM group_members WHERE user_id = $2
        )) OR
        (ad.assignment_type = 'class' AND ad.class_id IN (
          SELECT DISTINCT g.class_id
          FROM groups g
          JOIN group_members gm ON g.id = gm.group_id
          WHERE gm.user_id = $2
        ))
      )
    `, [assignmentDistributionId, userId]);

    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found or access denied' });
    }

    // Get submission
    const submission = await query(`
      SELECT * FROM assignment_submissions
      WHERE assignment_distribution_id = $1 AND user_id = $2
    `, [assignmentDistributionId, userId]);

    if (submission.rows.length === 0) {
      return res.status(404).json({ error: 'No submission found' });
    }

    const submissionData = submission.rows[0];
    const filename = fileType === 'assignment_response'
      ? submissionData.assignment_response_filename
      : submissionData.output_test_filename;

    if (!filename) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = path.join(__dirname, '../uploads/assignment-submissions/', filename);

    // Check if file exists
    if (!require('fs').existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // Send file
    res.sendFile(filePath);

  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

module.exports = router;
