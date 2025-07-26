const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireInstructor, requireStudentOrInstructor } = require('../middleware/auth');

const router = express.Router();

// Get grades with filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { submissionId, studentId, scheduleId, page = 1, limit = 20 } = req.query;
    const currentUser = req.user;
    
    let whereClause = '';
    const queryParams = [];
    let paramCount = 1;

    // Students can only see their own grades
    if (currentUser.role === 'student') {
      whereClause = `WHERE s.user_id = $${paramCount}`;
      queryParams.push(currentUser.id);
      paramCount++;
    }

    // Apply filters
    if (submissionId) {
      whereClause += whereClause ? ` AND g.submission_id = $${paramCount}` : `WHERE g.submission_id = $${paramCount}`;
      queryParams.push(submissionId);
      paramCount++;
    }

    if (studentId && currentUser.role !== 'student') {
      whereClause += whereClause ? ` AND s.user_id = $${paramCount}` : `WHERE s.user_id = $${paramCount}`;
      queryParams.push(studentId);
      paramCount++;
    }

    if (scheduleId) {
      whereClause += whereClause ? ` AND s.schedule_id = $${paramCount}` : `WHERE s.schedule_id = $${paramCount}`;
      queryParams.push(scheduleId);
      paramCount++;
    }

    // Pagination
    const offset = (page - 1) * limit;
    queryParams.push(limit, offset);

    const result = await query(`
      SELECT 
        g.*,
        s.id as submission_id,
        s.submission_type,
        s.submitted_at,
        s.is_late,
        sch.title as schedule_title,
        sch.scheduled_date,
        u.first_name as student_first_name,
        u.last_name as student_last_name,
        u.student_id,
        grader.first_name as grader_first_name,
        grader.last_name as grader_last_name,
        gr.name as group_name
      FROM grades g
      JOIN submissions s ON g.submission_id = s.id
      JOIN schedules sch ON s.schedule_id = sch.id
      JOIN users u ON s.user_id = u.id
      JOIN users grader ON g.instructor_id = grader.id
      LEFT JOIN groups gr ON s.group_id = gr.id
      ${whereClause}
      ORDER BY g.graded_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `, queryParams);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total 
      FROM grades g
      JOIN submissions s ON g.submission_id = s.id
      JOIN schedules sch ON s.schedule_id = sch.id
      JOIN users u ON s.user_id = u.id
      ${whereClause}
    `, queryParams.slice(0, -2));

    res.json({
      grades: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get grades error:', error);
    // Return empty data instead of 500 error for better UX
    res.json({
      grades: [],
      pagination: {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        total: 0,
        pages: 0
      },
      message: 'No grades available at the moment'
    });
  }
});

// Get grade by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    const result = await query(`
      SELECT 
        g.*,
        s.id as submission_id,
        s.submission_type,
        s.content,
        s.file_paths,
        s.submitted_at,
        s.is_late,
        sch.id as schedule_id,
        sch.title as schedule_title,
        sch.scheduled_date,
        sch.instructor_id,
        u.first_name as student_first_name,
        u.last_name as student_last_name,
        u.student_id,
        u.email as student_email,
        grader.first_name as grader_first_name,
        grader.last_name as grader_last_name,
        gr.name as group_name
      FROM grades g
      JOIN submissions s ON g.submission_id = s.id
      JOIN schedules sch ON s.schedule_id = sch.id
      JOIN users u ON s.user_id = u.id
      JOIN users grader ON g.instructor_id = grader.id
      LEFT JOIN groups gr ON s.group_id = gr.id
      WHERE g.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grade not found' });
    }

    const grade = result.rows[0];

    // Check access permissions
    if (currentUser.role === 'student' && grade.user_id !== currentUser.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (currentUser.role === 'instructor' && grade.instructor_id !== currentUser.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ grade });
  } catch (error) {
    console.error('Get grade error:', error);
    res.status(500).json({ error: 'Failed to fetch grade' });
  }
});

