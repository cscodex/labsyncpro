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
    // Return sample data for now
    const sampleSubmissions = [
      {
        id: '1',
        assignmentDistributionId: 'dist-1',
        userId: 'user-1',
        assignmentResponseFilename: 'assignment_response.pdf',
        outputTestFilename: 'output_test.pdf',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isLocked: false,
        assignmentTitle: 'Sample Assignment',
        assignmentDescription: 'This is a sample assignment',
        className: 'Computer Science 101',
        assignmentType: 'individual',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        scheduledDate: new Date().toISOString(),
        studentName: 'John Doe',
        studentEmail: 'john.doe@example.com',
        studentId: 'CS001',
        groupName: null,
        grade: {
          id: 'grade-1',
          score: 85,
          maxScore: 100,
          gradeLetter: 'B',
          feedback: 'Good work!',
          gradedAt: new Date().toISOString()
        }
      }
    ];

    res.json({
      message: 'Assignment submissions retrieved successfully',
      submissions: sampleSubmissions,
      total: sampleSubmissions.length,
      pagination: {
        page: 1,
        limit: 50,
        total: sampleSubmissions.length,
        pages: 1
      }
    });

  } catch (error) {
    console.error('Error fetching assignment submissions:', error);
    res.status(500).json({ error: 'Failed to fetch assignment submissions' });
  }
});

// Get submission statistics for admin dashboard
router.get('/assignment-submissions/stats', authenticateToken, requireRole(['admin', 'instructor']), async (req, res) => {
  try {
    // Return sample statistics
    const stats = {
      total_submissions: 25,
      completed_submissions: 20,
      partial_submissions: 3,
      no_submissions: 2,
      overdue_submissions: 1
    };

    res.json({
      message: 'Submission statistics retrieved successfully',
      stats: stats
    });
  } catch (error) {
    console.error('Error fetching submission statistics:', error);
    res.status(500).json({ error: 'Failed to fetch submission statistics' });
  }
});

module.exports = router;
