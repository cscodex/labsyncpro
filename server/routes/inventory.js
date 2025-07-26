const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { supabase } = require('../config/supabase');
const { getRecords } = require('../utils/supabaseHelpers');
const { authenticateToken, requireInstructor } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Get computer inventory for all labs
router.get('/computers', authenticateToken, async (req, res) => {
  try {
    const { labId, status, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let inventoryQuery = `
      SELECT
        c.id,
        c.computer_name,
        c.computer_number,
        c.specifications,
        c.is_functional,
        c.status,
        c.condition_notes,
        c.last_maintenance_date,
        c.next_maintenance_date,
        c.purchase_date,
        c.warranty_expiry,
        c.created_at,
        c.updated_at,
        l.name as lab_name,
        l.location as lab_location,
        -- Current assignment status
        CASE
          WHEN EXISTS (
            SELECT 1 FROM schedule_assignments sa
            JOIN schedules sch ON sa.schedule_id = sch.id
            WHERE sa.assigned_computer = c.computer_number
            AND sch.lab_id = c.lab_id
            AND DATE(sch.scheduled_date) = CURRENT_DATE
            AND sch.status IN ('scheduled', 'in_progress')
          ) THEN 'assigned'
          ELSE c.status
        END as current_status,
        -- Current assignment details
        sa.id as assignment_id,
        sch.title as current_schedule,
        sch.scheduled_date,
        sch.duration_minutes,
        COALESCE(g.name, CONCAT(u.first_name, ' ', u.last_name)) as assigned_to
      FROM computers c
      JOIN labs l ON c.lab_id = l.id
      LEFT JOIN schedule_assignments sa ON sa.assigned_computer = c.computer_number
        AND EXISTS (
          SELECT 1 FROM schedules sch2
          WHERE sch2.id = sa.schedule_id
          AND sch2.lab_id = c.lab_id
          AND DATE(sch2.scheduled_date) = CURRENT_DATE
          AND sch2.status IN ('scheduled', 'in_progress')
        )
      LEFT JOIN schedules sch ON sa.schedule_id = sch.id
      LEFT JOIN groups g ON sa.group_id = g.id
      LEFT JOIN users u ON sa.user_id = u.id
      WHERE l.is_active = true
    `;

    const queryParams = [];
    let paramCount = 1;

    // Filter by lab
    if (labId) {
      inventoryQuery += ` AND c.lab_id = $${paramCount}`;
      queryParams.push(labId);
      paramCount++;
    }

    // Filter by status
    if (status) {
      if (status === 'available') {
        inventoryQuery += ` AND c.status = 'functional' AND sa.id IS NULL`;
      } else if (status === 'assigned') {
        inventoryQuery += ` AND sa.id IS NOT NULL`;
      } else if (status === 'functional') {
        inventoryQuery += ` AND c.status = 'functional'`;
      } else if (status === 'in_repair') {
        inventoryQuery += ` AND c.status = 'in_repair'`;
      } else if (status === 'maintenance') {
        inventoryQuery += ` AND c.status = 'maintenance'`;
      } else if (status === 'retired') {
        inventoryQuery += ` AND c.status = 'retired'`;
      } else if (status === 'offline') {
        inventoryQuery += ` AND c.status = 'offline'`;
      }
    }

    // Search functionality
    if (search) {
      inventoryQuery += ` AND (
        c.computer_name ILIKE $${paramCount} OR
        l.name ILIKE $${paramCount}
      )`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    inventoryQuery += ` ORDER BY l.name, c.computer_number LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await query(inventoryQuery, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM computers c
      JOIN labs l ON c.lab_id = l.id
      LEFT JOIN schedule_assignments sa ON sa.assigned_computer = c.computer_number
        AND EXISTS (
          SELECT 1 FROM schedules sch
          WHERE sch.id = sa.schedule_id
          AND sch.lab_id = c.lab_id
          AND DATE(sch.scheduled_date) = CURRENT_DATE
          AND sch.status IN ('scheduled', 'in_progress')
        )
      WHERE 1=1
    `;

    // Apply same filters for count
    let countParams = [];
    let countParamCount = 1;

    if (labId) {
      countQuery += ` AND c.lab_id = $${countParamCount}`;
      countParams.push(labId);
      countParamCount++;
    }

    if (status) {
      if (status === 'available') {
        countQuery += ` AND c.status = 'functional' AND sa.id IS NULL`;
      } else if (status === 'assigned') {
        countQuery += ` AND sa.id IS NOT NULL`;
      } else if (['functional', 'in_repair', 'maintenance', 'retired', 'offline'].includes(status)) {
        countQuery += ` AND c.status = $${countParamCount}`;
        countParams.push(status);
        countParamCount++;
      }
    }

    if (search) {
      countQuery += ` AND (c.computer_name ILIKE $${countParamCount} OR l.name ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await query(countQuery, countParams);

    res.json({
      computers: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get computer inventory error:', error);
    // Return empty data instead of 500 error for better UX
    res.json({
      computers: [],
      pagination: {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        total: 0,
        pages: 0
      },
      message: 'No computer inventory available at the moment'
    });
  }
});

// Get computer inventory summary by lab
router.get('/computers/summary', authenticateToken, async (req, res) => {
  try {
    const summaryQuery = `
      SELECT
        l.id as lab_id,
        l.name as lab_name,
        l.location,
        COUNT(c.id) as total_computers,
        COUNT(CASE WHEN c.is_functional = true THEN 1 END) as functional_computers,
        COUNT(CASE WHEN c.is_functional = false THEN 1 END) as maintenance_computers,
        COUNT(CASE
          WHEN c.is_functional = true AND EXISTS (
            SELECT 1 FROM schedule_assignments sa
            JOIN schedules sch ON sa.schedule_id = sch.id
            WHERE sa.assigned_computer = c.computer_number
            AND sch.lab_id = c.lab_id
            AND DATE(sch.scheduled_date) = CURRENT_DATE
            AND sch.status IN ('scheduled', 'in_progress')
          ) THEN 1
        END) as assigned_computers,
        COUNT(CASE
          WHEN c.is_functional = true AND NOT EXISTS (
            SELECT 1 FROM schedule_assignments sa
            JOIN schedules sch ON sa.schedule_id = sch.id
            WHERE sa.assigned_computer = c.computer_number
            AND sch.lab_id = c.lab_id
            AND DATE(sch.scheduled_date) = CURRENT_DATE
            AND sch.status IN ('scheduled', 'in_progress')
          ) THEN 1
        END) as available_computers
      FROM labs l
      LEFT JOIN computers c ON l.id = c.lab_id
      WHERE l.is_active = true
      GROUP BY l.id, l.name, l.location
      ORDER BY l.name
    `;

    const result = await query(summaryQuery);

    res.json({
      labs: result.rows
    });
  } catch (error) {
    console.error('Get inventory summary error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory summary' });
  }
});

// Update computer status (maintenance/functional)
router.put('/computers/:computerId/status', [
  authenticateToken, 
  requireInstructor,
  body('is_functional').isBoolean(),
  body('maintenance_notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { computerId } = req.params;
    const { is_functional, maintenance_notes } = req.body;

    // Update computer status
    const result = await query(`
      UPDATE computers 
      SET 
        is_functional = $1,
        specifications = CASE 
          WHEN $2 IS NOT NULL THEN 
            COALESCE(specifications, '{}'::jsonb) || jsonb_build_object('maintenance_notes', $2)
          ELSE specifications
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [is_functional, maintenance_notes, computerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Computer not found' });
    }

    res.json({
      message: 'Computer status updated successfully',
      computer: result.rows[0]
    });
  } catch (error) {
    console.error('Update computer status error:', error);
    res.status(500).json({ error: 'Failed to update computer status' });
  }
});

// Update computer specifications
router.put('/computers/:computerId/specifications', [
  authenticateToken, 
  requireInstructor,
  body('specifications').isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { computerId } = req.params;
    const { specifications } = req.body;

    const result = await query(`
      UPDATE computers 
      SET 
        specifications = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [JSON.stringify(specifications), computerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Computer not found' });
    }

    res.json({
      message: 'Computer specifications updated successfully',
      computer: result.rows[0]
    });
  } catch (error) {
    console.error('Update computer specifications error:', error);
    res.status(500).json({ error: 'Failed to update computer specifications' });
  }
});

// Get computer assignment history
router.get('/computers/:computerId/history', authenticateToken, async (req, res) => {
  try {
    const { computerId } = req.params;
    const { limit = 20 } = req.query;

    const historyQuery = `
      SELECT 
        sa.id,
        sa.created_at as assigned_at,
        sch.title as schedule_title,
        sch.scheduled_date,
        sch.scheduled_date as start_time,
        (sch.scheduled_date + INTERVAL '1 minute' * sch.duration_minutes) as end_time,
        sch.status as schedule_status,
        COALESCE(g.name, CONCAT(u.first_name, ' ', u.last_name)) as assigned_to,
        CASE WHEN g.id IS NOT NULL THEN 'group' ELSE 'individual' END as assignment_type,
        CONCAT(instructor.first_name, ' ', instructor.last_name) as instructor_name
      FROM schedule_assignments sa
      JOIN schedules sch ON sa.schedule_id = sch.id
      JOIN computers c ON sa.assigned_computer = c.computer_number AND sch.lab_id = c.lab_id
      LEFT JOIN groups g ON sa.group_id = g.id
      LEFT JOIN users u ON sa.user_id = u.id
      JOIN users instructor ON sch.instructor_id = instructor.id
      WHERE c.id = $1
      ORDER BY sa.created_at DESC
      LIMIT $2
    `;

    const result = await query(historyQuery, [computerId, limit]);

    res.json({
      history: result.rows
    });
  } catch (error) {
    console.error('Get computer history error:', error);
    res.status(500).json({ error: 'Failed to fetch computer history' });
  }
});

// Get computer details by ID
router.get('/computers/:computerId', authenticateToken, async (req, res) => {
  try {
    const { computerId } = req.params;

    const computerQuery = `
      SELECT
        c.*,
        l.name as lab_name,
        l.location as lab_location,
        -- Current assignment details
        sa.id as assignment_id,
        sch.title as current_schedule,
        sch.scheduled_date,
        sch.duration_minutes,
        CONCAT(u.first_name, ' ', u.last_name) as assigned_to,
        g.name as assigned_group
      FROM computers c
      JOIN labs l ON c.lab_id = l.id
      LEFT JOIN schedule_assignments sa ON sa.assigned_computer = c.computer_number
        AND EXISTS (
          SELECT 1 FROM schedules sch2
          WHERE sch2.id = sa.schedule_id
          AND sch2.lab_id = c.lab_id
          AND DATE(sch2.scheduled_date) = CURRENT_DATE
          AND sch2.status IN ('scheduled', 'in_progress')
        )
      LEFT JOIN schedules sch ON sch.id = sa.schedule_id
      LEFT JOIN users u ON u.id = sa.user_id
      LEFT JOIN groups g ON g.id = sa.group_id
      WHERE c.id = $1
    `;

    const result = await query(computerQuery, [computerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Computer not found' });
    }

    // Get maintenance history
    const maintenanceQuery = `
      SELECT
        ml.*,
        CONCAT(u.first_name, ' ', u.last_name) as performed_by_name
      FROM computer_maintenance_logs ml
      LEFT JOIN users u ON u.id = ml.performed_by
      WHERE ml.computer_id = $1
      ORDER BY ml.performed_at DESC
      LIMIT 10
    `;

    const maintenanceResult = await query(maintenanceQuery, [computerId]);

    res.json({
      computer: result.rows[0],
      maintenanceHistory: maintenanceResult.rows
    });

  } catch (error) {
    console.error('Get computer details error:', error);
    res.status(500).json({ error: 'Failed to fetch computer details' });
  }
});

// Update computer status and details
router.put('/computers/:computerId', [
  authenticateToken,
  requireInstructor,
  body('status').optional().isIn(['functional', 'in_repair', 'maintenance', 'retired', 'offline']),
  body('condition_notes').optional().isString(),
  body('last_maintenance_date').optional().isISO8601(),
  body('next_maintenance_date').optional().isISO8601(),
  body('specifications').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { computerId } = req.params;
    const {
      status,
      condition_notes,
      last_maintenance_date,
      next_maintenance_date,
      specifications
    } = req.body;

    // Get current computer data
    const currentResult = await query('SELECT * FROM computers WHERE id = $1', [computerId]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Computer not found' });
    }

    const currentComputer = currentResult.rows[0];

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (condition_notes !== undefined) {
      updates.push(`condition_notes = $${paramCount}`);
      values.push(condition_notes);
      paramCount++;
    }

    if (last_maintenance_date !== undefined) {
      updates.push(`last_maintenance_date = $${paramCount}`);
      values.push(last_maintenance_date);
      paramCount++;
    }

    if (next_maintenance_date !== undefined) {
      updates.push(`next_maintenance_date = $${paramCount}`);
      values.push(next_maintenance_date);
      paramCount++;
    }

    if (specifications !== undefined) {
      updates.push(`specifications = $${paramCount}`);
      values.push(JSON.stringify(specifications));
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(computerId);

    const updateQuery = `
      UPDATE computers
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    // Log the change if status changed
    if (status && status !== currentComputer.status) {
      await query(`
        INSERT INTO computer_maintenance_logs (
          computer_id, maintenance_type, description, performed_by,
          before_status, after_status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        computerId,
        'inspection',
        `Status changed from ${currentComputer.status} to ${status}`,
        req.user.id,
        currentComputer.status,
        status,
        condition_notes || null
      ]);
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
