const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireStudentOrInstructor } = require('../middleware/auth');

const router = express.Router();

// Get submissions with filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { scheduleId, userId, status, page = 1, limit = 20 } = req.query;
    const currentUser = req.user;
    
    // For now, return empty submissions data
    // TODO: Implement proper Supabase queries
    res.json({
      submissions: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        pages: 0
      },
      message: 'Submissions feature is being updated'
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.json({
      submissions: [],
      pagination: {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        total: 0,
        pages: 0
      },
      message: 'No submissions available at the moment'
    });
  }
});

// Get submission by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // For now, return not found
    res.status(404).json({
      error: 'Submission not found',
      message: 'Submissions feature is being updated'
    });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ error: 'Failed to get submission' });
  }
});

module.exports = router;