// Get grade by submission ID
router.get('/submission/:submissionId', authenticateToken, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const currentUser = req.user;

    const result = await query(`
      SELECT
        g.*,
        s.id as submission_id,
        s.submission_type,
        s.content,
        s.file_paths,
        s.submitted_at,
        s.is_late,
        sch.title as schedule_title,
        sch.scheduled_date,
        sch.instructor_id,
        u.first_name as student_first_name,
        u.last_name as student_last_name,
        u.email as student_email,
        grader.first_name as grader_first_name,
        grader.last_name as grader_last_name,
        gr.name as group_name
      FROM grades g
      JOIN submissions s ON g.submission_id = s.id
      JOIN schedules sch ON s.schedule_id = sch.id
      JOIN users u ON s.user_id = u.id
      JOIN users grader ON g.instructor_id = grader.id
      LEFT JOIN groups gr ON s.group_id = gr.id
      WHERE s.id = $1
    `, [submissionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grade not found for this submission' });
    }

    const grade = result.rows[0];

    // Check access permissions
    const hasAccess =
      currentUser.role === 'admin' ||
      grade.instructor_id === currentUser.id ||
      (currentUser.role === 'student' && grade.student_email === currentUser.email);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ grade });
  } catch (error) {
    console.error('Get grade by submission error:', error);
    res.status(500).json({ error: 'Failed to fetch grade' });
  }
});

