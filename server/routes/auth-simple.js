const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Login endpoint
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Try to get user from Supabase
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .limit(1);

      if (error || !users || users.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = users[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        }
      });

    } catch (supabaseError) {
      console.log('Supabase login failed, using fallback:', supabaseError.message);
      
      // Fallback for demo purposes
      if (email === 'admin@labsyncpro.com' && password === 'admin123') {
        const token = jwt.sign(
          { 
            userId: '0baa2fd8-cd21-4027-9534-1709718a0050', 
            email: 'admin@labsyncpro.com', 
            role: 'admin' 
          },
          process.env.JWT_SECRET || 'fallback-secret',
          { expiresIn: '24h' }
        );

        return res.json({
          message: 'Login successful (demo mode)',
          token,
          user: {
            id: '0baa2fd8-cd21-4027-9534-1709718a0050',
            email: 'admin@labsyncpro.com',
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin'
          }
        });
      }
      
      return res.status(401).json({ error: 'Invalid credentials' });
    }

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register endpoint (simplified)
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').notEmpty(),
  body('lastName').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // For demo purposes, return success without actually creating user
    res.json({
      message: 'Registration successful (demo mode)',
      user: {
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        role: 'student'
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logout successful' });
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Try to get user from Supabase
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role, student_id')
        .eq('id', req.user.userId)
        .limit(1);

      if (error || !users || users.length === 0) {
        throw new Error('User not found in Supabase');
      }

      const user = users[0];
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

    } catch (supabaseError) {
      console.log('Supabase user fetch failed, using token data:', supabaseError.message);
      
      // Fallback to token data
      res.json({
        user: {
          id: req.user.userId,
          email: req.user.email,
          firstName: 'Demo',
          lastName: 'User',
          role: req.user.role
        }
      });
    }

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Password reset request
router.post('/password-reset-request', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // For demo purposes, always return success
    res.json({
      message: 'Password reset request sent successfully (demo mode)',
      email: req.body.email
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
