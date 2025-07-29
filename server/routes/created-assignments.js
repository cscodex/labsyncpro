const express = require('express');
const multer = require('multer');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const FileUploadService = require('../services/fileUploadService');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

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
        file_size,
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
      pdfFileSize: assignment.file_size,
      creationDate: assignment.created_at, // Use created_at as creation date
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

// Create a new assignment (with optional PDF file)
router.post('/', authenticateToken, upload.single('pdf_file'), async (req, res) => {
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

    // Handle file upload if present
    let fileData = {};

    if (req.file) {
      try {
        const fileName = `${Date.now()}_${req.file.originalname}`;
        const filePath = `assignments/${fileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('assignments')
          .upload(filePath, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false
          });

        if (uploadError) {
          console.error('Supabase Storage upload error:', uploadError);
          return res.status(500).json({
            error: 'Failed to upload PDF file',
            details: uploadError.message
          });
        }

        // Get public URL for the uploaded file
        const { data: { publicUrl } } = supabase.storage
          .from('assignments')
          .getPublicUrl(filePath);

        fileData = {
          pdf_filename: req.file.originalname,
          pdf_path: filePath,
          file_size: req.file.size,
          mime_type: req.file.mimetype,
          google_drive_view_link: publicUrl,
          google_drive_download_link: publicUrl
        };

        console.log(`✅ PDF uploaded successfully: ${fileName}`);

      } catch (storageError) {
        console.error('Storage error:', storageError);
        return res.status(500).json({
          error: 'Failed to store PDF file',
          details: storageError.message
        });
      }
    }

    // Create assignment with the correct column names
    const { data: assignment, error } = await supabase
      .from('created_assignments')
      .insert({
        name,
        description: description || null,
        status: status || 'draft',
        created_by: userId,
        ...fileData
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
      message: req.file ? 'Assignment with PDF created successfully' : 'Assignment created successfully'
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

    // Delete PDF file from storage if it exists
    if (existingAssignment.pdf_path) {
      const { error: storageDeleteError } = await supabase.storage
        .from('assignments')
        .remove([existingAssignment.pdf_path]);

      if (storageDeleteError) {
        console.error('Storage delete error:', storageDeleteError);
        // Continue with database deletion even if file deletion fails
      } else {
        console.log(`✅ PDF file deleted: ${existingAssignment.pdf_path}`);
      }
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

// Download assignment PDF
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get assignment details
    const { data: assignment, error: fetchError } = await supabase
      .from('created_assignments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !assignment) {
      return res.status(404).json({
        error: 'Assignment not found'
      });
    }

    // Check if user has permission to download
    // Students can download published assignments, instructors/admins can download any
    if (req.user.role === 'student' && assignment.status !== 'published') {
      return res.status(403).json({
        error: 'Assignment not available for download'
      });
    }

    // Check if assignment has a PDF file
    if (!assignment.pdf_path) {
      return res.status(404).json({
        error: 'No PDF file found for this assignment'
      });
    }

    // Get file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('assignments')
      .download(assignment.pdf_path);

    if (downloadError) {
      console.error('Download error:', downloadError);
      return res.status(500).json({
        error: 'Failed to download file',
        details: downloadError.message
      });
    }

    // Convert blob to buffer
    const buffer = Buffer.from(await fileData.arrayBuffer());

    // Set appropriate headers
    res.setHeader('Content-Type', assignment.mime_type || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${assignment.pdf_filename}"`);
    res.setHeader('Content-Length', buffer.length);

    // Send file
    res.send(buffer);

  } catch (error) {
    console.error('Download route error:', error);
    res.status(500).json({ error: 'Failed to download assignment' });
  }
});

// Get assignment PDF URL (for viewing in browser)
router.get('/:id/view', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get assignment details
    const { data: assignment, error: fetchError } = await supabase
      .from('created_assignments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !assignment) {
      return res.status(404).json({
        error: 'Assignment not found'
      });
    }

    // Check if user has permission to view
    if (req.user.role === 'student' && assignment.status !== 'published') {
      return res.status(403).json({
        error: 'Assignment not available for viewing'
      });
    }

    // Check if assignment has a PDF file
    if (!assignment.pdf_path) {
      return res.status(404).json({
        error: 'No PDF file found for this assignment'
      });
    }

    // Return the public URL for viewing
    res.json({
      success: true,
      viewUrl: assignment.google_drive_view_link,
      downloadUrl: `/api/assignments/created/${id}/download`,
      filename: assignment.pdf_filename,
      fileSize: assignment.file_size
    });

  } catch (error) {
    console.error('View route error:', error);
    res.status(500).json({ error: 'Failed to get assignment view URL' });
  }
});

module.exports = router;
