const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken, requireRole, requireAdmin } = require('../middleware/auth');
// Temporarily comment out enhanced services
// const { applyRateLimit } = require('../middleware/rateLimiter');
// const DatabaseService = require('../services/databaseService');
// const AuditService = require('../services/auditService');
// const SessionService = require('../services/sessionService');
// const TwoFactorService = require('../services/twoFactorService');
// const MonitoringService = require('../services/monitoringService');
// const BackupService = require('../services/backupService');
const path = require('path');
const fs = require('fs');

// Get all assignment submissions for admin view
router.get('/assignment-submissions', authenticateToken, requireRole(['admin', 'instructor']), async (req, res) => {
  try {
    const { classId, assignmentId, status, page = 1, limit = 50 } = req.query;
    
    let whereConditions = ['1=1'];
    let queryParams = [];
    let paramIndex = 1;

    // Add filters
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
      // Status filtering will be handled on frontend based on file presence and deadlines
    }

    const offset = (page - 1) * limit;

    // Add LIMIT and OFFSET parameters
    const limitParam = paramIndex;
    const offsetParam = paramIndex + 1;
    queryParams.push(limit, offset);

    const submissionsQuery = `
      SELECT
        asub.id,
        asub.assignment_distribution_id as "assignmentDistributionId",
        asub.user_id as "userId",
        asub.assignment_response_filename as "assignmentResponseFilename",
        asub.output_test_filename as "outputTestFilename",
        asub.submitted_at as "submittedAt",
        asub.updated_at as "updatedAt",
        asub.is_locked as "isLocked",
        -- Assignment details
        ca.name as "assignmentTitle",
        ca.description as "assignmentDescription",
        ad.assignment_type as "assignmentType",
        ad.deadline,
        ad.scheduled_date as "scheduledDate",
        -- Student details
        CONCAT(u.first_name, ' ', u.last_name) as "studentName",
        u.email as "studentEmail",
        u.student_id as "studentId",
        -- Class details
        c.name as "className",
        -- Group details (if applicable)
        g.name as "groupName",
        -- Grade details (if graded)
        ag.id as "gradeId",
        ag.score as "gradeScore",
        ag.max_score as "gradeMaxScore",
        ag.grade_letter as "gradeLetter",
        ag.percentage as "gradePercentage",
        ag.feedback as "gradeFeedback",
        ag.graded_at as "gradedAt",
        CONCAT(instructor.first_name, ' ', instructor.last_name) as "instructorName"
      FROM assignment_submissions asub
      INNER JOIN assignment_distributions ad ON asub.assignment_distribution_id = ad.id
      INNER JOIN created_assignments ca ON ad.assignment_id = ca.id
      INNER JOIN users u ON asub.user_id = u.id
      LEFT JOIN classes c ON ad.class_id = c.id
      LEFT JOIN groups g ON ad.group_id = g.id
      LEFT JOIN assignment_grades ag ON asub.id = ag.assignment_submission_id
      LEFT JOIN users instructor ON ag.instructor_id = instructor.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY asub.submitted_at DESC, asub.updated_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const result = await query(submissionsQuery, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM assignment_submissions asub
      INNER JOIN assignment_distributions ad ON asub.assignment_distribution_id = ad.id
      INNER JOIN created_assignments ca ON ad.assignment_id = ca.id
      INNER JOIN users u ON asub.user_id = u.id
      LEFT JOIN classes c ON ad.class_id = c.id
      LEFT JOIN groups g ON ad.group_id = g.id
      LEFT JOIN assignment_grades ag ON asub.id = ag.assignment_submission_id
      LEFT JOIN users instructor ON ag.instructor_id = instructor.id
      WHERE ${whereConditions.join(' AND ')}
    `;

    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const totalSubmissions = parseInt(countResult.rows[0].total);

    // Format submissions with grade data
    const formattedSubmissions = result.rows.map(row => {
      const submission = {
        id: row.id,
        assignmentDistributionId: row.assignmentDistributionId,
        userId: row.userId,
        assignmentResponseFilename: row.assignmentResponseFilename,
        outputTestFilename: row.outputTestFilename,
        submittedAt: row.submittedAt,
        updatedAt: row.updatedAt,
        isLocked: row.isLocked,
        assignmentTitle: row.assignmentTitle,
        assignmentDescription: row.assignmentDescription,
        assignmentType: row.assignmentType,
        deadline: row.deadline,
        scheduledDate: row.scheduledDate,
        studentName: row.studentName,
        studentEmail: row.studentEmail,
        studentId: row.studentId,
        className: row.className,
        groupName: row.groupName
      };

      // Add grade information if available
      if (row.gradeId) {
        submission.grade = {
          id: row.gradeId,
          score: parseFloat(row.gradeScore),
          maxScore: parseFloat(row.gradeMaxScore),
          gradeLetter: row.gradeLetter,
          percentage: parseFloat(row.gradePercentage),
          feedback: row.gradeFeedback,
          gradedAt: row.gradedAt,
          instructorName: row.instructorName
        };
      }

      return submission;
    });

    res.json({
      submissions: formattedSubmissions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalSubmissions / limit),
        totalItems: totalSubmissions,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching assignment submissions:', error);
    res.status(500).json({ error: 'Failed to fetch assignment submissions' });
  }
});

