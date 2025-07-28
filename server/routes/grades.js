const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get grades with filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { submissionId, userId, status, page = 1, limit = 20 } = req.query;
    const currentUser = req.user;
    
    // For now, return empty grades data
    // TODO: Implement proper Supabase queries
    res.json({
      grades: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        pages: 0
      },
      message: 'Grades feature is being updated'
    });
  } catch (error) {
    console.error('Get grades error:', error);
    res.json({
      grades: [],
      pagination: {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        total: 0,
        pages: 0
      },
      message: 'No grades available at the moment'
    });
  }
});

// Get grade by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // For now, return not found
    res.status(404).json({
      error: 'Grade not found',
      message: 'Grades feature is being updated'
    });
  } catch (error) {
    console.error('Get grade error:', error);
    res.status(500).json({ error: 'Failed to get grade' });
  }
});

// Create or update grade (instructors only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { submissionId, score, maxScore, feedback } = req.body;
    const currentUser = req.user;

    // Only instructors can create grades
    if (currentUser.role !== 'instructor' && currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only instructors can create grades' });
    }

    // TODO: Implement proper grade creation with Supabase
    res.status(501).json({
      error: 'Grade creation not implemented',
      message: 'Grading system is being migrated to Supabase'
    });
  } catch (error) {
    console.error('Create grade error:', error);
    res.status(500).json({ error: 'Failed to create grade' });
  }
});

module.exports = router;
