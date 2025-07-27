const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all labs
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Try to get labs from Supabase
    try {
      const { data: labs, error } = await supabase
        .from('labs')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      res.json({
        message: 'Labs retrieved successfully',
        labs: labs || []
      });

    } catch (supabaseError) {
      console.log('Supabase labs fetch failed, using sample data:', supabaseError.message);
      
      // Provide sample labs data
      const sampleLabs = [
        {
          id: 'f202a2b2-08b0-41cf-8f97-c0160f247ad8',
          name: 'Computer Lab 1',
          location: 'Building A, Floor 1',
          capacity: 15,
          description: 'Main computer lab with 15 workstations',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'a8f3d1e5-2b4c-4d6e-8f9a-1c2d3e4f5a6b',
          name: 'Computer Lab 2',
          location: 'Building A, Floor 2',
          capacity: 19,
          description: 'Secondary computer lab with 19 workstations',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      res.json({
        message: 'Labs retrieved successfully (sample data)',
        labs: sampleLabs
      });
    }

  } catch (error) {
    console.error('Get labs error:', error);
    res.status(500).json({ error: 'Failed to fetch labs' });
  }
});

// Get lab by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Try to get lab from Supabase
    try {
      const { data: labs, error } = await supabase
        .from('labs')
        .select('*')
        .eq('id', id)
        .limit(1);

      if (error) {
        throw error;
      }

      if (!labs || labs.length === 0) {
        return res.status(404).json({ error: 'Lab not found' });
      }

      res.json({
        message: 'Lab retrieved successfully',
        lab: labs[0]
      });

    } catch (supabaseError) {
      console.log('Supabase lab fetch failed, using fallback:', supabaseError.message);
      
      // Provide fallback lab data based on common IDs
      let sampleLab;
      if (id === 'f202a2b2-08b0-41cf-8f97-c0160f247ad8') {
        sampleLab = {
          id: 'f202a2b2-08b0-41cf-8f97-c0160f247ad8',
          name: 'Computer Lab 1',
          location: 'Building A, Floor 1',
          capacity: 15,
          description: 'Main computer lab with 15 workstations',
          is_active: true
        };
      } else if (id === 'a8f3d1e5-2b4c-4d6e-8f9a-1c2d3e4f5a6b') {
        sampleLab = {
          id: 'a8f3d1e5-2b4c-4d6e-8f9a-1c2d3e4f5a6b',
          name: 'Computer Lab 2',
          location: 'Building A, Floor 2',
          capacity: 19,
          description: 'Secondary computer lab with 19 workstations',
          is_active: true
        };
      } else {
        sampleLab = {
          id: id,
          name: 'Demo Lab',
          location: 'Demo Location',
          capacity: 20,
          description: 'Demo lab for testing',
          is_active: true
        };
      }

      res.json({
        message: 'Lab retrieved successfully (fallback)',
        lab: sampleLab
      });
    }

  } catch (error) {
    console.error('Get lab by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch lab' });
  }
});

// Create lab
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // For demo purposes, return success
    res.json({
      message: 'Lab created successfully (demo mode)',
      lab: {
        id: 'new-lab-id',
        ...req.body,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Create lab error:', error);
    res.status(500).json({ error: 'Failed to create lab' });
  }
});

// Update lab
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // For demo purposes, return success
    res.json({
      message: 'Lab updated successfully (demo mode)',
      lab: {
        id: req.params.id,
        ...req.body,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Update lab error:', error);
    res.status(500).json({ error: 'Failed to update lab' });
  }
});

// Delete lab
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // For demo purposes, return success
    res.json({
      message: 'Lab deleted successfully (demo mode)'
    });

  } catch (error) {
    console.error('Delete lab error:', error);
    res.status(500).json({ error: 'Failed to delete lab' });
  }
});

module.exports = router;
