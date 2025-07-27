const express = require('express');
const router = express.Router();
const { body, validationResult, query: queryValidator } = require('express-validator');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Simple test route
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Timetable routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Get weekly timetable (legacy compatibility)
router.get('/weekly', authenticateToken, async (req, res) => {
  try {
    const { week_start, class_id } = req.query;
    
    // Calculate week start date (Monday) if not provided
    let weekStartDate;
    if (week_start) {
      weekStartDate = new Date(week_start);
    } else {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      weekStartDate = new Date(today);
      weekStartDate.setDate(today.getDate() + daysToMonday);
    }
    
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);

    // For now, return empty timetable
    const timetableEntries = [];

    res.json({
      success: true,
      weekStart: weekStartDate.toISOString().split('T')[0],
      timetableEntries
    });
  } catch (error) {
    console.error('Get weekly timetable error:', error);
    res.status(500).json({ error: 'Failed to fetch weekly timetable' });
  }
});

// Get timetable configuration (basic)
router.get('/config', authenticateToken, async (req, res) => {
  try {
    // Return basic config
    res.json({
      success: true,
      config: {
        max_lectures_per_day: 4,
        lecture_duration_minutes: 90,
        break_duration_minutes: 15,
        start_time: '09:00:00',
        end_time: '16:30:00',
        working_days: [1, 2, 3, 4, 5] // Monday to Friday
      }
    });
  } catch (error) {
    console.error('Get timetable config error:', error);
    res.status(500).json({ error: 'Failed to fetch timetable configuration' });
  }
});

// Get time slots (basic)
router.get('/time-slots', authenticateToken, async (req, res) => {
  try {
    // Return basic time slots
    const timeSlots = [
      { id: 1, slot_number: 1, start_time: '09:00:00', end_time: '10:30:00', is_break: false },
      { id: 2, slot_number: 2, start_time: '10:45:00', end_time: '12:15:00', is_break: false },
      { id: 3, slot_number: 3, start_time: '13:15:00', end_time: '14:45:00', is_break: false },
      { id: 4, slot_number: 4, start_time: '15:00:00', end_time: '16:30:00', is_break: false }
    ];

    res.json({
      success: true,
      timeSlots
    });
  } catch (error) {
    console.error('Get time slots error:', error);
    res.status(500).json({ error: 'Failed to fetch time slots' });
  }
});

module.exports = router;
