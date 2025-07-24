const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { applyRateLimit } = require('../middleware/rateLimiter');
const AuditService = require('../services/auditService');
const SessionService = require('../services/sessionService');
const TwoFactorService = require('../services/twoFactorService');

const router = express.Router();

// Get audit logs (admin only)
router.get('/audit-logs', [
  authenticateToken,
  requireAdmin,
  applyRateLimit('admin')
], async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      resourceType,
      startDate,
      endDate,
      success,
      ipAddress
    } = req.query;

    const filters = {};
    if (userId) filters.userId = userId;
    if (action) filters.action = action;
    if (resourceType) filters.resourceType = resourceType;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (success !== undefined) filters.success = success === 'true';
    if (ipAddress) filters.ipAddress = ipAddress;

    const result = await AuditService.getAuditLogs(filters, parseInt(page), parseInt(limit));

    await AuditService.logEvent({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'VIEW_AUDIT_LOGS',
      resourceType: 'AUDIT',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionId,
      metadata: { filters, page, limit }
    });

    res.json(result);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to retrieve audit logs' });
  }
});

// Get audit statistics (admin only)
router.get('/audit-stats', [
  authenticateToken,
  requireAdmin,
  applyRateLimit('admin')
], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const stats = await AuditService.getAuditStats(filters);

    res.json(stats);
  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve audit statistics' });
  }
});

// Get user sessions
router.get('/sessions', [
  authenticateToken,
  applyRateLimit('api')
], async (req, res) => {
  try {
    const sessions = await SessionService.getUserSessions(req.user.id);

    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to retrieve sessions' });
  }
});

// Invalidate a specific session
router.delete('/sessions/:sessionId', [
  authenticateToken,
  applyRateLimit('api')
], async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // For security, users can only invalidate their own sessions
    // Admins can invalidate any session
    if (req.user.role !== 'admin') {
      // Verify session belongs to user
      const sessions = await SessionService.getUserSessions(req.user.id);
      const sessionExists = sessions.some(s => s.id === sessionId);
      
      if (!sessionExists) {
        return res.status(403).json({ error: 'Cannot invalidate session' });
      }
    }

    const success = await SessionService.invalidateSession(sessionId);

    await AuditService.logEvent({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'INVALIDATE_SESSION',
      resourceType: 'SESSION',
      resourceId: sessionId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionId,
      success
    });

    if (success) {
      res.json({ message: 'Session invalidated successfully' });
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  } catch (error) {
    console.error('Invalidate session error:', error);
    res.status(500).json({ error: 'Failed to invalidate session' });
  }
});

// Invalidate all user sessions
router.delete('/sessions', [
  authenticateToken,
  applyRateLimit('api')
], async (req, res) => {
  try {
    const count = await SessionService.invalidateAllUserSessions(req.user.id);

    await AuditService.logEvent({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'INVALIDATE_ALL_SESSIONS',
      resourceType: 'SESSION',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionId,
      metadata: { invalidatedCount: count }
    });

    res.json({ message: `${count} sessions invalidated successfully` });
  } catch (error) {
    console.error('Invalidate all sessions error:', error);
    res.status(500).json({ error: 'Failed to invalidate sessions' });
  }
});

// Generate 2FA secret
router.post('/2fa/generate', [
  authenticateToken,
  applyRateLimit('auth')
], async (req, res) => {
  try {
    const setup = await TwoFactorService.generateSecret(req.user.id, req.user.email);

    await AuditService.logEvent({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'GENERATE_2FA_SECRET',
      resourceType: 'SECURITY',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionId
    });

    res.json(setup);
  } catch (error) {
    console.error('Generate 2FA secret error:', error);
    res.status(500).json({ error: 'Failed to generate 2FA secret' });
  }
});

// Enable 2FA
router.post('/2fa/enable', [
  authenticateToken,
  applyRateLimit('auth'),
  body('token').isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.body;
    const success = await TwoFactorService.enableTwoFactor(req.user.id, token);

    await AuditService.logEvent({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'ENABLE_2FA',
      resourceType: 'SECURITY',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionId,
      success
    });

    if (success) {
      res.json({ message: '2FA enabled successfully' });
    } else {
      res.status(400).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Disable 2FA
router.post('/2fa/disable', [
  authenticateToken,
  applyRateLimit('auth'),
  body('token').isLength({ min: 6 }).notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.body;
    const success = await TwoFactorService.disableTwoFactor(req.user.id, token);

    await AuditService.logEvent({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'DISABLE_2FA',
      resourceType: 'SECURITY',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionId,
      success
    });

    if (success) {
      res.json({ message: '2FA disabled successfully' });
    } else {
      res.status(400).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get 2FA status
router.get('/2fa/status', [
  authenticateToken,
  applyRateLimit('api')
], async (req, res) => {
  try {
    const status = await TwoFactorService.getTwoFactorStatus(req.user.id);
    res.json(status);
  } catch (error) {
    console.error('Get 2FA status error:', error);
    res.status(500).json({ error: 'Failed to get 2FA status' });
  }
});

// Regenerate backup codes
router.post('/2fa/backup-codes', [
  authenticateToken,
  applyRateLimit('auth'),
  body('token').isLength({ min: 6 }).notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.body;
    const backupCodes = await TwoFactorService.regenerateBackupCodes(req.user.id, token);

    await AuditService.logEvent({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'REGENERATE_BACKUP_CODES',
      resourceType: 'SECURITY',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionId,
      success: !!backupCodes
    });

    if (backupCodes) {
      res.json({ backupCodes });
    } else {
      res.status(400).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Regenerate backup codes error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
