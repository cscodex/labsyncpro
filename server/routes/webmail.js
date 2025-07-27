const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
// const { applyRateLimit } = require('../middleware/rateLimiter');
const { supabase } = require('../config/supabase');
const { supabase } = require('../config/supabase');
const {
  getEmails,
  getEmail,
  markAsRead,
  sendInternalEmail,
  deleteEmail,
  getMailboxStats,
  storeEmail
} = require('../services/mailboxService');
const {
  setupLocalMailServer,
  checkMailServerStatus
} = require('../services/emailService');
// const AuditService = require('../services/auditService');

const router = express.Router();

// Get inbox emails
router.get('/inbox', authenticateToken, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const emails = await getEmails(req.user.id, 'inbox', parseInt(limit));
    res.json({ emails });
  } catch (error) {
    console.error('Inbox fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// Get emails from specific folder
router.get('/folder/:folder', authenticateToken, async (req, res) => {
  try {
    const { folder } = req.params;
    const { limit = 50 } = req.query;

    const validFolders = ['inbox', 'sent', 'drafts', 'trash'];
    if (!validFolders.includes(folder)) {
      return res.status(400).json({ error: 'Invalid folder' });
    }

    const emails = await getEmails(req.user.id, folder, parseInt(limit));
    res.json({ emails });
  } catch (error) {
    console.error('Folder fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// Get specific email
router.get('/email/:emailId', authenticateToken, async (req, res) => {
  try {
    const { emailId } = req.params;
    const email = await getEmail(req.user.id, emailId);

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Mark as read when viewing
    await markAsRead(req.user.id, emailId);

    res.json({ email });
  } catch (error) {
    console.error('Email fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

// Send email
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { to, subject, content } = req.body;

    if (!to || !subject || !content) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, content' });
    }

    const result = await sendInternalEmail(req.user.id, to, subject, content);

    res.json({
      message: 'Email sent successfully',
      messageId: result.inboxId
    });

  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});

// Get mailbox stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await getMailboxStats(req.user.id);
    res.json({ stats });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch mailbox stats' });
  }
});

// Mark email as read
router.put('/email/:emailId/read', authenticateToken, async (req, res) => {
  try {
    const { emailId } = req.params;
    const success = await markAsRead(req.user.id, emailId);

    if (success) {
      res.json({ message: 'Email marked as read' });
    } else {
      res.status(404).json({ error: 'Email not found' });
    }
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark email as read' });
  }
});

// Delete email
router.delete('/email/:emailId', authenticateToken, async (req, res) => {
  try {
    const { emailId } = req.params;
    const success = await deleteEmail(req.user.id, emailId);

    if (success) {
      res.json({ message: 'Email deleted successfully' });
    } else {
      res.status(404).json({ error: 'Email not found' });
    }
  } catch (error) {
    console.error('Delete email error:', error);
    res.status(500).json({ error: 'Failed to delete email' });
  }
});

// Get all users for email composition
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('email, first_name, last_name, role')
      .eq('is_active', true)
      .order('first_name', { ascending: true })
      .order('last_name', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    const formattedUsers = users.map(user => ({
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      role: user.role
    }));

    res.json({ users: formattedUsers });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Enhanced Mail Server Management Routes

// Setup local mail server (admin only)
router.post('/setup-mail-server', [
  authenticateToken,
  requireAdmin
], async (req, res) => {
  try {
    const result = await setupLocalMailServer();

    // Audit logging temporarily disabled
    // await AuditService.logEvent({...});

    res.json(result);
  } catch (error) {
    console.error('Setup mail server error:', error);
    res.status(500).json({ error: 'Failed to setup mail server' });
  }
});

// Check mail server status
router.get('/mail-server-status', [
  authenticateToken,
  requireAdmin
], async (req, res) => {
  try {
    const status = await checkMailServerStatus();
    res.json(status);
  } catch (error) {
    console.error('Check mail server status error:', error);
    res.status(500).json({ error: 'Failed to check mail server status' });
  }
});

// Get email accounts (admin only)
router.get('/email-accounts', [
  authenticateToken,
  requireAdmin
], async (req, res) => {
  try {
    const result = await query(`
      SELECT
        ea.id,
        ea.email,
        ea.first_name,
        ea.last_name,
        ea.is_active,
        ea.quota_mb,
        ea.used_quota_mb,
        ea.last_login,
        ea.created_at,
        u.role as user_role
      FROM email_accounts ea
      LEFT JOIN users u ON ea.user_id = u.id
      WHERE ea.deleted_at IS NULL
      ORDER BY ea.created_at DESC
    `);

    res.json({ accounts: result.rows });
  } catch (error) {
    console.error('Get email accounts error:', error);
    res.status(500).json({ error: 'Failed to retrieve email accounts' });
  }
});

// Get email templates (admin only)
router.get('/email-templates', [
  authenticateToken,
  requireAdmin
], async (req, res) => {
  try {
    const result = await query(`
      SELECT
        id, template_key, subject, html_content,
        text_content, variables, is_active, created_at
      FROM email_templates
      ORDER BY template_key
    `);

    res.json({ templates: result.rows });
  } catch (error) {
    console.error('Get email templates error:', error);
    res.status(500).json({ error: 'Failed to retrieve email templates' });
  }
});

// Update email template (admin only)
router.put('/email-templates/:id', [
  authenticateToken,
  requireAdmin,
  body('subject').notEmpty().trim(),
  body('html_content').notEmpty(),
  body('text_content').optional(),
  body('variables').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { subject, html_content, text_content, variables } = req.body;

    const result = await query(`
      UPDATE email_templates
      SET subject = $1, html_content = $2, text_content = $3,
          variables = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [subject, html_content, text_content, JSON.stringify(variables || []), id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Email template not found' });
    }

    // Audit logging temporarily disabled
    // await AuditService.logEvent({...});

    res.json({ template: result.rows[0] });
  } catch (error) {
    console.error('Update email template error:', error);
    res.status(500).json({ error: 'Failed to update email template' });
  }
});

// Get email logs (admin only)
router.get('/email-logs', [
  authenticateToken,
  requireAdmin
], async (req, res) => {
  try {
    const { page = 1, limit = 50, status, template_key } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (template_key) {
      whereClause += ` AND template_key = $${paramIndex}`;
      queryParams.push(template_key);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total FROM email_logs WHERE ${whereClause}
    `, queryParams);

    // Get logs
    const logsResult = await query(`
      SELECT
        id, from_email, to_email, subject, template_key,
        status, error_message, sent_at, delivered_at
      FROM email_logs
      WHERE ${whereClause}
      ORDER BY sent_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...queryParams, limit, offset]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      logs: logsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get email logs error:', error);
    res.status(500).json({ error: 'Failed to retrieve email logs' });
  }
});

// Get email statistics (admin only)
router.get('/email-stats', [
  authenticateToken,
  requireAdmin
], async (req, res) => {
  try {
    const accountStats = await query('SELECT * FROM email_account_stats');

    const logStats = await query(`
      SELECT
        COUNT(*) as total_emails,
        COUNT(*) FILTER (WHERE status = 'sent') as sent_emails,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_emails,
        COUNT(*) FILTER (WHERE sent_at >= CURRENT_DATE - INTERVAL '7 days') as emails_last_week,
        COUNT(*) FILTER (WHERE sent_at >= CURRENT_DATE - INTERVAL '30 days') as emails_last_month
      FROM email_logs
    `);

    res.json({
      accounts: accountStats.rows[0] || {},
      logs: logStats.rows[0] || {},
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get email stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve email statistics' });
  }
});

module.exports = router;
