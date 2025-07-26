const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireInstructor, requireAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get all classes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { grade, stream, labId } = req.query;

    let query = supabase.from('classes').select('*');

    if (grade) {
      query = query.eq('grade', parseInt(grade));
    }

    if (stream) {
      query = query.eq('stream', stream);
    }

    const { data: classes, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Get classes error:', error);
      return res.status(500).json({ error: 'Failed to fetch classes' });
    }

    res.json({ 
      message: 'Classes retrieved successfully',
      classes: classes || [] 
    });
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// Get class by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: classData, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Class not found' });
      }
      console.error('Get class error:', error);
      return res.status(500).json({ error: 'Failed to fetch class' });
    }

    res.json({
      message: 'Class retrieved successfully',
      class: classData
    });
  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

// Create class (admin/instructor only)
router.post('/', [
  authenticateToken,
  requireInstructor,
  body('name').trim().isLength({ min: 1 }),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, grade, stream, section } = req.body;

    // Check if class with same name already exists
    const { data: existingClass } = await supabase
      .from('classes')
      .select('id')
      .eq('name', name)
      .single();

    if (existingClass) {
      return res.status(400).json({ error: 'Class with this name already exists' });
    }

    const { data: newClass, error } = await supabase
      .from('classes')
      .insert({
        id: uuidv4(),
        name,
        description: description || null,
        grade: grade || null,
        stream: stream || null,
        section: section || null
      })
      .select()
      .single();

    if (error) {
      console.error('Create class error:', error);
      return res.status(500).json({ error: 'Failed to create class' });
    }

    res.status(201).json({
      message: 'Class created successfully',
      class: newClass
    });
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// Update class
router.put('/:id', [
  authenticateToken,
  requireInstructor,
  body('name').optional().trim().isLength({ min: 1 }),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description, grade, stream, section } = req.body;

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (grade !== undefined) updateData.grade = grade;
    if (stream !== undefined) updateData.stream = stream;
    if (section !== undefined) updateData.section = section;

    // Check if there are any fields to update
    if (Object.keys(updateData).length === 1) { // Only updated_at
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const { data: updatedClass, error } = await supabase
      .from('classes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Class not found' });
      }
      console.error('Update class error:', error);
      return res.status(500).json({ error: 'Failed to update class' });
    }

    res.json({
      message: 'Class updated successfully',
      class: updatedClass
    });
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

// Delete class (admin only)
router.delete('/:id', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const { id } = req.params;

    // Check if class has any groups or schedules
    const { data: groups } = await supabase
      .from('groups')
      .select('id')
      .eq('class_id', id)
      .limit(1);

    if (groups && groups.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete class with existing groups. Please remove all groups first.' 
      });
    }

    const { data: schedules } = await supabase
      .from('schedules')
      .select('id')
      .eq('class_id', id)
      .limit(1);

    if (schedules && schedules.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete class with existing schedules. Please remove all schedules first.' 
      });
    }

    const { data: deletedClass, error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Class not found' });
      }
      console.error('Delete class error:', error);
      return res.status(500).json({ error: 'Failed to delete class' });
    }

    res.json({
      message: 'Class deleted successfully',
      class: deletedClass
    });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

// Get class statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get class info
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', id)
      .single();

    if (classError) {
      if (classError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Class not found' });
      }
      throw classError;
    }

    // Get groups count
    const { count: groupsCount } = await supabase
      .from('groups')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', id);

    // Get students count (through groups)
    const { data: groupMembers } = await supabase
      .from('group_members')
      .select('user_id, groups!inner(class_id)')
      .eq('groups.class_id', id);

    const uniqueStudents = new Set(groupMembers?.map(gm => gm.user_id) || []);

    // Get schedules count
    const { count: schedulesCount } = await supabase
      .from('schedules')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', id);

    res.json({
      message: 'Class statistics retrieved successfully',
      class: classData,
      stats: {
        totalGroups: groupsCount || 0,
        totalStudents: uniqueStudents.size,
        totalSchedules: schedulesCount || 0
      }
    });
  } catch (error) {
    console.error('Get class stats error:', error);
    res.status(500).json({ error: 'Failed to fetch class statistics' });
  }
});

module.exports = router;
