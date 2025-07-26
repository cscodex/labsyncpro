const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireStudentOrInstructor } = require('../middleware/auth');

const router = express.Router();

// Configure multer for assignment submission uploads
const assignmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/assignment-submissions';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileType = req.body.fileType || 'file';
    cb(null, `${fileType}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const assignmentUpload = multer({
  storage: assignmentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types for assignments
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Only PDF, DOC, DOCX, TXT, ZIP files are allowed.'));
    }
  }
});

// Upload assignment submission files
router.post('/upload', authenticateToken, assignmentUpload.single('file'), async (req, res) => {
  try {
    const { scheduleId, fileType } = req.body;
    const currentUser = req.user;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!scheduleId || !fileType) {
      return res.status(400).json({ error: 'Schedule ID and file type are required' });
    }

    if (!['assignment_response', 'output_test'].includes(fileType)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    // Check if this is actually an assignment distribution ID
    const assignmentCheck = await query(`
      SELECT ad.id, ad.assignment_id, ca.name as assignment_name
      FROM assignment_distributions ad
      JOIN created_assignments ca ON ad.assignment_id = ca.id
      WHERE ad.id = $1
    `, [scheduleId]);

    if (assignmentCheck.rows.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check if submission already exists for this user and assignment
    let submissionResult = await query(`
      SELECT id FROM assignment_submissions
      WHERE assignment_distribution_id = $1 AND user_id = $2
    `, [scheduleId, currentUser.id]);

    let submissionId;
    if (submissionResult.rows.length === 0) {
      // Create new submission record
      const newSubmission = await query(`
        INSERT INTO assignment_submissions (assignment_distribution_id, user_id, submitted_at)
        VALUES ($1, $2, NOW())
        RETURNING id
      `, [scheduleId, currentUser.id]);
      submissionId = newSubmission.rows[0].id;
    } else {
      submissionId = submissionResult.rows[0].id;
    }

    // Update the submission with the file information
    const columnName = fileType === 'assignment_response' ? 'assignment_response_filename' : 'output_test_filename';
    await query(`
      UPDATE assignment_submissions
      SET ${columnName} = $1, updated_at = NOW()
      WHERE id = $2
    `, [req.file.filename, submissionId]);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        type: fileType
      }
    });

  } catch (error) {
    console.error('Upload error:', error);

    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 10MB limit' });
    }

    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/submissions';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 10 // Maximum 10 files per submission
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types for programming assignments
    const allowedTypes = [
      'text/plain',
      'text/javascript',
      'text/html',
      'text/css',
      'application/javascript',
      'application/json',
      'application/xml',
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];

    const allowedExtensions = [
      '.txt', '.js', '.html', '.css', '.json', '.xml', '.pdf', '.zip',
      '.jpg', '.jpeg', '.png', '.gif', '.py', '.java', '.cpp', '.c',
      '.cs', '.php', '.rb', '.go', '.rs', '.sql', '.md'
    ];

    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// Get submissions with filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { scheduleId, userId, status, page = 1, limit = 20 } = req.query;
    const currentUser = req.user;
    
    let whereClause = '';
    const queryParams = [];
    let paramCount = 1;

    // Students can only see their own submissions
    if (currentUser.role === 'student') {
      whereClause = `WHERE s.user_id = $${paramCount}`;
      queryParams.push(currentUser.id);
      paramCount++;
    }

    // Apply filters
    if (scheduleId) {
      whereClause += whereClause ? ` AND s.schedule_id = $${paramCount}` : `WHERE s.schedule_id = $${paramCount}`;
      queryParams.push(scheduleId);
      paramCount++;
    }

    if (userId && currentUser.role !== 'student') {
      whereClause += whereClause ? ` AND s.user_id = $${paramCount}` : `WHERE s.user_id = $${paramCount}`;
      queryParams.push(userId);
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

    const result = await query(`
      SELECT
        s.*,
        sch.title as schedule_title,
        sch.scheduled_date,
        sch.duration_minutes,
        u.first_name,
        u.last_name,
        u.student_id,
        g.name as group_name,
        gr.score,
        gr.max_score,
        gr.graded_at,
        gr.feedback
      FROM submissions s
      JOIN schedules sch ON s.schedule_id = sch.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN groups g ON s.group_id = g.id
      LEFT JOIN grades gr ON s.id = gr.submission_id
      ${whereClause}
      ORDER BY s.submitted_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `, queryParams);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total 
      FROM submissions s
      JOIN schedules sch ON s.schedule_id = sch.id
      ${whereClause}
    `, queryParams.slice(0, -2));

    res.json({
      submissions: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    // Return empty data instead of 500 error for better UX
    res.json({
      submissions: [],
      pagination: {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        total: 0,
        pages: 0
      },
      message: 'No submissions available at the moment'
    });
  }
});

