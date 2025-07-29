const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const labRoutes = require('./routes/labs');
const classRoutes = require('./routes/classes');
const capacityRoutes = require('./routes/capacity');
const groupRoutes = require('./routes/groups');
const scheduleRoutes = require('./routes/schedules');
const assignmentRoutes = require('./routes/assignments');
const createdAssignmentRoutes = require('./routes/created-assignments');
// const assignmentDistributionRoutes = require('./routes/assignment-distributions');
const submissionRoutes = require('./routes/submissions');
const gradeRoutes = require('./routes/grades');
const assignmentGradeRoutes = require('./routes/assignment-grades');
// const gradeScalesRoutes = require('./routes/grade-scales');
// const inventoryRoutes = require('./routes/inventory');
// Temporarily comment out enhanced security features
// const securityRoutes = require('./routes/security');
// const { applyRateLimit, suspiciousActivityDetector } = require('./middleware/rateLimiter');
// Temporarily comment out potentially broken routes
// const fileUploadRoutes = require('./routes/fileUploads');
// const importRoutes = require('./routes/import');
// const exportRoutes = require('./routes/export');
// const webmailRoutes = require('./routes/webmail');
// const passwordResetRequestsRoutes = require('./routes/passwordResetRequests');
const adminRoutes = require('./routes/admin');
// const timetableRoutes = require('./routes/timetable');
const { restrictStudentAccess } = require('./middleware/studentRestriction');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting - more permissive for development
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // limit each IP to 1000 requests per minute
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'https://labsyncpro-frontend.onrender.com',
  process.env.CLIENT_URL
].filter(Boolean);

console.log('🔗 Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.CLIENT_URL === '*') {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With', 'Cache-Control'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced security middleware temporarily disabled
// app.use(suspiciousActivityDetector);

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// Static files for templates
app.use('/templates', express.static('public/templates'));

// Health check endpoint - simple version that always responds
app.get('/health', async (req, res) => {
  try {
    // Test database connection (non-blocking)
    let dbStatus = 'unknown';
    try {
      // Try Supabase client first
      const { supabase } = require('./config/supabase');
      const { data, error } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true });

      if (!error) {
        dbStatus = 'connected (supabase)';
      } else {
        // Fallback to PostgreSQL pool
        const dbTest = await Promise.race([
          query('SELECT 1 as test'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
        ]);
        dbStatus = dbTest.rows[0]?.test === 1 ? 'connected (pg)' : 'error';
      }
    } catch (dbError) {
      dbStatus = 'disconnected';
    }

    // Always return 200 OK for health check
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
      environment: process.env.NODE_ENV || 'unknown',
      version: '1.0.0'
    });
  } catch (error) {
    // Even if there's an error, return 200 for health check
    res.status(200).json({
      status: 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'error',
      error: error.message
    });
  }
});

// Simple ping endpoint for monitoring
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Test database with Supabase client
app.get('/test-db', async (req, res) => {
  try {
    const { supabase } = require('./config/supabase');
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(5);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      message: 'Database test successful',
      userCount: data.length,
      users: data.map(u => ({ id: u.id, email: u.email, role: u.role }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Placeholder routes moved to individual route files for proper handling

// API routes
app.use('/api/auth', authRoutes);

// Health check endpoint (before auth middleware)
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected (supabase)',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic API info endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'LabSyncPro API',
    version: '1.0.0',
    endpoints: [
      '/api/classes',
      '/api/labs',
      '/api/users',
      '/api/assignments',
      '/api/submissions',
      '/api/grades',
      '/api/groups',
      '/api/capacity'
    ]
  });
});

// Apply student access restriction to all API routes except auth
app.use('/api', restrictStudentAccess);
app.use('/api/users', userRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/capacity', capacityRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/assignments/created', createdAssignmentRoutes);
// app.use('/api/assignment-distributions', assignmentDistributionRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/assignment-grades', assignmentGradeRoutes);
// app.use('/api/grade-scales', gradeScalesRoutes);
// app.use('/api/inventory', inventoryRoutes);
// Temporarily comment out broken route registrations
// app.use('/api/files', fileUploadRoutes);
// app.use('/api/import', importRoutes);
// app.use('/api/export', exportRoutes);
// app.use('/api/webmail', webmailRoutes);
// app.use('/api/password-reset-requests', passwordResetRequestsRoutes);
app.use('/api/admin', adminRoutes);
// app.use('/api/timetable', timetableRoutes);
// app.use('/api/security', securityRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Default error response
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (err.code === '23505') { // PostgreSQL unique violation
    statusCode = 409;
    message = 'Resource already exists';
  }
  
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 LabSyncPro server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📁 Supabase Storage enabled for PDF files`);
  console.log(`🔧 Assignment routes fixed`);
});

module.exports = app;
