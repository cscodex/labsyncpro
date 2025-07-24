const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5002;

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Test server is working!',
    timestamp: new Date().toISOString()
  });
});

// Basic auth route for testing
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simple test credentials
  if (email === 'admin@labsyncpro.com' && password === 'admin123') {
    res.json({
      success: true,
      user: {
        id: '1',
        email: 'admin@labsyncpro.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin'
      },
      token: 'test-token-123'
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Basic timetable routes for testing
app.get('/api/timetable/test', (req, res) => {
  res.json({ 
    message: 'Timetable routes are working!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/timetable/weekly', (req, res) => {
  res.json({
    success: true,
    weekStart: new Date().toISOString().split('T')[0],
    timetableEntries: []
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log('📍 Test endpoints:');
  console.log(`   GET  http://localhost:${PORT}/api/test`);
  console.log(`   POST http://localhost:${PORT}/api/auth/login`);
  console.log(`   GET  http://localhost:${PORT}/api/timetable/test`);
});
