const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// Simple JWT token verification
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

    // Get user from database to ensure they still exist and are active
    const userResult = await query(
      'SELECT id, email, role, is_active, first_name, last_name, student_id FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Check if user has required role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: userRole
      });
    }

    next();
  };
};

// Middleware for instructor-only routes
const requireInstructor = requireRole(['instructor', 'admin']);

// Middleware for admin-only routes
const requireAdmin = requireRole('admin');

// Middleware for student-only routes
const requireStudent = requireRole('student');

// Middleware that allows both students and instructors
const requireStudentOrInstructor = requireRole(['student', 'instructor', 'admin']);

module.exports = {
  authenticateToken,
  requireRole,
  requireInstructor,
  requireAdmin,
  requireStudent,
  requireStudentOrInstructor
};