// Get submission by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    const result = await query(`
      SELECT
        s.*,
        sch.title as schedule_title,
        sch.scheduled_date,
        sch.duration_minutes,
        sch.instructor_id,
        u.first_name,
        u.last_name,
        u.student_id,
        g.name as group_name,
        gr.score,
        gr.max_score,
        gr.graded_at,
        gr.feedback,
        grader.first_name as grader_first_name,
        grader.last_name as grader_last_name
      FROM submissions s
      JOIN schedules sch ON s.schedule_id = sch.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN groups g ON s.group_id = g.id
      LEFT JOIN grades gr ON s.id = gr.submission_id
      LEFT JOIN users grader ON gr.graded_by = grader.id
      WHERE s.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = result.rows[0];

    // Check access permissions
    if (currentUser.role === 'student' && submission.user_id !== currentUser.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (currentUser.role === 'instructor' && submission.instructor_id !== currentUser.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ submission });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

// Create new submission (students only)
router.post('/', [
  authenticateToken,
  upload.array('files', 10),
  body('scheduleId').isUUID(),
  body('submissionType').isIn(['file', 'text', 'mixed']),
  body('content').optional().trim(),
  body('groupId').optional().isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { scheduleId, submissionType, content, groupId } = req.body;
    const currentUser = req.user;
    const files = req.files || [];

    // Only students can create submissions
    if (currentUser.role !== 'student') {
      return res.status(403).json({ error: 'Only students can create submissions' });
    }

    // Check if schedule exists and is accessible
    const scheduleResult = await query(`
      SELECT s.*,
        CASE WHEN s.scheduled_date < CURRENT_DATE
        THEN true ELSE false END as is_late
      FROM schedules s
      WHERE s.id = $1 AND s.status IN ('scheduled', 'in_progress', 'completed')
    `, [scheduleId]);

    if (scheduleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found or not accessible' });
    }

    const schedule = scheduleResult.rows[0];

    // Check if user is assigned to this schedule
    const assignmentResult = await query(`
      SELECT 1 FROM schedule_assignments sa
      LEFT JOIN group_members gm ON sa.group_id = gm.group_id
      WHERE sa.schedule_id = $1 AND (sa.user_id = $2 OR gm.user_id = $2)
    `, [scheduleId, currentUser.id]);

    if (assignmentResult.rows.length === 0) {
      return res.status(403).json({ error: 'You are not assigned to this schedule' });
    }

    // Check if submission already exists
    const existingSubmission = await query(
      'SELECT id FROM submissions WHERE schedule_id = $1 AND user_id = $2',
      [scheduleId, currentUser.id]
    );

    if (existingSubmission.rows.length > 0) {
      return res.status(409).json({ error: 'Submission already exists for this schedule' });
    }

    // Validate submission type and content
    if (submissionType === 'text' && !content) {
      return res.status(400).json({ error: 'Content is required for text submissions' });
    }

    if (submissionType === 'file' && files.length === 0) {
      return res.status(400).json({ error: 'Files are required for file submissions' });
    }

    // Prepare file paths
    const filePaths = files.map(file => file.path);

    // Create submission
    const result = await query(`
      INSERT INTO submissions (
        schedule_id, user_id, group_id, submission_type, 
        content, file_paths, is_late
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      scheduleId, 
      currentUser.id, 
      groupId || null, 
      submissionType,
      content || null,
      JSON.stringify(filePaths),
      schedule.is_late
    ]);

    res.status(201).json({
      message: 'Submission created successfully',
      submission: result.rows[0]
    });
  } catch (error) {
    console.error('Create submission error:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    }
    
    res.status(500).json({ error: 'Failed to create submission' });
  }
});

// Update submission (students can only update their own)
router.put('/:id', [
  authenticateToken,
  upload.array('files', 10),
  body('submissionType').optional().isIn(['file', 'text', 'mixed']),
  body('content').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { submissionType, content } = req.body;
    const currentUser = req.user;
    const files = req.files || [];

    // Get existing submission
    const submissionResult = await query(`
      SELECT s.*, sch.status as schedule_status
      FROM submissions s
      JOIN schedules sch ON s.schedule_id = sch.id
      WHERE s.id = $1
    `, [id]);

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissionResult.rows[0];

    // Check permissions
    if (currentUser.role === 'student' && submission.user_id !== currentUser.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Don't allow updates if already graded
    if (submission.status === 'graded') {
      return res.status(400).json({ error: 'Cannot update graded submission' });
    }

    // Don't allow updates if schedule is completed
    if (submission.schedule_status === 'completed') {
      return res.status(400).json({ error: 'Cannot update submission for completed schedule' });
    }

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (submissionType) {
      updateFields.push(`submission_type = $${paramCount}`);
      values.push(submissionType);
      paramCount++;
    }

    if (content !== undefined) {
      updateFields.push(`content = $${paramCount}`);
      values.push(content);
      paramCount++;
    }

    if (files.length > 0) {
      // Add new files to existing ones
      const existingPaths = submission.file_paths ? JSON.parse(submission.file_paths) : [];
      const newPaths = files.map(file => file.path);
      const allPaths = [...existingPaths, ...newPaths];

      updateFields.push(`file_paths = $${paramCount}`);
      values.push(JSON.stringify(allPaths));
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id);

    const result = await query(`
      UPDATE submissions
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    res.json({
      message: 'Submission updated successfully',
      submission: result.rows[0]
    });
  } catch (error) {
    console.error('Update submission error:', error);

    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    }

    res.status(500).json({ error: 'Failed to update submission' });
  }
});

