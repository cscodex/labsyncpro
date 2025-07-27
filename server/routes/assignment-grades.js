const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Helper function to calculate grade letter from percentage
async function calculateGradeLetter(percentage) {
  try {
    const result = await query(`
// Removed SQL fragment: SELECT grade_letter
      FROM grade_scales
      WHERE is_active = true
        AND $1 >= min_percentage
        AND $1 <= max_percentage
      LIMIT 1
    `, [percentage]);

    return result.rows.length > 0 ? result.rows[0].grade_letter : 'F';
  } catch (error) {
    console.error('Error calculating grade letter:', error);
    return 'F';
  }
}

// Get assignment grades with filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { submissionId, studentId, assignmentId, page = 1, limit = 20 } = req.query;
    const currentUser = req.user;
    
    let whereClause = '';
    const queryParams = [];
    let paramCount = 1;

    // Students can only see their own grades
    if (currentUser.role === 'student') {
      whereClause = `WHERE asub.user_id = $${paramCount}`;
      queryParams.push(currentUser.id);
      paramCount++;
    }

    // Apply filters
    if (submissionId) {
      whereClause += whereClause ? ` AND ag.assignment_submission_id = $${paramCount}` : `WHERE ag.assignment_submission_id = $${paramCount}`;
      queryParams.push(submissionId);
      paramCount++;
    }

    if (studentId && currentUser.role !== 'student') {
      whereClause += whereClause ? ` AND asub.user_id = $${paramCount}` : `WHERE asub.user_id = $${paramCount}`;
      queryParams.push(studentId);
      paramCount++;
    }

    if (assignmentId) {
      whereClause += whereClause ? ` AND ad.assignment_id = $${paramCount}` : `WHERE ad.assignment_id = $${paramCount}`;
      queryParams.push(assignmentId);
      paramCount++;
    }

    // Add pagination
    const offset = (page - 1) * limit;
    queryParams.push(limit, offset);

    const result = await query(`
// Removed SQL fragment: SELECT 
        ag.*,
        asub.assignment_distribution_id,
        asub.assignment_response_filename,
        asub.output_test_filename,
        asub.submitted_at,
        asub.is_locked,
        u.first_name || ' ' || u.last_name as student_name,
        u.student_id,
        u.email as student_email,
        ca.name as assignment_title,
        ca.description as assignment_description,
        ad.assignment_type,
        ad.deadline,
        ad.scheduled_date,
        c.class_code as class_name,
        instructor.first_name || ' ' || instructor.last_name as instructor_name
      FROM assignment_grades ag
      JOIN assignment_submissions asub ON ag.assignment_submission_id = asub.id
      JOIN assignment_distributions ad ON asub.assignment_distribution_id = ad.id
      JOIN created_assignments ca ON ad.assignment_id = ca.id
      JOIN users u ON asub.user_id = u.id
      JOIN users instructor ON ag.instructor_id = instructor.id
      LEFT JOIN classes c ON ad.class_id = c.id
      ${whereClause}
      ORDER BY ag.graded_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `, queryParams);

    // Get total count
    const countResult = await query(`
// Removed SQL fragment: SELECT COUNT(*) as total 
      FROM assignment_grades ag
      JOIN assignment_submissions asub ON ag.assignment_submission_id = asub.id
      JOIN assignment_distributions ad ON asub.assignment_distribution_id = ad.id
      JOIN created_assignments ca ON ad.assignment_id = ca.id
      JOIN users u ON asub.user_id = u.id
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
    console.error('Get assignment grades error:', error);
    res.status(500).json({ error: 'Failed to fetch assignment grades' });
  }
});

// Get grade by submission ID
router.get('/submission/:submissionId', authenticateToken, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const currentUser = req.user;

    let whereClause = 'WHERE ag.assignment_submission_id = $1';
    const queryParams = [submissionId];

    // Students can only see their own grades
    if (currentUser.role === 'student') {
      whereClause += ' AND asub.user_id = $2';
      queryParams.push(currentUser.id);
    }

    const result = await query(`
// Removed SQL fragment: SELECT 
        ag.*,
        asub.assignment_distribution_id,
        asub.assignment_response_filename,
        asub.output_test_filename,
        asub.submitted_at,
        asub.is_locked,
        u.first_name || ' ' || u.last_name as student_name,
        u.student_id,
        u.email as student_email,
        ca.name as assignment_title,
        ca.description as assignment_description,
        ad.assignment_type,
        ad.deadline,
        ad.scheduled_date,
        c.class_code as class_name,
        instructor.first_name || ' ' || instructor.last_name as instructor_name
      FROM assignment_grades ag
      JOIN assignment_submissions asub ON ag.assignment_submission_id = asub.id
      JOIN assignment_distributions ad ON asub.assignment_distribution_id = ad.id
      JOIN created_assignments ca ON ad.assignment_id = ca.id
      JOIN users u ON asub.user_id = u.id
      JOIN users instructor ON ag.instructor_id = instructor.id
      LEFT JOIN classes c ON ad.class_id = c.id
      ${whereClause}
    `, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grade not found' });
    }

    res.json({ grade: result.rows[0] });
  } catch (error) {
    console.error('Get assignment grade error:', error);
    res.status(500).json({ error: 'Failed to fetch assignment grade' });
  }
});

// Create or update assignment grade (instructors only)
router.post('/', [
  authenticateToken,
  requireRole(['instructor', 'admin']),
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

    const { submissionId, score, maxScore = 100, feedback } = req.body;
    const currentUser = req.user;

    // Check if submission exists
    const submissionResult = await query(`
// Removed SQL fragment: SELECT asub.*, ad.assignment_id, ca.created_by
      FROM assignment_submissions asub
      JOIN assignment_distributions ad ON asub.assignment_distribution_id = ad.id
      JOIN created_assignments ca ON ad.assignment_id = ca.id
      WHERE asub.id = $1
    `, [submissionId]);

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment submission not found' });
    }

    const submission = submissionResult.rows[0];

    // Validate score
    if (score > maxScore) {
      return res.status(400).json({ error: 'Score cannot be greater than max score' });
    }

    // Calculate percentage and grade letter automatically
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100 * 100) / 100 : 0;
    const gradeLetter = await calculateGradeLetter(percentage);

    // Check if grade already exists
    const existingGradeResult = await query(`
// Removed SQL fragment: SELECT id FROM assignment_grades WHERE assignment_submission_id = $1
    `, [submissionId]);

    let gradeResult;
    if (existingGradeResult.rows.length > 0) {
      // Update existing grade
      gradeResult = await query(`
// Removed SQL fragment: UPDATE assignment_grades 
        SET score = $1, max_score = $2, grade_letter = $3, feedback = $4, 
            instructor_id = $5, updated_at = CURRENT_TIMESTAMP
        WHERE assignment_submission_id = $6
        RETURNING *
      `, [score, maxScore, gradeLetter, feedback, currentUser.id, submissionId]);
    } else {
      // Create new grade
      gradeResult = await query(`
// Removed SQL fragment: INSERT INTO assignment_grades (assignment_submission_id, instructor_id, score, max_score, grade_letter, feedback)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [submissionId, currentUser.id, score, maxScore, gradeLetter, feedback]);
    }

    // Update submission status to graded
    await query(`
// Removed SQL fragment: UPDATE assignment_submissions 
      SET status = 'graded', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [submissionId]);

    res.json({ 
      grade: gradeResult.rows[0],
      message: existingGradeResult.rows.length > 0 ? 'Grade updated successfully' : 'Grade created successfully'
    });
  } catch (error) {
    console.error('Create/update assignment grade error:', error);
    res.status(500).json({ error: 'Failed to save assignment grade' });
  }
});

// Update assignment grade (instructors only)
router.put('/:id', [
  authenticateToken,
  requireRole(['instructor', 'admin']),
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

    // Check if grade exists
    const gradeResult = await query(`
// Removed SQL fragment: SELECT ag.*, asub.assignment_distribution_id
      FROM assignment_grades ag
      JOIN assignment_submissions asub ON ag.assignment_submission_id = asub.id
      WHERE ag.id = $1
    `, [id]);

    if (gradeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Grade not found' });
    }

    const grade = gradeResult.rows[0];

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (score !== undefined) {
      updates.push(`score = $${paramCount}`);
      values.push(score);
      paramCount++;
    }
    if (maxScore !== undefined) {
      updates.push(`max_score = $${paramCount}`);
      values.push(maxScore);
      paramCount++;
    }
    if (gradeLetter !== undefined) {
      updates.push(`grade_letter = $${paramCount}`);
      values.push(gradeLetter);
      paramCount++;
    }
    if (feedback !== undefined) {
      updates.push(`feedback = $${paramCount}`);
      values.push(feedback);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`instructor_id = $${paramCount}`);
    values.push(currentUser.id);
    paramCount++;

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const updateResult = await query(`
// Removed SQL fragment: UPDATE assignment_grades 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    res.json({ 
      grade: updateResult.rows[0],
      message: 'Grade updated successfully'
    });
  } catch (error) {
    console.error('Update assignment grade error:', error);
    res.status(500).json({ error: 'Failed to update assignment grade' });
  }
});

