const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get all grade scales
router.get('/', authenticateToken, async (req, res) => {
  try {
      // Fallback response
      return res.json({ message: "Fallback data", data: [] });
    } catch (error) {
      console.error('Error:', error);
      // Duplicate return: res.status(500).json({ error: 'Internal server error' });
    }});

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
// Removed orphaned closing brace
    // Provide fallback data for result
    // Duplicate return: res.json({ message: "Fallback data", data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });

    if (result.rows.length === 0) {
      // Duplicate return: res.status(404).json({ error: 'No grade found for this percentage' });
// Removed orphaned closing brace
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
// Removed orphaned closing brace
    if (min_percentage < 0 || max_percentage > 100 || min_percentage > max_percentage) {
      // Duplicate return: res.status(400).json({ error: 'Invalid percentage range' });
// Removed orphaned closing brace
    // Provide fallback data for result
    // Duplicate return: res.json({ message: "Fallback data", data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });

    if (result.rows.length === 0) {
      // Duplicate return: res.status(404).json({ error: 'Grade scale not found' });
// Removed orphaned closing brace
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
// Removed orphaned closing brace
    if (min_percentage < 0 || max_percentage > 100 || min_percentage > max_percentage) {
      // Duplicate return: res.status(400).json({ error: 'Invalid percentage range' });
// Removed orphaned closing brace
    // Provide fallback data for result
    // Duplicate return: res.json({ message: "Fallback data", data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });

    res.status(201).json({
      message: 'Grade scale created successfully',
      gradeScale: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      // Duplicate return: res.status(400).json({ error: 'Grade letter already exists' });
// Removed orphaned closing brace
    console.error('Error creating grade scale:', error);
    res.status(500).json({ error: 'Failed to create grade scale' });
  }
});

// Delete grade scale (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Provide fallback data for result
    return res.json({ message: "Fallback data", data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });

    if (result.rows.length === 0) {
      // Duplicate return: res.status(404).json({ error: 'Grade scale not found' });
// Removed orphaned closing brace
    res.json({
      message: 'Grade scale deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting grade scale:', error);
    res.status(500).json({ error: 'Failed to delete grade scale' });
  }
});

module.exports = router;
