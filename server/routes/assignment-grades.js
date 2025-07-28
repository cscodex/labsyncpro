const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Helper function to calculate grade letter from percentage
async function calculateGradeLetter(percentage) {
  try {
    const { data, error } = await supabase
      .from('grade_scales')
      .select('grade_letter')
      .eq('is_active', true)
      .gte('max_percentage', percentage)
      .lte('min_percentage', percentage)
      .limit(1)
      .single();

    if (error) {
      console.error('Error calculating grade letter:', error);
      return 'F';
    }

    return data ? data.grade_letter : 'F';
  } catch (error) {
    console.error('Error calculating grade letter:', error);
    return 'F';
  }
}

// Get assignment grades with filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { submissionId, studentId, assignmentId, page = 1, limit = 20 } = req.query;
    const currentUser = req.user;

    // For now, return placeholder data
    const grades = [
      {
        id: '1',
        assignment_id: 'assignment-1',
        student_id: 'student-1',
        submission_id: 'submission-1',
        grade_percentage: 85,
        grade_letter: 'B',
        feedback: 'Good work on the assignment',
        graded_by: 'instructor-1',
        graded_at: new Date().toISOString(),
        assignment_title: 'Sample Assignment',
        student_name: 'John Doe'
      }
    ];

    res.json({
      message: 'Assignment grades retrieved successfully',
      grades,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: grades.length,
        pages: Math.ceil(grades.length / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching assignment grades:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Create assignment grade
router.post('/', authenticateToken, requireRole(['instructor', 'admin']), [
  body('submission_id').notEmpty(),
  body('grade_percentage').isFloat({ min: 0, max: 100 }),
  body('feedback').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { submission_id, grade_percentage, feedback } = req.body;
    const grade_letter = await calculateGradeLetter(grade_percentage);

    // For now, return success response
    res.status(201).json({
      message: 'Grade created successfully',
      grade: {
        id: Date.now().toString(),
        submission_id,
        grade_percentage,
        grade_letter,
        feedback,
        graded_by: req.user.id,
        graded_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error creating grade:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update assignment grade
router.put('/:id', authenticateToken, requireRole(['instructor', 'admin']), [
  body('grade_percentage').optional().isFloat({ min: 0, max: 100 }),
  body('feedback').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { grade_percentage, feedback } = req.body;

    // For now, return success response
    res.json({
      message: 'Grade updated successfully',
      grade: {
        id,
        grade_percentage,
        feedback,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error updating grade:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