// Delete assignment grade (instructors only)
router.delete('/:id', [
  authenticateToken,
  requireRole(['instructor', 'admin'])
], async (req, res) => {
  try {
    const { id } = req.params;

    // Check if grade exists
    const gradeResult = await query(`
// Removed SQL fragment: SELECT ag.*, asub.id as submission_id
      FROM assignment_grades ag
      JOIN assignment_submissions asub ON ag.assignment_submission_id = asub.id
      WHERE ag.id = $1
    `, [id]);

    if (gradeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Grade not found' });
    }

    const grade = gradeResult.rows[0];

    // Delete the grade
    await query('DELETE FROM assignment_grades WHERE id = $1', [id]);

    // Update submission status back to submitted
    await query(`
// Removed SQL fragment: UPDATE assignment_submissions 
      SET status = 'submitted', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [grade.submission_id]);

    res.json({ message: 'Grade deleted successfully' });
  } catch (error) {
    console.error('Delete assignment grade error:', error);
    res.status(500).json({ error: 'Failed to delete assignment grade' });
  }
});

// Get grade statistics and analytics (instructors/admin only)
router.get('/analytics', [
  authenticateToken,
  requireRole(['instructor', 'admin'])
], async (req, res) => {
  try {
    const { classId, assignmentId, dateFrom, dateTo } = req.query;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramCount = 1;

    // Apply filters
    if (classId) {
      whereClause += ` AND c.id = $${paramCount}`;
      queryParams.push(classId);
      paramCount++;
    }

    if (assignmentId) {
      whereClause += ` AND ca.id = $${paramCount}`;
      queryParams.push(assignmentId);
      paramCount++;
    }

    if (dateFrom) {
      whereClause += ` AND ag.graded_at >= $${paramCount}`;
      queryParams.push(dateFrom);
      paramCount++;
    }

    if (dateTo) {
      whereClause += ` AND ag.graded_at <= $${paramCount}`;
      queryParams.push(dateTo);
      paramCount++;
    }

    // Get overall statistics
    const statsResult = await query(`
// Removed SQL fragment: SELECT
        COUNT(*) as total_grades,
        AVG(ag.percentage) as average_percentage,
        MIN(ag.percentage) as min_percentage,
        MAX(ag.percentage) as max_percentage,
        STDDEV(ag.percentage) as std_deviation,
        COUNT(DISTINCT u.id) as total_students,
        COUNT(DISTINCT ca.id) as total_assignments
      FROM assignment_grades ag
      JOIN assignment_submissions asub ON ag.assignment_submission_id = asub.id
      JOIN assignment_distributions ad ON asub.assignment_distribution_id = ad.id
      JOIN created_assignments ca ON ad.assignment_id = ca.id
      JOIN users u ON asub.user_id = u.id
      LEFT JOIN group_members gm ON u.id = gm.user_id
      LEFT JOIN groups g ON gm.group_id = g.id
      LEFT JOIN classes c ON g.class_id = c.id
      ${whereClause}
    `, queryParams);

    // Get grade distribution by letter
    const gradeDistributionResult = await query(`
// Removed SQL fragment: SELECT
        ag.grade_letter,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
      FROM assignment_grades ag
      JOIN assignment_submissions asub ON ag.assignment_submission_id = asub.id
      JOIN assignment_distributions ad ON asub.assignment_distribution_id = ad.id
      JOIN created_assignments ca ON ad.assignment_id = ca.id
      JOIN users u ON asub.user_id = u.id
      LEFT JOIN group_members gm ON u.id = gm.user_id
      LEFT JOIN groups g ON gm.group_id = g.id
      LEFT JOIN classes c ON g.class_id = c.id
      ${whereClause}
      GROUP BY ag.grade_letter
      ORDER BY ag.grade_letter
    `, queryParams);

    // Get top performing students
    const topStudentsResult = await query(`
// Removed SQL fragment: SELECT
        u.first_name || ' ' || u.last_name as student_name,
        u.student_id,
        c.name as class_name,
        AVG(ag.percentage) as average_percentage,
        COUNT(ag.id) as total_assignments,
        MAX(ag.percentage) as highest_grade,
        MIN(ag.percentage) as lowest_grade
      FROM assignment_grades ag
      JOIN assignment_submissions asub ON ag.assignment_submission_id = asub.id
      JOIN assignment_distributions ad ON asub.assignment_distribution_id = ad.id
      JOIN created_assignments ca ON ad.assignment_id = ca.id
      JOIN users u ON asub.user_id = u.id
      LEFT JOIN group_members gm ON u.id = gm.user_id
      LEFT JOIN groups g ON gm.group_id = g.id
      LEFT JOIN classes c ON g.class_id = c.id
      ${whereClause}
      GROUP BY u.id, u.first_name, u.last_name, u.student_id, c.name
      HAVING COUNT(ag.id) > 0
      ORDER BY AVG(ag.percentage) DESC
      LIMIT 10
    `, queryParams);

    // Get assignment performance
    const assignmentPerformanceResult = await query(`
// Removed SQL fragment: SELECT
        ca.name as assignment_title,
        ca.id as assignment_id,
        COUNT(ag.id) as total_submissions,
        AVG(ag.percentage) as average_percentage,
        MIN(ag.percentage) as min_percentage,
        MAX(ag.percentage) as max_percentage,
        COUNT(CASE WHEN ag.percentage >= 90 THEN 1 END) as a_grades,
        COUNT(CASE WHEN ag.percentage >= 80 AND ag.percentage < 90 THEN 1 END) as b_grades,
        COUNT(CASE WHEN ag.percentage >= 70 AND ag.percentage < 80 THEN 1 END) as c_grades,
        COUNT(CASE WHEN ag.percentage < 70 THEN 1 END) as below_c_grades
      FROM assignment_grades ag
      JOIN assignment_submissions asub ON ag.assignment_submission_id = asub.id
      JOIN assignment_distributions ad ON asub.assignment_distribution_id = ad.id
      JOIN created_assignments ca ON ad.assignment_id = ca.id
      JOIN users u ON asub.user_id = u.id
      LEFT JOIN group_members gm ON u.id = gm.user_id
      LEFT JOIN groups g ON gm.group_id = g.id
      LEFT JOIN classes c ON g.class_id = c.id
      ${whereClause}
      GROUP BY ca.id, ca.name
      ORDER BY AVG(ag.percentage) DESC
    `, queryParams);

    // Get class performance comparison
    const classPerformanceResult = await query(`
// Removed SQL fragment: SELECT
        c.name as class_name,
        c.id as class_id,
        COUNT(ag.id) as total_grades,
        AVG(ag.percentage) as average_percentage,
        COUNT(DISTINCT u.id) as total_students,
        COUNT(DISTINCT ca.id) as total_assignments
      FROM assignment_grades ag
      JOIN assignment_submissions asub ON ag.assignment_submission_id = asub.id
      JOIN assignment_distributions ad ON asub.assignment_distribution_id = ad.id
      JOIN created_assignments ca ON ad.assignment_id = ca.id
      JOIN users u ON asub.user_id = u.id
      LEFT JOIN group_members gm ON u.id = gm.user_id
      LEFT JOIN groups g ON gm.group_id = g.id
      LEFT JOIN classes c ON g.class_id = c.id
      ${whereClause}
      GROUP BY c.id, c.name
      ORDER BY AVG(ag.percentage) DESC
    `, queryParams);

    res.json({
      statistics: statsResult.rows[0],
      gradeDistribution: gradeDistributionResult.rows,
      topStudents: topStudentsResult.rows,
      assignmentPerformance: assignmentPerformanceResult.rows,
      classPerformance: classPerformanceResult.rows
    });
  } catch (error) {
    console.error('Get grade analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch grade analytics' });
  }
});

module.exports = router;