// Delete submission (students can only delete their own)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Get submission details
    const submissionResult = await query(`
      SELECT s.*, sch.status as schedule_status
      FROM submissions s
      JOIN schedules sch ON s.schedule_id = sch.id
      WHERE s.id = $1
    `, [id]);

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissionResult.rows[0];

    // Check permissions
    if (currentUser.role === 'student' && submission.user_id !== currentUser.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Don't allow deletion if already graded
    if (submission.status === 'graded') {
      return res.status(400).json({ error: 'Cannot delete graded submission' });
    }

    // Delete associated files
    if (submission.file_paths) {
      const filePaths = JSON.parse(submission.file_paths);
      filePaths.forEach(filePath => {
        fs.unlink(filePath, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    }

    // Delete submission
    await query('DELETE FROM submissions WHERE id = $1', [id]);

    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Delete submission error:', error);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

// Download submission file
router.get('/:id/files/:filename', authenticateToken, async (req, res) => {
  try {
    const { id, filename } = req.params;
    const currentUser = req.user;

    // Get submission details
    const submissionResult = await query(`
      SELECT s.*, sch.instructor_id
      FROM submissions s
      JOIN schedules sch ON s.schedule_id = sch.id
      WHERE s.id = $1
    `, [id]);

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissionResult.rows[0];

    // Check permissions
    if (currentUser.role === 'student' && submission.user_id !== currentUser.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (currentUser.role === 'instructor' && submission.instructor_id !== currentUser.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists in submission
    const filePaths = submission.file_paths ? JSON.parse(submission.file_paths) : [];
    const filePath = filePaths.find(path => path.includes(filename));

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Send file
    res.download(filePath, filename);
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

module.exports = router;
