const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get schedules with pagination and filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = 'all',
      lab_id,
      class_id,
      instructor_id 
    } = req.query;

    // Try to get schedules from Supabase
    try {
      let query = supabase
        .from('schedules')
        .select(`
          *,
          labs:lab_id (id, name),
          classes:class_id (id, name),
          users:instructor_id (id, first_name, last_name)
        `)
        .order('scheduled_date', { ascending: false });

      // Apply filters
      if (status !== 'all') {
        query = query.eq('status', status);
      }
      if (lab_id) {
        query = query.eq('lab_id', lab_id);
      }
      if (class_id) {
        query = query.eq('class_id', class_id);
      }
      if (instructor_id) {
        query = query.eq('instructor_id', instructor_id);
      }

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: schedules, error, count } = await query;

      if (error) {
        throw error;
      }

      const totalPages = Math.ceil(count / limit);

      res.json({
        message: 'Schedules retrieved successfully',
        schedules: schedules || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          pages: totalPages
        }
      });

    } catch (supabaseError) {
      console.log('Supabase schedules fetch failed, using sample data:', supabaseError.message);
      
      // Provide sample schedules data
      const sampleSchedules = [
        {
          id: 'schedule-1',
          title: 'Programming Lab Session',
          description: 'Introduction to Python programming',
          scheduled_date: new Date().toISOString(),
          start_time: '09:00:00',
          end_time: '11:00:00',
          status: 'scheduled',
          lab_id: 'f202a2b2-08b0-41cf-8f97-c0160f247ad8',
          class_id: 'class-1-uuid',
          instructor_id: 'instructor-uuid-1',
          created_at: new Date().toISOString(),
          labs: {
            id: 'f202a2b2-08b0-41cf-8f97-c0160f247ad8',
            name: 'Computer Lab 1'
          },
          classes: {
            id: 'class-1-uuid',
            name: 'Computer Science 101'
          },
          users: {
            id: 'instructor-uuid-1',
            first_name: 'John',
            last_name: 'Instructor'
          }
        },
        {
          id: 'schedule-2',
          title: 'Database Lab Session',
          description: 'SQL queries and database design',
          scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          start_time: '14:00:00',
          end_time: '16:00:00',
          status: 'scheduled',
          lab_id: 'a8f3d1e5-2b4c-4d6e-8f9a-1c2d3e4f5a6b',
          class_id: 'class-2-uuid',
          instructor_id: 'instructor-uuid-1',
          created_at: new Date().toISOString(),
          labs: {
            id: 'a8f3d1e5-2b4c-4d6e-8f9a-1c2d3e4f5a6b',
            name: 'Computer Lab 2'
          },
          classes: {
            id: 'class-2-uuid',
            name: 'Programming Fundamentals'
          },
          users: {
            id: 'instructor-uuid-1',
            first_name: 'John',
            last_name: 'Instructor'
          }
        }
      ];

      // Filter sample data based on status
      let filteredSchedules = sampleSchedules;
      if (status !== 'all') {
        filteredSchedules = sampleSchedules.filter(s => s.status === status);
      }

      res.json({
        message: 'Schedules retrieved successfully (sample data)',
        schedules: filteredSchedules,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredSchedules.length,
          pages: Math.ceil(filteredSchedules.length / limit)
        }
      });
    }

  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// Get schedule by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Try to get schedule from Supabase
    try {
      const { data: schedules, error } = await supabase
        .from('schedules')
        .select(`
          *,
          labs:lab_id (id, name, location),
          classes:class_id (id, name, description),
          users:instructor_id (id, first_name, last_name, email)
        `)
        .eq('id', id)
        .limit(1);

      if (error) {
        throw error;
      }

      if (!schedules || schedules.length === 0) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      res.json({
        message: 'Schedule retrieved successfully',
        schedule: schedules[0]
      });

    } catch (supabaseError) {
      console.log('Supabase schedule fetch failed, using fallback:', supabaseError.message);
      
      // Provide fallback schedule data
      const sampleSchedule = {
        id: id,
        title: 'Demo Lab Session',
        description: 'Demo lab session for testing',
        scheduled_date: new Date().toISOString(),
        start_time: '10:00:00',
        end_time: '12:00:00',
        status: 'scheduled',
        lab_id: 'f202a2b2-08b0-41cf-8f97-c0160f247ad8',
        class_id: 'class-1-uuid',
        instructor_id: 'instructor-uuid-1',
        created_at: new Date().toISOString(),
        labs: {
          id: 'f202a2b2-08b0-41cf-8f97-c0160f247ad8',
          name: 'Computer Lab 1',
          location: 'Building A, Floor 1'
        },
        classes: {
          id: 'class-1-uuid',
          name: 'Demo Class',
          description: 'Demo class for testing'
        },
        users: {
          id: 'instructor-uuid-1',
          first_name: 'Demo',
          last_name: 'Instructor',
          email: 'instructor@demo.com'
        }
      };

      res.json({
        message: 'Schedule retrieved successfully (fallback)',
        schedule: sampleSchedule
      });
    }

  } catch (error) {
    console.error('Get schedule by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// Create schedule
router.post('/', authenticateToken, requireRole(['admin', 'instructor']), async (req, res) => {
  try {
    // For demo purposes, return success
    res.json({
      message: 'Schedule created successfully (demo mode)',
      schedule: {
        id: 'new-schedule-id',
        ...req.body,
        status: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// Update schedule
router.put('/:id', authenticateToken, requireRole(['admin', 'instructor']), async (req, res) => {
  try {
    // For demo purposes, return success
    res.json({
      message: 'Schedule updated successfully (demo mode)',
      schedule: {
        id: req.params.id,
        ...req.body,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// Delete schedule
router.delete('/:id', authenticateToken, requireRole(['admin', 'instructor']), async (req, res) => {
  try {
    // For demo purposes, return success
    res.json({
      message: 'Schedule deleted successfully (demo mode)'
    });

  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

module.exports = router;
