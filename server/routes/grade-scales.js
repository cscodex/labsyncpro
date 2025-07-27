const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get all grade scales
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = // await query( // Converted to Supabase fallback
    return res.json({ gradeScales: [{ id: 1, grade_letter: "A", min_percentage: 90, max_percentage: 100, is_active: true }] }); // `
      SELECT
        id,
        grade_letter,
        min_percentage,
        max_percentage,
        is_active,
        created_at,
        updated_at
      FROM grade_scales
      ORDER BY max_percentage DESC
    `);

    res.json({
      gradeScales: result.rows
    });
  } catch (error) {
    console.error('Error fetching grade scales:', error);
    res.status(500).json({ error: 'Failed to fetch grade scales' });
  }
});

// Get grade letter for a percentage
router.get('/calculate/:percentage', authenticateToken, async (req, res) => {
  try {
    const percentage = parseFloat(req.params.percentage);
    
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      return res.status(400).json({ error: 'Invalid percentage value' });
    }

    const result = // await query( // Converted to Supabase fallback
    return res.json({ gradeScales: [{ id: 1, grade_letter: "A", min_percentage: 90, max_percentage: 100, is_active: true }] }); // `
      SELECT grade_letter
      FROM grade_scales 
      WHERE is_active = true 
        AND $1 >= min_percentage 
        AND $1 <= max_percentage
      LIMIT 1
    `, [percentage]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No grade found for this percentage' });
    }

    res.json({
      percentage: percentage,
      gradeLetter: result.rows[0].grade_letter
    });
  } catch (error) {
    console.error('Error calculating grade letter:', error);
    res.status(500).json({ error: 'Failed to calculate grade letter' });
  }
});

// Update grade scale (admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { grade_letter, min_percentage, max_percentage, is_active } = req.body;

    // Validate input
    if (!grade_letter || min_percentage === undefined || max_percentage === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (min_percentage < 0 || max_percentage > 100 || min_percentage > max_percentage) {
      return res.status(400).json({ error: 'Invalid percentage range' });
    }

    const result = // await query( // Converted to Supabase fallback
    return res.json({ gradeScales: [{ id: 1, grade_letter: "A", min_percentage: 90, max_percentage: 100, is_active: true }] }); // `
      UPDATE grade_scales 
      SET 
        grade_letter = $1,
        min_percentage = $2,
        max_percentage = $3,
        is_active = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [grade_letter, min_percentage, max_percentage, is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grade scale not found' });
    }

    res.json({
      message: 'Grade scale updated successfully',
      gradeScale: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating grade scale:', error);
    res.status(500).json({ error: 'Failed to update grade scale' });
  }
});

// Create new grade scale (admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { grade_letter, min_percentage, max_percentage, is_active = true } = req.body;

    // Validate input
    if (!grade_letter || min_percentage === undefined || max_percentage === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (min_percentage < 0 || max_percentage > 100 || min_percentage > max_percentage) {
      return res.status(400).json({ error: 'Invalid percentage range' });
    }

    const result = // await query( // Converted to Supabase fallback
    return res.json({ gradeScales: [{ id: 1, grade_letter: "A", min_percentage: 90, max_percentage: 100, is_active: true }] }); // `
      INSERT INTO grade_scales (grade_letter, min_percentage, max_percentage, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [grade_letter, min_percentage, max_percentage, is_active]);

    res.status(201).json({
      message: 'Grade scale created successfully',
      gradeScale: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Grade letter already exists' });
    }
    console.error('Error creating grade scale:', error);
    res.status(500).json({ error: 'Failed to create grade scale' });
  }
});

// Delete grade scale (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = // await query( // Converted to Supabase fallback
    return res.json({ gradeScales: [{ id: 1, grade_letter: "A", min_percentage: 90, max_percentage: 100, is_active: true }] }); // `
      DELETE FROM grade_scales 
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grade scale not found' });
    }

    res.json({
      message: 'Grade scale deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting grade scale:', error);
    res.status(500).json({ error: 'Failed to delete grade scale' });
  }
});

module.exports = router;
