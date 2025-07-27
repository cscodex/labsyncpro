const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all classes
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Try to get classes from Supabase
    try {
      const { data: classes, error } = await supabase
        .from('classes')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      res.json({
        message: 'Classes retrieved successfully',
        classes: classes || []
      });

    } catch (supabaseError) {
      console.log('Supabase classes fetch failed, using sample data:', supabaseError.message);
      
      // Provide sample classes data
      const sampleClasses = [
        {
          id: 'class-1-uuid',
          name: 'Computer Science 101',
          description: 'Introduction to Computer Science',
          instructor_id: 'instructor-uuid-1',
          lab_id: 'a8f3d1e5-2b4c-4d6e-8f9a-1c2d3e4f5a6b',
          semester: 'Fall 2024',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'class-2-uuid',
          name: 'Programming Fundamentals',
          description: 'Basic programming concepts',
          instructor_id: 'instructor-uuid-1',
          lab_id: 'a8f3d1e5-2b4c-4d6e-8f9a-1c2d3e4f5a6b',
          semester: 'Fall 2024',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      res.json({
        message: 'Classes retrieved successfully (sample data)',
        classes: sampleClasses
      });
    }

  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// Get class by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Try to get class from Supabase
    try {
      const { data: classes, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', id)
        .limit(1);

      if (error) {
        throw error;
      }

      if (!classes || classes.length === 0) {
        return res.status(404).json({ error: 'Class not found' });
      }

      res.json({
        message: 'Class retrieved successfully',
        class: classes[0]
      });

    } catch (supabaseError) {
      console.log('Supabase class fetch failed, using fallback:', supabaseError.message);
      
      // Provide fallback class data
      const sampleClass = {
        id: id,
        name: 'Demo Class',
        description: 'Demo class for testing',
        instructor_id: 'instructor-uuid-1',
        lab_id: 'a8f3d1e5-2b4c-4d6e-8f9a-1c2d3e4f5a6b',
        semester: 'Fall 2024',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      res.json({
        message: 'Class retrieved successfully (fallback)',
        class: sampleClass
      });
    }

  } catch (error) {
    console.error('Get class by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

// Get assignments for a class
router.get('/:id/assignments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Try to get assignments from Supabase
    try {
      const { data: assignments, error } = await supabase
        .from('assignment_distributions')
        .select(`
          *,
          assignments:assignment_id (
            id,
            name,
            description,
            file_path,
            created_at
          )
        `)
        .eq('class_id', id)
        .order('scheduled_date', { ascending: false });

      if (error) {
        throw error;
      }

      res.json({
        message: 'Class assignments retrieved successfully',
        assignments: assignments || []
      });

    } catch (supabaseError) {
      console.log('Supabase class assignments fetch failed, using sample data:', supabaseError.message);
      
      // Provide sample assignments data
      const sampleAssignments = [
        {
          id: 'assignment-dist-1',
          assignment_id: 'assignment-1',
          class_id: id,
          scheduled_date: new Date().toISOString(),
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'published',
          assignments: {
            id: 'assignment-1',
            name: 'Sample Assignment',
            description: 'This is a sample assignment for demo purposes',
            file_path: null,
            created_at: new Date().toISOString()
          }
        }
      ];

      res.json({
        message: 'Class assignments retrieved successfully (sample data)',
        assignments: sampleAssignments
      });
    }

  } catch (error) {
    console.error('Get class assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch class assignments' });
  }
});

// Create class
router.post('/', authenticateToken, requireRole(['admin', 'instructor']), async (req, res) => {
  try {
    // For demo purposes, return success
    res.json({
      message: 'Class created successfully (demo mode)',
      class: {
        id: 'new-class-id',
        ...req.body,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// Update class
router.put('/:id', authenticateToken, requireRole(['admin', 'instructor']), async (req, res) => {
  try {
    // For demo purposes, return success
    res.json({
      message: 'Class updated successfully (demo mode)',
      class: {
        id: req.params.id,
        ...req.body,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

// Delete class
router.delete('/:id', authenticateToken, requireRole(['admin', 'instructor']), async (req, res) => {
  try {
    // For demo purposes, return success
    res.json({
      message: 'Class deleted successfully (demo mode)'
    });

  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

module.exports = router;
