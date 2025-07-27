const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Get all password reset requests (admin only)
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { status = 'all', limit = 50, offset = 0 } = req.query;
    
    let whereClause = '';
    let queryParams = [limit, offset];
    
    if (status !== 'all') {
      whereClause = 'WHERE prr.status = $3';
      queryParams.push(status);
    }
    
    // TODO: Implement password reset requests table in Supabase
    // For now, return empty data to prevent 500 errors
    res.json({
      requests: [],
      total: 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
  } catch (error) {
    console.error('Error fetching password reset requests:', error);
    res.status(500).json({ error: 'Failed to fetch password reset requests' });
  }
});

// Get password reset request statistics
router.get('/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const result = await query(`
// Removed SQL fragment: SELECT 
        status,
        COUNT(*) as count
      FROM password_reset_requests
      GROUP BY status
    `);
    
    const stats = {
      pending: 0,
      completed: 0,
      rejected: 0,
      total: 0
    };
    
    result.rows.forEach(row => {
      stats[row.status] = parseInt(row.count);
      stats.total += parseInt(row.count);
    });
    
    res.json({ stats });
    
  } catch (error) {
    console.error('Error fetching password reset request stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Complete a password reset request
router.post('/:requestId/complete', [
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { requestId } = req.params;
    const { newPassword } = req.body;
    const adminId = req.user.id;
    
    // Get the request details
    const requestResult = await query(
      'SELECT * FROM password_reset_requests WHERE id = $1 AND status = $2',
      [requestId, 'pending']
    );
    
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Password reset request not found or already processed' });
    }
    
    const request = requestResult.rows[0];
    
    // Hash the new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Update user's password
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, request.user_id]
    );
    
    // Mark request as completed
    await query(
      `UPDATE password_reset_requests 
       SET status = 'completed', completed_by = $1, completed_at = CURRENT_TIMESTAMP
// Removed SQL fragment: WHERE id = $2`,
      [adminId, requestId]
    );
    
    console.log(`Password reset completed for user ${request.user_email} by admin ${req.user.email}`);
    
    res.json({
      message: 'Password reset completed successfully',
      userEmail: request.user_email,
      userName: request.user_name
    });
    
  } catch (error) {
    console.error('Error completing password reset:', error);
    res.status(500).json({ error: 'Failed to complete password reset' });
  }
});

// Reject a password reset request
router.post('/:requestId/reject', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { requestId } = req.params;
    const adminId = req.user.id;
    
    // Check if request exists and is pending
    const requestResult = await query(
      'SELECT * FROM password_reset_requests WHERE id = $1 AND status = $2',
      [requestId, 'pending']
    );
    
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Password reset request not found or already processed' });
    }
    
    const request = requestResult.rows[0];
    
    // Mark request as rejected
    await query(
      `UPDATE password_reset_requests 
       SET status = 'rejected', completed_by = $1, completed_at = CURRENT_TIMESTAMP
// Removed SQL fragment: WHERE id = $2`,
      [adminId, requestId]
    );
    
    console.log(`Password reset rejected for user ${request.user_email} by admin ${req.user.email}`);
    
    res.json({
      message: 'Password reset request rejected',
      userEmail: request.user_email,
      userName: request.user_name
    });
    
  } catch (error) {
    console.error('Error rejecting password reset:', error);
    res.status(500).json({ error: 'Failed to reject password reset request' });
  }
});

// Delete a password reset request (admin only)
router.delete('/:requestId', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const result = await query(
      'DELETE FROM password_reset_requests WHERE id = $1 RETURNING *',
      [requestId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Password reset request not found' });
    }
    
    res.json({ message: 'Password reset request deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting password reset request:', error);
    res.status(500).json({ error: 'Failed to delete password reset request' });
  }
});

module.exports = router;
