const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireInstructor } = require('../middleware/auth');

const router = express.Router();

// Get all labs (instructors and admins only)
router.get('/', [authenticateToken, requireInstructor], async (req, res) => {
  try {
    const result = await query(`
      SELECT
        l.*,
        COALESCE(comp_stats.computer_count, 0) as computer_count,
        COALESCE(seat_stats.seat_count, 0) as seat_count,
        COALESCE(comp_stats.functional_computers, 0) as functional_computers,
        COALESCE(comp_stats.maintenance_computers, 0) as maintenance_computers,
        COALESCE(comp_stats.assigned_computers, 0) as assigned_computers
      FROM labs l
      LEFT JOIN (
        SELECT
          lab_id,
          COUNT(*) as computer_count,
          COUNT(CASE WHEN status = 'functional' THEN 1 END) as functional_computers,
          COUNT(CASE WHEN status IN ('in_repair', 'maintenance') THEN 1 END) as maintenance_computers,
          COUNT(CASE
            WHEN status = 'functional' AND EXISTS (
              SELECT 1 FROM schedule_assignments sa
              JOIN schedules sch ON sa.schedule_id = sch.id
              WHERE sa.assigned_computer = c.computer_number
              AND sch.lab_id = c.lab_id
              AND DATE(sch.scheduled_date) = CURRENT_DATE
              AND sch.status IN ('scheduled', 'in_progress')
            ) THEN 1
          END) as assigned_computers
        FROM computers c
        GROUP BY lab_id
      ) comp_stats ON l.id = comp_stats.lab_id
      LEFT JOIN (
        SELECT
          lab_id,
          COUNT(*) as seat_count
        FROM seats
        GROUP BY lab_id
      ) seat_stats ON l.id = seat_stats.lab_id
      WHERE l.is_active = true
      ORDER BY l.name
    `);

    res.json({
      labs: result.rows
    });
  } catch (error) {
    console.error('Get labs error:', error);
    res.status(500).json({ error: 'Failed to fetch labs' });
  }
});

// Get lab by ID with detailed information
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get lab details
    const labResult = await query(
      'SELECT * FROM labs WHERE id = $1 AND is_active = true',
      [id]
    );

    if (labResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lab not found' });
    }

    const lab = labResult.rows[0];

    // Get computers
    const computersResult = await query(`
      SELECT
        id, computer_name, computer_number, specifications, is_functional,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM schedule_assignments sa
            JOIN schedules sch ON sa.schedule_id = sch.id
            WHERE sa.assigned_computer = computers.computer_number
            AND sch.scheduled_date::date = CURRENT_DATE
            AND sch.status IN ('scheduled', 'in_progress')
          ) THEN true
          ELSE false
        END as is_assigned_today
      FROM computers
      WHERE lab_id = $1
      ORDER BY computer_number
    `, [id]);

    // Get seats
    const seatsResult = await query(`
      SELECT
        id, seat_number, is_available,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM schedule_assignments sa
            JOIN schedules sch ON sa.schedule_id = sch.id
            WHERE sa.assigned_seat = seats.seat_number
            AND sch.scheduled_date::date = CURRENT_DATE
            AND sch.status IN ('scheduled', 'in_progress')
          ) THEN true
          ELSE false
        END as is_assigned_today
      FROM seats
      WHERE lab_id = $1
      ORDER BY seat_number
    `, [id]);

    res.json({
      lab: {
        ...lab,
        computers: computersResult.rows,
        seats: seatsResult.rows
      }
    });
  } catch (error) {
    console.error('Get lab details error:', error);
    res.status(500).json({ error: 'Failed to fetch lab details' });
  }
});

