const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
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
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

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
// Removed SQL fragment: SELECT
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

    // Provide fallback data for result
    return res.json({ message: "Fallback data", data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });

    // Provide fallback data for countResult
    return res.json({ message: "Fallback data", data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });

      // Provide fallback data for submissionResult
    return res.json({ message: "Fallback data", data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
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
// Removed SQL fragment: SELECT 
        COUNT(*) as total_submissions,
        COUNT(CASE WHEN asub.assignment_response_filename IS NOT NULL AND asub.output_test_filename IS NOT NULL THEN 1 END) as completed_submissions,
        COUNT(CASE WHEN asub.assignment_response_filename IS NOT NULL OR asub.output_test_filename IS NOT NULL THEN 1 END) as partial_submissions,
        COUNT(CASE WHEN asub.assignment_response_filename IS NULL AND asub.output_test_filename IS NULL THEN 1 END) as no_submissions,
        COUNT(CASE WHEN ad.deadline < NOW() AND (asub.assignment_response_filename IS NULL OR asub.output_test_filename IS NULL) THEN 1 END) as overdue_submissions
      FROM assignment_submissions asub
      INNER JOIN assignment_distributions ad ON asub.assignment_distribution_id = ad.id
    `;

    // Provide fallback data for result
    return res.json({ message: "Fallback data", data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });

      // Provide fallback data for submissionResult
    return res.json({ message: "Fallback data", data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
      `;

      // Get constraints separately
      const constraintsQuery = `
// Removed SQL fragment: SELECT
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
          // Provide fallback data for countResult
    return res.json({ message: "Fallback data", data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
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

// Git status check
router.get('/git/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { stdout: status } = await execAsync('git status --porcelain');
    const { stdout: branch } = await execAsync('git branch --show-current');
    const { stdout: lastCommit } = await execAsync('git log -1 --pretty=format:"%h %s (%cr)"');

    const hasChanges = status.trim().length > 0;
    const changes = status.trim().split('\n').filter(line => line.length > 0);

    res.json({
      hasChanges,
      changes,
      currentBranch: branch.trim(),
      lastCommit: lastCommit.trim(),
      status: status.trim()
    });
  } catch (error) {
    console.error('Git status error:', error);
    res.status(500).json({ error: 'Failed to get git status' });
  }
});

// Push changes to GitHub
router.post('/git/push', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { commitMessage } = req.body;

    if (!commitMessage || commitMessage.trim().length === 0) {
      return res.status(400).json({ error: 'Commit message is required' });
    }

    // Check if there are changes to commit
    const { stdout: status } = await execAsync('git status --porcelain');
    if (status.trim().length === 0) {
      return res.status(400).json({ error: 'No changes to commit' });
    }

    // Add all changes
    await execAsync('git add .');

    // Commit changes
    const sanitizedMessage = commitMessage.replace(/"/g, '\\"');
    await execAsync(`git commit -m "${sanitizedMessage}"`);

    // Push to origin
    const { stdout: pushOutput } = await execAsync('git push origin main');

    // Get updated status
    const { stdout: newStatus } = await execAsync('git status --porcelain');
    const { stdout: lastCommit } = await execAsync('git log -1 --pretty=format:"%h %s (%cr)"');

    res.json({
      success: true,
      message: 'Changes pushed to GitHub successfully',
      pushOutput: pushOutput.trim(),
      lastCommit: lastCommit.trim(),
      hasChanges: newStatus.trim().length > 0
    });
  } catch (error) {
    console.error('Git push error:', error);
    res.status(500).json({
      error: 'Failed to push changes to GitHub',
      details: error.message
    });
  }
});

// Run tests before push
router.post('/git/test-and-push', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { commitMessage, runTests = true } = req.body;

    if (!commitMessage || commitMessage.trim().length === 0) {
      return res.status(400).json({ error: 'Commit message is required' });
    }

    let testResults = null;

    // Run tests if requested
    if (runTests) {
      try {
        const { stdout: testOutput } = await execAsync('npm test', { timeout: 60000 });
        testResults = {
          success: true,
          output: testOutput
        };
      } catch (testError) {
        testResults = {
          success: false,
          output: testError.stdout || testError.message
        };
        return res.status(400).json({
          error: 'Tests failed. Cannot push to GitHub.',
          testResults
        });
      }
    }

    // Check if there are changes to commit
    const { stdout: status } = await execAsync('git status --porcelain');
    if (status.trim().length === 0) {
      return res.status(400).json({ error: 'No changes to commit' });
    }

    // Add all changes
    await execAsync('git add .');

    // Commit changes
    const sanitizedMessage = commitMessage.replace(/"/g, '\\"');
    await execAsync(`git commit -m "${sanitizedMessage}"`);

    // Push to origin
    const { stdout: pushOutput } = await execAsync('git push origin main');

    // Get updated status
    const { stdout: newStatus } = await execAsync('git status --porcelain');
    const { stdout: lastCommit } = await execAsync('git log -1 --pretty=format:"%h %s (%cr)"');

    res.json({
      success: true,
      message: 'Tests passed and changes pushed to GitHub successfully',
      pushOutput: pushOutput.trim(),
      lastCommit: lastCommit.trim(),
      hasChanges: newStatus.trim().length > 0,
      testResults
    });
  } catch (error) {
    console.error('Git test and push error:', error);
    res.status(500).json({
      error: 'Failed to test and push changes to GitHub',
      details: error.message
    });
  }
});

module.exports = router;
