const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');
// Temporarily comment out new services to fix startup issues
// const SessionService = require('../services/sessionService');
// const AuditService = require('../services/auditService');
// const TwoFactorService = require('../services/twoFactorService');
const {
  sendPasswordResetEmail,
  sendPasswordResetRequestToAdmin,
  testEmailConnection,
  createEmailAccount,
  generateEmailAddress,
  sendWelcomeEmail
} = require('../services/emailService');

const router = express.Router();

// Generate JWT token
const generateToken = (userId, email, role) => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Register new user (admin only for now)
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('role').isIn(['student', 'instructor', 'admin']),
  body('studentId').optional().isLength({ min: 8, max: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, role, studentId } = req.body;

    // Check if user already exists using Supabase client
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${email}${studentId ? `,student_id.eq.${studentId}` : ''}`)
      .limit(1);

    if (checkError) {
      console.error('❌ Supabase check error:', checkError);
      return res.status(500).json({ error: 'Registration failed', details: checkError.message });
    }

    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate email address for mail server (temporarily disabled)
    // const mailAddress = generateEmailAddress(firstName, lastName, studentId);
    // const tempMailPassword = `temp${Math.random().toString(36).slice(-8)}`;

    // Insert new user using Supabase client
    const { data: newUsers, error: insertError } = await supabase
      .from('users')
      .insert([{
        email,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        role,
        student_id: studentId || null
      }])
      .select('id, email, first_name, last_name, role, student_id, created_at');

    if (insertError) {
      console.error('❌ Supabase insert error:', insertError);
      return res.status(500).json({ error: 'Registration failed', details: insertError.message });
    }

    const user = newUsers[0];
    const token = generateToken(user.id, user.email, user.role);

    // Create email account on mail server (temporarily disabled)
    // const emailResult = await createEmailAccount(mailAddress, tempMailPassword);
    // if (emailResult.success) {
    //   console.log(`Email account created for ${user.first_name} ${user.last_name}: ${mailAddress}`);
    //   await sendWelcomeEmail(email, firstName, tempMailPassword, mailAddress);
    // } else {
    //   console.error(`Failed to create email account for ${mailAddress}:`, emailResult.error);
    // }

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        studentId: user.student_id,
        // mailAddress: user.mail_address,
        createdAt: user.created_at
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Simple Login (Enhanced features temporarily disabled)
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email using Supabase client
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, email, password_hash, first_name, last_name, role, student_id, is_active')
      .eq('email', email)
      .limit(1);

    if (fetchError) {
      console.error('❌ Supabase query error:', fetchError);
      return res.status(500).json({ error: 'Login failed', details: fetchError.message });
    }

    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate simple JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        studentId: user.student_id,
        isActive: user.is_active
      },
      token
    });
  } catch (error) {
    console.error('Login error details:', {
      message: error.message,
      stack: error.stack,
      email: req.body.email
    });
    res.status(500).json({
      error: 'Login failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Simple Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Refresh token route temporarily disabled

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        studentId: user.student_id
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Change password
router.put('/change-password', [
  authenticateToken,
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get current password hash
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    const user = result.rows[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Request password reset (sends request to admin)
router.post('/request-password-reset', [
  body('email').isEmail().normalizeEmail(),
  body('message').optional().isLength({ max: 500 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, message = '' } = req.body;

    // Check if user exists
    const userResult = await query(
      'SELECT id, email, first_name, last_name, role FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    // Always return success to prevent email enumeration
    if (userResult.rows.length === 0) {
      return res.json({
        message: 'Password reset request has been sent to the administrator. You will be contacted through alternative means.'
      });
    }

    const user = userResult.rows[0];
    const userName = `${user.first_name} ${user.last_name}`;

    // For admin users, still allow direct reset
    if (user.role === 'admin') {
      // Generate reset token (valid for 1 hour)
      const resetToken = jwt.sign(
        { userId: user.id, email: user.email, type: 'password_reset' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Store reset token in database with expiration
      await query(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '1 hour')
         ON CONFLICT (user_id)
         DO UPDATE SET token = $2, expires_at = NOW() + INTERVAL '1 hour', created_at = NOW()`,
        [user.id, resetToken]
      );

      // Send password reset email directly to admin
      const emailResult = await sendPasswordResetEmail(email, resetToken, user.first_name);

      if (emailResult.success) {
        console.log(`Password reset email sent to admin ${email}`);
      } else {
        console.error(`Failed to send password reset email to admin ${email}:`, emailResult.error);
      }

      return res.json({
        message: 'Password reset link has been sent to your email.',
        isAdmin: true
      });
    }

    // Store the request in database
    await query(
      `INSERT INTO password_reset_requests (user_id, user_email, user_name, message)
       VALUES ($1, $2, $3, $4)`,
      [user.id, email, userName, message]
    );

    // For non-admin users, send request to admin
    const emailResult = await sendPasswordResetRequestToAdmin(email, userName, message);

    if (emailResult.success) {
      console.log(`Password reset request sent to admin for user ${email}`);
    } else {
      console.error(`Failed to send password reset request to admin for user ${email}:`, emailResult.error);
    }

    res.json({
      message: 'Password reset request has been sent to the administrator. You will be contacted through alternative means (phone, in-person, etc.) with your new password.'
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Reset password with token
router.post('/reset-password', [
  body('token').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, newPassword } = req.body;

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }
    } catch (error) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Check if token exists in database and is not expired
    const tokenResult = await query(
      'SELECT user_id FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, decoded.userId]
    );

    // Delete used token
    await query(
      'DELETE FROM password_reset_tokens WHERE token = $1',
      [token]
    );

    res.json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Admin reset user password
router.post('/admin-reset-password', [
  authenticateToken,
  requireRole(['admin']),
  body('userId').isUUID(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, newPassword } = req.body;

    // Check if target user exists
    const userResult = await query(
      'SELECT id, email, first_name, last_name, role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );

    res.json({ message: 'User password reset successfully' });

  } catch (error) {
    console.error('Admin password reset error:', error);
    res.status(500).json({ error: 'Failed to reset user password' });
  }
});

// Test email connection (admin only)
router.get('/test-email', [authenticateToken, requireRole(['admin'])], async (req, res) => {
  try {
    const result = await testEmailConnection();

    if (result.success) {
      res.json({ message: 'Email server connection successful' });
    } else {
      res.status(500).json({
        error: 'Email server connection failed',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Email test error:', error);
    res.status(500).json({ error: 'Failed to test email connection' });
  }
});

// Logout (client-side token removal, but we can log it)
router.post('/logout', authenticateToken, (req, res) => {
  // In a more sophisticated setup, you might want to blacklist the token
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