// Download assignment submission file for admin
router.get('/assignment-submissions/:submissionId/download/:fileType', 
  authenticateToken, 
  requireRole(['admin', 'instructor']), 
  async (req, res) => {
    try {
      const { submissionId, fileType } = req.params;

      // Validate file type
      if (!['assignment_response', 'output_test'].includes(fileType)) {
        return res.status(400).json({ error: 'Invalid file type' });
      }

      // Get submission details
      const submissionQuery = `
        SELECT 
          asub.*,
          ad.assignment_id,
          ca.name as assignment_title,
          u.first_name,
          u.last_name,
          u.student_id
        FROM assignment_submissions asub
        INNER JOIN assignment_distributions ad ON asub.assignment_distribution_id = ad.id
        INNER JOIN created_assignments ca ON ad.assignment_id = ca.id
        INNER JOIN users u ON asub.user_id = u.id
        WHERE asub.assignment_distribution_id = $1
      `;

      const submissionResult = await query(submissionQuery, [submissionId]);

      if (submissionResult.rows.length === 0) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      const submission = submissionResult.rows[0];
      
      // Get the filename based on file type
      const filename = fileType === 'assignment_response' 
        ? submission.assignment_response_filename 
        : submission.output_test_filename;

      if (!filename) {
        return res.status(404).json({ error: `${fileType.replace('_', ' ')} file not found` });
      }

      // Construct file path
      const filePath = path.join(__dirname, '../uploads/assignment-submissions', filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found on server' });
      }

      // Set appropriate headers
      const originalName = `${submission.first_name}_${submission.last_name}_${submission.student_id}_${fileType}.pdf`;
      
      res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
      res.setHeader('Content-Type', 'application/pdf');

      // Send file
      res.sendFile(filePath);

    } catch (error) {
      console.error('Error downloading submission file:', error);
      res.status(500).json({ error: 'Failed to download file' });
    }
  }
);