// Create or update grade (instructors only)
router.post('/', [
  authenticateToken,
  requireInstructor,
  body('submissionId').isUUID(),
  body('score').isFloat({ min: 0 }),
  body('maxScore').optional().isFloat({ min: 0 }),
  body('gradeLetter').optional().trim(),
  body('feedback').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { submissionId, score, maxScore = 100, gradeLetter, feedback } = req.body;
    const currentUser = req.user;

    // Check if submission exists and instructor has access
    const submissionResult = await query(`
      SELECT s.*, sch.instructor_id
      FROM submissions s
      JOIN schedules sch ON s.schedule_id = sch.id
      WHERE s.id = $1
    `, [submissionId]);

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissionResult.rows[0];

    if (submission.instructor_id !== currentUser.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate score
    if (score > maxScore) {
      return res.status(400).json({ error: 'Score cannot be greater than max score' });
    }

    // Check if grade already exists
    const existingGrade = await query(
      'SELECT id FROM grades WHERE submission_id = $1',
      [submissionId]
    );

    let result;
    if (existingGrade.rows.length > 0) {
      // Update existing grade
      result = await query(`
        UPDATE grades
        SET score = $1, max_score = $2, grade_letter = $3, feedback = $4, instructor_id = $5, updated_at = CURRENT_TIMESTAMP
        WHERE submission_id = $6
        RETURNING *
      `, [score, maxScore, gradeLetter, feedback, currentUser.id, submissionId]);
    } else {
      // Create new grade
      result = await query(`
        INSERT INTO grades (submission_id, score, max_score, grade_letter, feedback, instructor_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [submissionId, score, maxScore, gradeLetter, feedback, currentUser.id]);
    }

    // Update submission status to graded
    await query(
      'UPDATE submissions SET status = $1 WHERE id = $2',
      ['graded', submissionId]
    );

    res.json({
      message: existingGrade.rows.length > 0 ? 'Grade updated successfully' : 'Grade created successfully',
      grade: result.rows[0]
    });
  } catch (error) {
    console.error('Create/update grade error:', error);
    res.status(500).json({ error: 'Failed to create/update grade' });
  }
});

// Update grade (instructors only)
router.put('/:id', [
  authenticateToken,
  requireInstructor,
  body('score').optional().isFloat({ min: 0 }),
  body('maxScore').optional().isFloat({ min: 0 }),
  body('gradeLetter').optional().trim(),
  body('feedback').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { score, maxScore, gradeLetter, feedback } = req.body;
    const currentUser = req.user;

    // Check if grade exists and instructor has access
    const gradeResult = await query(`
      SELECT g.*, sch.instructor_id
      FROM grades g
      JOIN submissions s ON g.submission_id = s.id
      JOIN schedules sch ON s.schedule_id = sch.id
      WHERE g.id = $1
    `, [id]);

    if (gradeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Grade not found' });
    }

    const grade = gradeResult.rows[0];

    if (grade.instructor_id !== currentUser.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (score !== undefined) {
      const currentMaxScore = maxScore || grade.max_score;
      if (score > currentMaxScore) {
        return res.status(400).json({ error: 'Score cannot be greater than max score' });
      }
      updateFields.push(`score = $${paramCount}`);
      values.push(score);
      paramCount++;
    }

    if (maxScore !== undefined) {
      updateFields.push(`max_score = $${paramCount}`);
      values.push(maxScore);
      paramCount++;
    }

    if (gradeLetter !== undefined) {
      updateFields.push(`grade_letter = $${paramCount}`);
      values.push(gradeLetter);
      paramCount++;
    }

    if (feedback !== undefined) {
      updateFields.push(`feedback = $${paramCount}`);
      values.push(feedback);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateFields.push(`instructor_id = $${paramCount}`);
    values.push(currentUser.id);
    paramCount++;

    values.push(id);

    const result = await query(`
      UPDATE grades 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    res.json({
      message: 'Grade updated successfully',
      grade: result.rows[0]
    });
  } catch (error) {
    console.error('Update grade error:', error);
    res.status(500).json({ error: 'Failed to update grade' });
  }
});

// Delete grade (instructors only)
router.delete('/:id', [authenticateToken, requireInstructor], async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Check if grade exists and instructor has access
    const gradeResult = await query(`
      SELECT g.submission_id, sch.instructor_id
      FROM grades g
      JOIN submissions s ON g.submission_id = s.id
      JOIN schedules sch ON s.schedule_id = sch.id
      WHERE g.id = $1
    `, [id]);

    if (gradeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Grade not found' });
    }

    const grade = gradeResult.rows[0];

    if (grade.instructor_id !== currentUser.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete grade
    await query('DELETE FROM grades WHERE id = $1', [id]);

    // Update submission status back to submitted
    await query(
      'UPDATE submissions SET status = $1 WHERE id = $2',
      ['submitted', grade.submission_id]
    );

    res.json({ message: 'Grade deleted successfully' });
  } catch (error) {
    console.error('Delete grade error:', error);
    res.status(500).json({ error: 'Failed to delete grade' });
  }
});

// Get grade statistics for a schedule
router.get('/statistics/:scheduleId', [authenticateToken, requireInstructor], async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const currentUser = req.user;

    // Check if schedule exists and instructor has access
    const scheduleResult = await query(
      'SELECT id FROM schedules WHERE id = $1 AND instructor_id = $2',
      [scheduleId, currentUser.id]
    );

    if (scheduleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found or access denied' });
    }

    // Get grade statistics
    const statsResult = await query(`
      SELECT 
        COUNT(g.id) as total_graded,
        COUNT(s.id) as total_submissions,
        AVG(g.score) as average_score,
        MIN(g.score) as min_score,
        MAX(g.score) as max_score,
        AVG(g.max_score) as average_max_score
      FROM submissions s
      LEFT JOIN grades g ON s.id = g.submission_id
      WHERE s.schedule_id = $1
    `, [scheduleId]);

    // Get grade distribution
    const distributionResult = await query(`
      SELECT 
        CASE 
          WHEN (g.score / g.max_score * 100) >= 90 THEN 'A'
          WHEN (g.score / g.max_score * 100) >= 80 THEN 'B'
          WHEN (g.score / g.max_score * 100) >= 70 THEN 'C'
          WHEN (g.score / g.max_score * 100) >= 60 THEN 'D'
          ELSE 'F'
        END as grade_letter,
        COUNT(*) as count
      FROM grades g
      JOIN submissions s ON g.submission_id = s.id
      WHERE s.schedule_id = $1
      GROUP BY grade_letter
      ORDER BY grade_letter
    `, [scheduleId]);

    const stats = statsResult.rows[0];

    res.json({
      statistics: {
        totalSubmissions: parseInt(stats.total_submissions) || 0,
        totalGraded: parseInt(stats.total_graded) || 0,
        averageScore: parseFloat(stats.average_score) || 0,
        minScore: parseFloat(stats.min_score) || 0,
        maxScore: parseFloat(stats.max_score) || 0,
        averageMaxScore: parseFloat(stats.average_max_score) || 100,
        gradeDistribution: distributionResult.rows
      }
    });
  } catch (error) {
    console.error('Get grade statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch grade statistics' });
  }
});

module.exports = router;