// Get lab availability for a specific date and time
router.get('/:id/availability', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, startTime, endTime } = req.query;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ 
        error: 'Date, start time, and end time are required' 
      });
    }

    // Check if lab exists
    const labResult = await query(
      'SELECT * FROM labs WHERE id = $1 AND is_active = true',
      [id]
    );

    if (labResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lab not found' });
    }

    // Get conflicting schedules
    const conflictingSchedules = await query(`
      SELECT
        s.id, s.title, s.scheduled_date, s.duration_minutes,
        COUNT(sa.id) as assigned_computers,
        COUNT(seat_a.id) as assigned_seats
      FROM schedules s
      LEFT JOIN schedule_assignments sa ON s.id = sa.schedule_id
      LEFT JOIN seat_assignments seat_a ON s.id = seat_a.schedule_id
      WHERE s.lab_id = $1
      AND DATE(s.scheduled_date) = $2
      AND s.status IN ('scheduled', 'in_progress')
      GROUP BY s.id
    `, [id, date]);

    // Get total resources
    const resourcesResult = await query(`
      SELECT 
        COUNT(CASE WHEN c.is_functional = true THEN 1 END) as available_computers,
        COUNT(s.id) as available_seats
      FROM labs l
      LEFT JOIN computers c ON l.id = c.lab_id
      LEFT JOIN seats s ON l.id = s.lab_id AND s.is_available = true
      WHERE l.id = $1
      GROUP BY l.id
    `, [id]);

    const resources = resourcesResult.rows[0] || { available_computers: 0, available_seats: 0 };
    
    // Calculate available resources
    const usedComputers = conflictingSchedules.rows.reduce((sum, schedule) => 
      sum + parseInt(schedule.assigned_computers), 0);
    const usedSeats = conflictingSchedules.rows.reduce((sum, schedule) => 
      sum + parseInt(schedule.assigned_seats), 0);

    res.json({
      availability: {
        totalComputers: parseInt(resources.available_computers),
        totalSeats: parseInt(resources.available_seats),
        availableComputers: parseInt(resources.available_computers) - usedComputers,
        availableSeats: parseInt(resources.available_seats) - usedSeats,
        conflictingSchedules: conflictingSchedules.rows
      }
    });
  } catch (error) {
    console.error('Get lab availability error:', error);
    res.status(500).json({ error: 'Failed to check lab availability' });
  }
});

// Create new lab (admin only)
router.post('/', [authenticateToken, requireInstructor], async (req, res) => {
  try {
    const { labName, labCode, totalComputers, totalSeats, description } = req.body;

    if (!labName || !labCode || !totalComputers || !totalSeats) {
      return res.status(400).json({ 
        error: 'Lab name, code, total computers, and total seats are required' 
      });
    }

    // Check if lab name already exists
    const existingLab = await query(
      'SELECT id FROM labs WHERE name = $1',
      [labName]
    );

    if (existingLab.rows.length > 0) {
      return res.status(409).json({ error: 'Lab name already exists' });
    }

    // Create lab
    const result = await query(`
      INSERT INTO labs (name, total_computers, total_seats, location)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [labName, totalComputers, totalSeats, description]);

    const lab = result.rows[0];

    // Create computers
    for (let i = 1; i <= totalComputers; i++) {
      const computerName = `${labCode}-PC-${i.toString().padStart(3, '0')}`;
      await query(`
        INSERT INTO computers (lab_id, computer_name, computer_number, specifications)
        VALUES ($1, $2, $3, $4)
      `, [lab.id, computerName, i, JSON.stringify({
        cpu: 'Intel i5',
        ram: '8GB',
        storage: '256GB SSD',
        os: 'Windows 11'
      })]);
    }

    // Create seats
    for (let i = 1; i <= totalSeats; i++) {
      await query(`
        INSERT INTO seats (lab_id, seat_number)
        VALUES ($1, $2)
      `, [lab.id, i]);
    }

    res.status(201).json({
      message: 'Lab created successfully',
      lab
    });
  } catch (error) {
    console.error('Create lab error:', error);
    res.status(500).json({ error: 'Failed to create lab' });
  }
});

// Update computer status
router.put('/:labId/computers/:computerId', [authenticateToken, requireInstructor], async (req, res) => {
  try {
    const { labId, computerId } = req.params;
    const { isFunctional, specifications } = req.body;

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (typeof isFunctional === 'boolean') {
      updateFields.push(`is_functional = $${paramCount}`);
      values.push(isFunctional);
      paramCount++;
    }

    if (specifications) {
      updateFields.push(`specifications = $${paramCount}`);
      values.push(JSON.stringify(specifications));
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(computerId, labId);

    const result = await query(`
      UPDATE computers 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount} AND lab_id = $${paramCount + 1}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Computer not found' });
    }

    res.json({
      message: 'Computer updated successfully',
      computer: result.rows[0]
    });
  } catch (error) {
    console.error('Update computer error:', error);
    res.status(500).json({ error: 'Failed to update computer' });
  }
});

module.exports = router;