// Get submission statistics for admin dashboard
router.get('/assignment-submissions/stats', authenticateToken, requireRole(['admin', 'instructor']), async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_submissions,
        COUNT(CASE WHEN asub.assignment_response_filename IS NOT NULL AND asub.output_test_filename IS NOT NULL THEN 1 END) as completed_submissions,
        COUNT(CASE WHEN asub.assignment_response_filename IS NOT NULL OR asub.output_test_filename IS NOT NULL THEN 1 END) as partial_submissions,
        COUNT(CASE WHEN asub.assignment_response_filename IS NULL AND asub.output_test_filename IS NULL THEN 1 END) as no_submissions,
        COUNT(CASE WHEN ad.deadline < NOW() AND (asub.assignment_response_filename IS NULL OR asub.output_test_filename IS NULL) THEN 1 END) as overdue_submissions
      FROM assignment_submissions asub
      INNER JOIN assignment_distributions ad ON asub.assignment_distribution_id = ad.id
    `;

    const result = await query(statsQuery);
    const stats = result.rows[0];

    res.json({
      totalSubmissions: parseInt(stats.total_submissions),
      completedSubmissions: parseInt(stats.completed_submissions),
      partialSubmissions: parseInt(stats.partial_submissions),
      noSubmissions: parseInt(stats.no_submissions),
      overdueSubmissions: parseInt(stats.overdue_submissions)
    });

  } catch (error) {
    console.error('Error fetching submission stats:', error);
    res.status(500).json({ error: 'Failed to fetch submission statistics' });
  }
});

// Delete assignment submission (admin only)
router.delete('/assignment-submissions/:submissionId', 
  authenticateToken, 
  requireRole(['admin']), 
  async (req, res) => {
    try {
      const { submissionId } = req.params;

      // Get submission details first
      const submissionQuery = `
        SELECT * FROM assignment_submissions 
        WHERE assignment_distribution_id = $1
      `;

      const submissionResult = await query(submissionQuery, [submissionId]);

      if (submissionResult.rows.length === 0) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      const submission = submissionResult.rows[0];

      // Delete files from filesystem
      const filesToDelete = [];
      if (submission.assignment_response_filename) {
        filesToDelete.push(path.join(__dirname, '../uploads/assignment-submissions', submission.assignment_response_filename));
      }
      if (submission.output_test_filename) {
        filesToDelete.push(path.join(__dirname, '../uploads/assignment-submissions', submission.output_test_filename));
      }

      // Delete files
      filesToDelete.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });

      // Delete from database
      await query('DELETE FROM assignment_submissions WHERE assignment_distribution_id = $1', [submissionId]);

      res.json({ message: 'Submission deleted successfully' });

    } catch (error) {
      console.error('Error deleting submission:', error);
      res.status(500).json({ error: 'Failed to delete submission' });
    }
  }
);

// Get database schema (admin only)
router.get('/database-schema',
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      // Get all tables and their columns with a simpler approach
      const schemaQuery = `
        SELECT
          t.table_name,
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          c.character_maximum_length,
          c.ordinal_position
        FROM information_schema.tables t
        LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
          AND t.table_schema = c.table_schema
        WHERE t.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
          AND t.table_name NOT LIKE 'pg_%'
          AND t.table_name != 'information_schema'
        ORDER BY t.table_name, c.ordinal_position;
      `;

      // Get constraints separately
      const constraintsQuery = `
        SELECT
          tc.table_name,
          kcu.column_name,
          tc.constraint_type,
          ccu.table_name AS referenced_table_name,
          ccu.column_name AS referenced_column_name
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
          AND tc.table_schema = ccu.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE')
        ORDER BY tc.table_name, kcu.column_name;
      `;

      const [schemaResult, constraintsResult] = await Promise.all([
        query(schemaQuery),
        query(constraintsQuery)
      ]);

      // Group schema results by table
      const tables = {};
      schemaResult.rows.forEach(row => {
        if (!tables[row.table_name]) {
          tables[row.table_name] = {
            name: row.table_name,
            columns: []
          };
        }

        if (row.column_name) {
          const column = {
            name: row.column_name,
            type: row.data_type,
            nullable: row.is_nullable === 'YES',
            default: row.column_default,
            maxLength: row.character_maximum_length,
            constraintType: null,
            referencedTable: null,
            referencedColumn: null
          };

          tables[row.table_name].columns.push(column);
        }
      });

      // Add constraint information
      constraintsResult.rows.forEach(constraint => {
        const table = tables[constraint.table_name];
        if (table) {
          const column = table.columns.find(c => c.name === constraint.column_name);
          if (column) {
            column.constraintType = constraint.constraint_type;
            if (constraint.constraint_type === 'FOREIGN KEY') {
              column.referencedTable = constraint.referenced_table_name;
              column.referencedColumn = constraint.referenced_column_name;
            }
          }
        }
      });

      // Get table row counts
      const tableNames = Object.keys(tables);
      const rowCounts = {};

      for (const tableName of tableNames) {
        try {
          const countResult = await query(`SELECT COUNT(*) as count FROM ${tableName}`);
          rowCounts[tableName] = parseInt(countResult.rows[0].count);
        } catch (error) {
          rowCounts[tableName] = 0;
        }
      }

      res.json({
        tables: Object.values(tables),
        rowCounts,
        totalTables: tableNames.length,
        generatedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error fetching database schema:', error);
      res.status(500).json({ error: 'Failed to fetch database schema' });
    }
  }
);

// Enhanced Admin Routes for System Management - Temporarily Disabled

/*
// Get system dashboard statistics
router.get('/dashboard-stats', [
  authenticateToken,
  requireAdmin,
  applyRateLimit('admin')
], async (req, res) => {
  try {
    const { refresh } = req.query;
    const stats = await DatabaseService.getDashboardStats(refresh === 'true');

    res.json(stats);
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard statistics' });
  }
});

// Get database health metrics
router.get('/database-health', [
  authenticateToken,
  requireAdmin,
  applyRateLimit('admin')
], async (req, res) => {
  try {
    const health = await DatabaseService.getDatabaseHealth();

    await AuditService.logEvent({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'VIEW_DATABASE_HEALTH',
      resourceType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionId
    });

    res.json(health);
  } catch (error) {
    console.error('Get database health error:', error);
    res.status(500).json({ error: 'Failed to retrieve database health' });
  }
});

// Get system security overview
router.get('/security-overview', [
  authenticateToken,
  requireAdmin,
  applyRateLimit('admin')
], async (req, res) => {
  try {
    // Get recent security events
    const securityEvents = await AuditService.getAuditLogs({
      action: ['LOGIN_ATTEMPT_INVALID_PASSWORD', 'LOGIN_ATTEMPT_LOCKED_ACCOUNT', 'RATE_LIMIT_EXCEEDED'],
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    }, 1, 50);

    // Get session stats
    const sessionStats = await SessionService.getSessionStats();

    // Get 2FA stats
    const twoFactorStats = await TwoFactorService.getTwoFactorStats();

    res.json({
      securityEvents: securityEvents.logs,
      sessionStats,
      twoFactorStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get security overview error:', error);
    res.status(500).json({ error: 'Failed to retrieve security overview' });
  }
});

// System Monitoring Routes

// Get comprehensive system health
router.get('/system-health', [
  authenticateToken,
  requireAdmin,
  applyRateLimit('admin')
], async (req, res) => {
  try {
    const health = await MonitoringService.getSystemHealth();

    await AuditService.logEvent({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'VIEW_SYSTEM_HEALTH',
      resourceType: 'ADMIN',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionId
    });

    res.json(health);
  } catch (error) {
    console.error('Get system health error:', error);
    res.status(500).json({ error: 'Failed to retrieve system health' });
  }
});

// Get performance history
router.get('/performance-history', [
  authenticateToken,
  requireAdmin,
  applyRateLimit('admin')
], async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const history = await MonitoringService.getPerformanceHistory(parseInt(hours));

    res.json({ history });
  } catch (error) {
    console.error('Get performance history error:', error);
    res.status(500).json({ error: 'Failed to retrieve performance history' });
  }
});

// Get system alerts
router.get('/system-alerts', [
  authenticateToken,
  requireAdmin,
  applyRateLimit('admin')
], async (req, res) => {
  try {
    const alerts = await MonitoringService.getSystemAlerts();

    res.json({ alerts });
  } catch (error) {
    console.error('Get system alerts error:', error);
    res.status(500).json({ error: 'Failed to retrieve system alerts' });
  }
});

// Enhanced Backup and Restore Routes

// Create database backup
router.post('/backup/database', [
  authenticateToken,
  requireAdmin,
  applyRateLimit('admin')
], async (req, res) => {
  try {
    const { includeData = true, compress = true } = req.body;

    const result = await BackupService.createDatabaseBackup({
      userId: req.user.id,
      includeData,
      compress
    });

    res.json(result);
  } catch (error) {
    console.error('Database backup error:', error);
    res.status(500).json({ error: 'Failed to create database backup' });
  }
});

// Create application backup
router.post('/backup/application', [
  authenticateToken,
  requireAdmin,
  applyRateLimit('admin')
], async (req, res) => {
  try {
    const result = await BackupService.createApplicationBackup({
      userId: req.user.id
    });

    res.json(result);
  } catch (error) {
    console.error('Application backup error:', error);
    res.status(500).json({ error: 'Failed to create application backup' });
  }
});

// List backups
router.get('/backups', [
  authenticateToken,
  requireAdmin,
  applyRateLimit('admin')
], async (req, res) => {
  try {
    const backups = await BackupService.listBackups();

    res.json({ backups });
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

// Delete backup
router.delete('/backup/:filename', [
  authenticateToken,
  requireAdmin,
  applyRateLimit('admin')
], async (req, res) => {
  try {
    const { filename } = req.params;

    const result = await BackupService.deleteBackup({
      userId: req.user.id,
      filename
    });

    res.json(result);
  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({ error: 'Failed to delete backup' });
  }
});
*/

module.exports = router;
