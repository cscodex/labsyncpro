const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Helper function to convert data to CSV format
const convertToCSV = (data, headers) => {
  if (!data || data.length === 0) {
    return headers.join(',') + '\n';
  }

  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => {
    return headers.map(header => {
      let value = row[header] || '';
      // Handle values that contain commas, quotes, or newlines
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });

  return csvHeaders + '\n' + csvRows.join('\n');
};

// Export assignments data
router.get('/assignments', authenticateToken, requireRole(['admin', 'instructor']), async (req, res) => {
  try {
    const { classId, status, startDate, endDate } = req.query;

    let whereConditions = ['1=1']; // Base condition
    let queryParams = [];
    let paramIndex = 1;

    if (classId) {
      whereConditions.push(`c.id = $${paramIndex}`);
      queryParams.push(classId);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`ad.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`ad.scheduled_date >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`ad.scheduled_date <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }

    const assignmentsQuery = `
      SELECT DISTINCT
        ca.name as assignment_title,
        ca.description as assignment_description,
        ca.created_at as assignment_created,
        ad.scheduled_date,
        ad.deadline,
        ad.status,
        c.name as class_name,
        CASE
          WHEN ad.assignment_type = 'individual' THEN CONCAT(u.first_name, ' ', u.last_name, ' (', u.student_id, ')')
          WHEN ad.assignment_type = 'group' THEN g.name
          WHEN ad.assignment_type = 'class' THEN c.name
        END as assignee,
        ad.assignment_type as assignee_type,
        creator.first_name || ' ' || creator.last_name as created_by,
        TO_CHAR(ad.scheduled_date, 'DD-Mon-YYYY HH24:MI') as scheduled_date_formatted,
        TO_CHAR(ad.deadline, 'DD-Mon-YYYY HH24:MI') as deadline_formatted
      FROM assignment_distributions ad
      JOIN created_assignments ca ON ad.assignment_id = ca.id
      LEFT JOIN classes c ON ad.class_id = c.id
      LEFT JOIN users u ON ad.assignment_type = 'individual' AND ad.user_id = u.id
      LEFT JOIN groups g ON ad.assignment_type = 'group' AND ad.group_id = g.id
      LEFT JOIN users creator ON ca.created_by = creator.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ad.scheduled_date DESC, ca.name
    `;

    const result = await query(assignmentsQuery, queryParams);

    const headers = [
      'assignment_title',
      'assignment_description', 
      'class_name',
      'assignee',
      'assignee_type',
      'scheduled_date_formatted',
      'deadline_formatted',
      'status',
      'created_by',
      'assignment_created'
    ];

    const csvData = convertToCSV(result.rows, headers);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="assignments_export_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvData);

  } catch (error) {
    console.error('Export assignments error:', error);
    res.status(500).json({ error: 'Failed to export assignments data' });
  }
});

// Export grades data
router.get('/grades', authenticateToken, requireRole(['admin', 'instructor']), async (req, res) => {
  try {
    const { classId, assignmentId, startDate, endDate } = req.query;

    let whereConditions = ['g.id IS NOT NULL'];
    let queryParams = [];
    let paramIndex = 1;

    if (classId) {
      whereConditions.push(`c.id = $${paramIndex}`);
      queryParams.push(classId);
      paramIndex++;
    }

    if (assignmentId) {
      whereConditions.push(`ca.id = $${paramIndex}`);
      queryParams.push(assignmentId);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`g.graded_at >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`g.graded_at <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }

    const gradesQuery = `
      SELECT
        sch.title as assignment_title,
        c.name as class_name,
        u.first_name || ' ' || u.last_name as student_name,
        u.student_id,
        u.email as student_email,
        g.score,
        g.max_score,
        ROUND((g.score::decimal / g.max_score::decimal) * 100, 2) as percentage,
        g.feedback,
        grader.first_name || ' ' || grader.last_name as graded_by,
        TO_CHAR(g.graded_at, 'DD-Mon-YYYY HH24:MI') as graded_date,
        TO_CHAR(s.submitted_at, 'DD-Mon-YYYY HH24:MI') as submitted_date,
        s.submission_type,
        sch.deadline as assignment_deadline,
        CASE
          WHEN s.submitted_at <= sch.deadline THEN 'On Time'
          ELSE 'Late'
        END as submission_status
      FROM grades g
      JOIN submissions s ON g.submission_id = s.id
      JOIN schedules sch ON s.schedule_id = sch.id
      JOIN classes c ON sch.class_id = c.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN users grader ON g.instructor_id = grader.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY c.name, sch.title, u.last_name, u.first_name
    `;

    const result = await query(gradesQuery, queryParams);

    const headers = [
      'assignment_title',
      'class_name',
      'student_name',
      'student_id',
      'student_email',
      'score',
      'max_score',
      'percentage',
      'feedback',
      'graded_by',
      'graded_date',
      'submitted_date',
      'submission_type',
      'assignment_deadline',
      'submission_status'
    ];

    const csvData = convertToCSV(result.rows, headers);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="grades_export_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvData);

  } catch (error) {
    console.error('Export grades error:', error);
    res.status(500).json({ error: 'Failed to export grades data' });
  }
});

// Export submissions data
router.get('/submissions', authenticateToken, requireRole(['admin', 'instructor']), async (req, res) => {
  try {
    const { classId, assignmentId, status, startDate, endDate } = req.query;

    let whereConditions = ['s.id IS NOT NULL'];
    let queryParams = [];
    let paramIndex = 1;

    if (classId) {
      whereConditions.push(`c.id = $${paramIndex}`);
      queryParams.push(classId);
      paramIndex++;
    }

    if (assignmentId) {
      whereConditions.push(`ca.id = $${paramIndex}`);
      queryParams.push(assignmentId);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`ad.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`s.submitted_at >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`s.submitted_at <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }

    const submissionsQuery = `
      SELECT
        sch.title as assignment_title,
        c.name as class_name,
        u.first_name || ' ' || u.last_name as student_name,
        u.student_id,
        u.email as student_email,
        s.submission_type,
        s.file_paths,
        TO_CHAR(s.submitted_at, 'DD-Mon-YYYY HH24:MI') as submitted_date,
        TO_CHAR(sch.deadline, 'DD-Mon-YYYY HH24:MI') as deadline,
        CASE
          WHEN s.submitted_at <= sch.deadline THEN 'On Time'
          ELSE 'Late'
        END as submission_status,
        CASE
          WHEN g.id IS NOT NULL THEN 'Graded'
          ELSE 'Not Graded'
        END as grading_status,
        COALESCE(g.score, 0) as score,
        COALESCE(g.max_score, 0) as max_score
      FROM submissions s
      JOIN schedules sch ON s.schedule_id = sch.id
      JOIN classes c ON sch.class_id = c.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN grades g ON s.id = g.submission_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY c.name, sch.title, s.submitted_at DESC
    `;

    const result = await query(submissionsQuery, queryParams);

    const headers = [
      'assignment_title',
      'class_name',
      'student_name',
      'student_id',
      'student_email',
      'submission_type',
      'file_paths',
      'submitted_date',
      'deadline',
      'submission_status',
      'grading_status',
      'score',
      'max_score'
    ];

    const csvData = convertToCSV(result.rows, headers);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="submissions_export_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvData);

  } catch (error) {
    console.error('Export submissions error:', error);
    res.status(500).json({ error: 'Failed to export submissions data' });
  }
});

module.exports = router;
