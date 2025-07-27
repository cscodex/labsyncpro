const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all assignments
router.get('/', authenticateToken, async (req, res) => {
  try {
    // TODO: Implement proper assignment fetching with Supabase
    // For now, return empty assignments list
    res.json({
      assignments: [],
      message: 'Assignment system is being migrated to Supabase. Check back soon!'
    });
  } catch (error) {
    console.error('Get assignments error:', error);
    res.json({
      assignments: [],
      message: 'Assignment system is being migrated to Supabase. Check back soon!'
    });
  }
});

// Get assignments for the current student
router.get('/student', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Ensure only students can access this endpoint
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied. Students only.' });
    }

    // TODO: Implement proper assignment distribution system with Supabase
    // For now, return empty assignments list for students
    console.log(`📚 Student ${userId} requested assignments - returning empty list (Supabase migration pending)`);

    res.json({
      assignments: [],
      message: 'Assignment distribution system is being migrated to Supabase. Check back soon!'
    });
  } catch (error) {
    console.error('Error fetching student assignments:', error);
    res.json({
      assignments: [],
      message: 'No assignments available at the moment'
    });
  }
});

// Get assignment details by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    
    // TODO: Implement proper assignment details with Supabase
    // For now, return not found
    res.status(404).json({
      error: 'Assignment not found',
      message: 'Assignment details system is being migrated to Supabase'
    });
  } catch (error) {
    console.error('Get assignment details error:', error);
    res.status(500).json({ error: 'Failed to fetch assignment details' });
  }
});

// Update assignment (for instructors)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: Implement proper assignment update with Supabase
    res.status(404).json({
      error: 'Assignment update not available',
      message: 'Assignment update system is being migrated to Supabase'
    });
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});

// Create new assignment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      lab_id,
      class_id,
      scheduled_date,
      duration_minutes,
      assignment_type
    } = req.body;
    const currentUser = req.user;

    // TODO: Implement proper assignment creation with Supabase
    res.status(501).json({
      error: 'Assignment creation not implemented',
      message: 'Assignment creation system is being migrated to Supabase'
    });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// Submit assignment (upload response and output files)
router.post('/submit/:assignmentDistributionId', authenticateToken, async (req, res) => {
  try {
    const { assignmentDistributionId } = req.params;
    const userId = req.user.id;

    // TODO: Implement proper assignment submission with Supabase
    res.status(501).json({
      error: 'Assignment submission not implemented',
      message: 'Assignment submission system is being migrated to Supabase'
    });
  } catch (error) {
    console.error('Submit assignment error:', error);
    res.status(500).json({ error: 'Failed to submit assignment' });
  }
});

// Download assignment file
router.get('/download/:assignmentDistributionId/:fileType', authenticateToken, async (req, res) => {
  try {
    const { assignmentDistributionId, fileType } = req.params;
    const userId = req.user.id;

    // TODO: Implement proper file download with Supabase
    res.status(404).json({
      error: 'File not found',
      message: 'File download system is being migrated to Supabase'
    });
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

module.exports = router;
