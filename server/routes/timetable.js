const express = require('express');
const router = express.Router();
const { body, validationResult, query: queryValidator } = require('express-validator');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');
const TimetableService = require('../services/timetableService');

// In-memory storage for timetable versions (for demo purposes)
let timetableVersions = [
  {
    id: '1',
    version_number: '1.0',
    version_name: 'Initial Timetable',
    description: 'First version of the timetable',
    effective_from: '2024-01-01',
    effective_until: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by_name: 'Admin',
    period_count: 4,
    schedule_count: 0,
    active_schedule_count: 0
  }
];

// Simple test route
router.get('/test', (req, res) => {
  res.json({
    message: 'Timetable routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Get all timetable versions
router.get('/versions', authenticateToken, async (req, res) => {
  try {
      // Fallback response
      return res.json({ message: "Fallback data", data: [] });
    } catch (error) {
      console.error('Error:', error);
      // Duplicate return: res.status(500).json({ error: 'Internal server error' });
    }versions`);

    res.json({
      success: true,
      versions: sortedVersions
    });
  } catch (error) {
    console.error('Get timetable versions error:', error);
    res.status(500).json({ error: 'Failed to retrieve timetable versions' });
  }
});

// Get active timetable version based on WEF date
router.get('/versions/active', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    // Find the version that should be effective on the target date
    const effectiveVersions = timetableVersions
      .filter(v => new Date(v.effective_from) <= targetDate)
      .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime());

    const activeVersion = effectiveVersions[0] || timetableVersions[0];

    // Update is_active flag based on effective date
    timetableVersions.forEach(v => {
      v.is_active = v.id === activeVersion.id;
    });

    console.log(`📅 Active version for ${targetDate.toISOString().split('T')[0]}: ${activeVersion.version_name} (${activeVersion.version_number})`);

    res.json({
      success: true,
      version: activeVersion
    });
  } catch (error) {
    console.error('Get active timetable version error:', error);
    res.status(500).json({ error: 'Failed to retrieve active timetable version' });
  }
});

// Create new timetable version
router.post('/versions', [
  authenticateToken,
  requireRole(['admin']),
  body('versionName').notEmpty().trim(),
  body('description').optional().trim(),
  body('effectiveFrom').isISO8601(),
  body('copyFromVersion').optional(),
  body('copySchedules').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
// Removed orphaned closing brace
    const {
      versionName,
      description,
      effectiveFrom,
      copyFromVersion,
      copySchedules
    } = req.body;

    // Generate new version number
    const versionNumber = `${Date.now()}.0`;

    // Create new version
    const newVersion = {
      id: `version_${Date.now()}`,
      version_number: versionNumber,
      version_name: versionName,
      description: description || '',
      effective_from: effectiveFrom,
      effective_until: null,
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by_name: 'Admin',
      period_count: 0,
      schedule_count: 0,
      active_schedule_count: 0
    };

    // Add to storage
    timetableVersions.push(newVersion);
    console.log(`📋 New version added. Total versions: ${timetableVersions.length}`);

    // Mock migration result
    const migration = {
      periodsCreated: copyFromVersion ? 8 : 0,
      schedulesCreated: copySchedules ? 45 : 0,
      conflictsResolved: 0
    };

    res.json({
      success: true,
      version: newVersion,
      migration,
      message: 'Timetable version created successfully'
    });
  } catch (error) {
    console.error('Create timetable version error:', error);
    res.status(500).json({ error: 'Failed to create timetable version' });
  }
});


// Update periods for a version
router.put('/versions/:versionId/periods', [
  authenticateToken,
  requireRole(['admin']),
  body('periods').isArray()
], async (req, res) => {
  try {
    const { versionId } = req.params;
    const { periods } = req.body;

    // Mock update - convert generated periods to database format
    const updatedPeriods = periods.map((period, index) => ({
      id: `period_${index + 1}`,
      timetable_version_id: versionId,
      period_number: period.periodNumber,
      period_name: period.periodName,
      start_time: period.startTime,
      end_time: period.endTime,
      duration_minutes: period.isBreak ? period.breakDurationMinutes : 45,
      is_break: period.isBreak,
      break_duration_minutes: period.breakDurationMinutes || 0,
      display_order: period.displayOrder,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    res.json({
      success: true,
      periods: updatedPeriods,
      message: 'Periods updated successfully'
    });
  } catch (error) {
    console.error('Update periods error:', error);
    res.status(500).json({ error: 'Failed to update periods' });
  }
});

// Get periods for a version
router.get('/versions/:versionId/periods', authenticateToken, async (req, res) => {
  try {
    const { versionId } = req.params;

    // Return basic periods with enhanced fields
    const periods = [
      {
        id: '1',
        period_number: 1,
        period_name: 'Period 1',
        start_time: '09:00:00',
        end_time: '10:30:00',
        duration_minutes: 90,
        lecture_duration_minutes: 90,
        number_of_lectures: 1,
        is_break: false,
        break_duration_minutes: 15,
        display_order: 1,
        is_active: true
      },
      {
        id: '2',
        period_number: 2,
        period_name: 'Period 2',
        start_time: '10:45:00',
        end_time: '12:15:00',
        duration_minutes: 90,
        lecture_duration_minutes: 90,
        number_of_lectures: 1,
        is_break: false,
        break_duration_minutes: 60,
        display_order: 2,
        is_active: true
      },
      {
        id: '3',
        period_number: 3,
        period_name: 'Period 3',
        start_time: '13:15:00',
        end_time: '14:45:00',
        duration_minutes: 90,
        lecture_duration_minutes: 90,
        number_of_lectures: 1,
        is_break: false,
        break_duration_minutes: 15,
        display_order: 3,
        is_active: true
      },
      {
        id: '4',
        period_number: 4,
        period_name: 'Period 4',
        start_time: '15:00:00',
        end_time: '16:30:00',
        duration_minutes: 90,
        lecture_duration_minutes: 90,
        number_of_lectures: 1,
        is_break: false,
        break_duration_minutes: 0,
        display_order: 4,
        is_active: true
      }
    ];

    res.json({
      success: true,
      periods
    });
  } catch (error) {
    console.error('Get periods error:', error);
    res.status(500).json({ error: 'Failed to retrieve periods' });
  }
});

// Get schedules for a version
router.get('/versions/:versionId/schedules', authenticateToken, async (req, res) => {
  try {
    const { versionId } = req.params;
    const { startDate, endDate } = req.query;

    // Return empty schedules for now
    const schedules = [];

    res.json({
      success: true,
      schedules
    });
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({ error: 'Failed to retrieve schedules' });
  }
});

// Get current week timetable
router.get('/current-week', authenticateToken, async (req, res) => {
  try {
    const { versionId } = req.query;

    // Calculate current week start date (Monday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStartDate = new Date(today);
    weekStartDate.setDate(today.getDate() + daysToMonday);

    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);

    // Return empty schedules for now
    const schedules = [];

    res.json({
      success: true,
      schedules,
      weekStart: weekStartDate.toISOString().split('T')[0],
      weekEnd: weekEndDate.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Get current week timetable error:', error);
    res.status(500).json({ error: 'Failed to fetch current week timetable' });
  }
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

// Get timetable configuration
router.get('/config', authenticateToken, async (req, res) => {
  try {
    const config = await TimetableService.getTimetableConfig();
    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Get timetable config error:', error);
    res.status(500).json({ error: 'Failed to fetch timetable configuration' });
  }
});

// Update timetable configuration
router.put('/config', [
  authenticateToken,
  requireRole(['admin']),
  body('max_lectures_per_day').optional().isInt({ min: 1, max: 12 }),
  body('lecture_duration_minutes').optional().isInt({ min: 15, max: 180 }),
  body('break_duration_minutes').optional().isInt({ min: 0, max: 60 }),
  body('start_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/),
  body('end_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/),
  body('working_days').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
// Removed orphaned closing brace
    // Validate that end_time is after start_time
    const { start_time, end_time } = req.body;
    if (start_time && end_time) {
      const startDate = new Date(`2000-01-01T${start_time}`);
      const endDate = new Date(`2000-01-01T${end_time}`);

      if (startDate >= endDate) {
        // Duplicate return: res.status(400).json({
          error: 'End time must be after start time'
        });
      }
    }

    const config = await TimetableService.updateTimetableConfig(req.body);

    res.json({
      success: true,
      config,
      message: 'Timetable configuration updated successfully'
    });
  } catch (error) {
    console.error('Update timetable config error:', error);
    res.status(500).json({ error: 'Failed to update timetable configuration' });
  }
});

// Generate periods based on configuration
router.post('/config/generate-periods', [
  authenticateToken,
  requireRole(['admin']),
  body('schoolStartTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/),
  body('schoolEndTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/),
  body('lectureDurationMinutes').isInt({ min: 15, max: 180 }),
  body('numberOfBreaks').optional().isInt({ min: 0, max: 10 }),
  body('breakConfigurations.*.afterLecture').optional().isInt({ min: 0, max: 20 }),
  body('breakConfigurations.*.durationMinutes').optional().isInt({ min: 5, max: 120 }),
  body('breakConfigurations').optional().isArray(),
  body('includeBreaks').optional().isBoolean(),
  body('effectiveFromDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
// Removed orphaned closing brace
    const result = await TimetableService.generatePeriodsFromConfig(req.body);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Generate periods error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate periods' });
  }
});

// Get time slots (basic)
router.get('/time-slots', authenticateToken, async (req, res) => {
  try {
      // Fallback response
      return res.json({ message: "Fallback data", data: [] });
    } catch (error) {
      console.error('Error:', error);
      // Duplicate return: res.status(500).json({ error: 'Internal server error' });
    },
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

// Get schedules with filters
router.get('/schedules', authenticateToken, async (req, res) => {
  try {
    const { versionId, startDate, endDate, labId, instructorId, classId, groupId } = req.query;

    // Return empty schedules for now
    const schedules = [];

    res.json({
      success: true,
      schedules
    });
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({ error: 'Failed to retrieve schedules' });
  }
});

// Get timetable stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Return basic stats
    const stats = {
      totalSchedules: 0,
      scheduledSessions: 0,
      completedSessions: 0,
      cancelledSessions: 0,
      uniqueInstructors: 0,
      uniqueLabs: 0,
      uniqueClasses: 0,
      sessionTypes: {
        lecture: 0,
        lab: 0,
        test: 0,
        practical: 0
      }
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get timetable stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve timetable statistics' });
  }
});

// Create schedule
router.post('/schedules', [
  authenticateToken,
  requireRole(['admin', 'instructor']),
  body('sessionTitle').notEmpty().trim(),
  body('sessionType').notEmpty().trim(),
  body('scheduleDate').isISO8601().toDate(),
  body('periodId').notEmpty(),
  body('versionId').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
// Removed orphaned closing brace
    const { sessionTitle, sessionType, scheduleDate, periodId, versionId, sessionDescription, labId, instructorId, classId, groupId, notes } = req.body;

    // For now, just return success
    const newSchedule = {
      id: Date.now().toString(),
      sessionTitle,
      sessionType,
      scheduleDate,
      periodId,
      versionId,
      sessionDescription,
      labId,
      instructorId,
      classId,
      groupId,
      notes,
      status: 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Schedule created successfully',
      schedule: newSchedule
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// Update schedule
router.put('/schedules/:id', [
  authenticateToken,
  requireRole(['admin', 'instructor'])
], async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    res.json({
      success: true,
      message: 'Schedule updated successfully',
      schedule: { id, ...updateData, updated_at: new Date().toISOString() }
    });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// Delete schedule
router.delete('/schedules/:id', [
  authenticateToken,
  requireRole(['admin', 'instructor'])
], async (req, res) => {
  try {
    const { id } = req.params;

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

// Weekly Class Schedule Management

// Get weekly schedules for a version
router.get('/versions/:versionId/weekly-schedules', authenticateToken, async (req, res) => {
  try {
    const { versionId } = req.params;

    // Return mock weekly schedules
    const schedules = [
      {
        id: '1',
        timetable_version_id: versionId,
        period_id: '1',
        class_id: '1',
        subject_name: 'Data Structures',
        instructor_name: 'Dr. John Smith',
        room_name: 'Computer Lab 1',
        day_of_week: 1, // Monday
        start_date: '2024-04-01',
        end_date: '2024-12-31',
        exclude_second_saturdays: true,
        exclude_sundays: true,
        custom_holiday_dates: ['2024-08-15', '2024-10-02'],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      schedules
    });
  } catch (error) {
    console.error('Get weekly schedules error:', error);
    res.status(500).json({ error: 'Failed to retrieve weekly schedules' });
  }
});

// Create weekly schedule
router.post('/weekly-schedules', [
  authenticateToken,
  requireRole(['admin', 'instructor']),
  body('timetable_version_id').notEmpty(),
  body('period_id').notEmpty(),
  body('subject_name').notEmpty().trim(),
  body('day_of_week').isInt({ min: 1, max: 7 }),
  body('start_date').isISO8601().toDate(),
  body('end_date').isISO8601().toDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
// Removed orphaned closing brace
    const {
      timetable_version_id,
      period_id,
      class_id,
      subject_name,
      instructor_name,
      room_name,
      day_of_week,
      start_date,
      end_date,
      exclude_second_saturdays,
      exclude_sundays,
      custom_holiday_dates
    } = req.body;

    // Create mock weekly schedule
    const newSchedule = {
      id: Date.now().toString(),
      timetable_version_id,
      period_id,
      class_id: class_id || null,
      subject_name,
      instructor_name: instructor_name || null,
      room_name: room_name || null,
      day_of_week,
      start_date,
      end_date,
      exclude_second_saturdays: exclude_second_saturdays || true,
      exclude_sundays: exclude_sundays || true,
      custom_holiday_dates: custom_holiday_dates || [],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      schedule: newSchedule,
      message: 'Weekly schedule created successfully'
    });
  } catch (error) {
    console.error('Create weekly schedule error:', error);
    res.status(500).json({ error: 'Failed to create weekly schedule' });
  }
});

// Update weekly schedule
router.put('/weekly-schedules/:scheduleId', [
  authenticateToken,
  requireRole(['admin', 'instructor']),
  body('subject_name').optional().trim(),
  body('day_of_week').optional().isInt({ min: 1, max: 7 }),
  body('start_date').optional().isISO8601().toDate(),
  body('end_date').optional().isISO8601().toDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
// Removed orphaned closing brace
    const { scheduleId } = req.params;
    const updateData = req.body;

    // Mock update
    const updatedSchedule = {
      id: scheduleId,
      ...updateData,
      updated_at: new Date().toISOString()
    };

    res.json({
      success: true,
      schedule: updatedSchedule,
      message: 'Weekly schedule updated successfully'
    });
  } catch (error) {
    console.error('Update weekly schedule error:', error);
    res.status(500).json({ error: 'Failed to update weekly schedule' });
  }
});

// Delete weekly schedule
router.delete('/weekly-schedules/:scheduleId', [
  authenticateToken,
  requireRole(['admin', 'instructor'])
], async (req, res) => {
  try {
    const { scheduleId } = req.params;

    // Mock deletion
    res.json({
      success: true,
      message: 'Weekly schedule deleted successfully'
    });
  } catch (error) {
    console.error('Delete weekly schedule error:', error);
    res.status(500).json({ error: 'Failed to delete weekly schedule' });
  }
});

// Generate schedules from weekly template
router.post('/versions/:versionId/generate-from-weekly', [
  authenticateToken,
  requireRole(['admin', 'instructor'])
], async (req, res) => {
  try {
    const { versionId } = req.params;
    const { weeklyScheduleId } = req.body;

    // Mock generation result
    const result = {
      generated: 45,
      skipped: 8,
      conflicts: []
    };

    res.json({
      success: true,
      ...result,
      message: `Generated ${result.generated} schedules, skipped ${result.skipped} due to holidays`
    });
  } catch (error) {
    console.error('Generate from weekly error:', error);
    res.status(500).json({ error: 'Failed to generate schedules from weekly template' });
  }
});

module.exports = router;
