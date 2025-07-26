const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const FileUploadService = require('../services/fileUploadService');

// No file upload needed for text-based assignments

// Get all created assignments
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;

    let whereClause = '';
    let queryParams = [];

    if (status) {
      whereClause = 'WHERE ca.status = $1';
      queryParams.push(status);
    }

    let query = supabase
      .from('created_assignments')
      .select(`
        id,
        name,
        description,
        pdf_filename,
        pdf_file_size,
        creation_date,
        status,
        created_at,
        updated_at,
        created_by,
        users!created_assignments_created_by_fkey (
          id,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: assignments, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to fetch created assignments' });
    }

    // Map the data to match frontend expectations (camelCase)
    const mappedAssignments = assignments.map(assignment => ({
      id: assignment.id,
      name: assignment.name,
      description: assignment.description,
      pdfFileName: assignment.pdf_filename,
      pdfFileSize: assignment.pdf_file_size,
      creationDate: assignment.creation_date,
      status: assignment.status,
      createdAt: assignment.created_at,
      updatedAt: assignment.updated_at,
      instructorName: assignment.users ? `${assignment.users.first_name} ${assignment.users.last_name}` : 'Unknown',
      createdBy: assignment.created_by
    }));

    res.json({
      message: 'Created assignments retrieved successfully',
      assignments: mappedAssignments
    });
  } catch (error) {
    console.error('Error fetching created assignments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assignments'
    });
  }
});

// Create a new text-based assignment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      status,
      assignment_content,
      expected_output,
      programming_language,
      difficulty_level,
      time_limit_minutes,
      max_attempts
    } = req.body;
    const userId = req.user?.id;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Assignment name is required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Create text-based assignment
    const { data: assignment, error } = await supabase
      .from('created_assignments')
      .insert({
        name,
        description: description || null,
        assignment_content: assignment_content || 'Assignment content will be provided by instructor',
        expected_output: expected_output || null,
        programming_language: programming_language || 'python',
        difficulty_level: difficulty_level || 'beginner',
        time_limit_minutes: time_limit_minutes || 60,
        max_attempts: max_attempts || 3,
        creation_date: new Date().toISOString().split('T')[0],
        status: status || 'draft',
        created_by: userId
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating assignment:', error);
      return res.status(500).json({ error: 'Failed to create assignment' });
    }

    res.status(201).json({
      success: true,
      assignment: assignment,
      message: 'Text-based assignment created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create assignment'
    });
  }
});

// Update an assignment
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;
    const userId = req.user.id;

    // Check if assignment exists and user has permission
    const { data: existingAssignment, error: fetchError } = await supabase
      .from('created_assignments')
      .select('*')
      .eq('id', id)
      .or(`created_by.eq.${userId},and(created_by.neq.${userId})`)
      .single();

    if (fetchError || !existingAssignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found or access denied'
      });
    }

    // Check permission
    if (existingAssignment.created_by !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;

    // Add updated timestamp
    updateData.updated_at = new Date().toISOString();

    // Update assignment
    const { data: updatedAssignment, error: updateError } = await supabase
      .from('created_assignments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Supabase error updating assignment:', updateError);
      return res.status(500).json({ error: 'Failed to update assignment' });
    }

    // TODO: Handle assignment distributions when that table is created in Supabase
    if (status !== undefined) {
      const oldStatus = existingAssignment.status;
      const newStatus = status;
      console.log(`Assignment ${id} status change: ${oldStatus} -> ${newStatus}`);
      // Distribution logic will be implemented when assignment_distributions table exists
    }

    res.json({
      success: true,
      assignment: updatedAssignment
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update assignment'
    });
  }
});

// Delete an assignment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if assignment exists and user has permission
    const { data: existingAssignment, error: fetchError } = await supabase
      .from('created_assignments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingAssignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    // Check permission
    if (existingAssignment.created_by !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Delete assignment from database
    const { error: deleteError } = await supabase
      .from('created_assignments')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Supabase error deleting assignment:', deleteError);
      return res.status(500).json({ error: 'Failed to delete assignment' });
    }

    res.json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete assignment'
    });
  }
});

// No download route needed for text-based assignments

module.exports = router;
