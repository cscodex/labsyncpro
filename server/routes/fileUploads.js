const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}.pdf`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  // Only allow PDF files
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload assignment response or output test
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { submissionId, fileType } = req.body;
    const currentUser = req.user;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!submissionId || !fileType) {
      return res.status(400).json({ error: 'Submission ID and file type are required' });
    }

    if (!['assignment_response', 'output_test'].includes(fileType)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    // Verify submission exists and user has permission
    const submissionCheck = await query(`
      SELECT s.*, sch.title as schedule_title
      FROM submissions s
      JOIN schedules sch ON s.schedule_id = sch.id
      WHERE s.id = $1 AND (
        s.user_id = $2 OR 
        EXISTS (
          SELECT 1 FROM group_members gm 
          WHERE gm.group_id = s.group_id AND gm.user_id = $2
        )
      )
    `, [submissionId, currentUser.id]);

    if (submissionCheck.rows.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Submission not found or access denied' });
    }

    // Check if file of this type already exists for this submission
    const existingFile = await query(`
      SELECT id, file_path FROM file_uploads 
      WHERE submission_id = $1 AND file_type = $2
    `, [submissionId, fileType]);

    // If file exists, delete the old one
    if (existingFile.rows.length > 0) {
      const oldFilePath = existingFile.rows[0].file_path;
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
      
      // Delete old record
      await query('DELETE FROM file_uploads WHERE id = $1', [existingFile.rows[0].id]);
    }

    // Save file information to database
    const result = await query(`
      INSERT INTO file_uploads (
        submission_id, original_filename, stored_filename, file_path,
        file_size, mime_type, file_type, uploaded_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      submissionId,
      req.file.originalname,
      req.file.filename,
      req.file.path,
      req.file.size,
      req.file.mimetype,
      fileType,
      currentUser.id
    ]);

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: result.rows[0].id,
        originalName: result.rows[0].original_filename,
        fileType: result.rows[0].file_type,
        fileSize: result.rows[0].file_size,
        uploadedAt: result.rows[0].created_at
      }
    });

  } catch (error) {
    console.error('File upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 10MB limit' });
    }
    
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get files for a submission
router.get('/submission/:submissionId', authenticateToken, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const currentUser = req.user;

    // Verify access to submission
    const accessCheck = await query(`
      SELECT s.id FROM submissions s
      WHERE s.id = $1 AND (
        s.user_id = $2 OR 
        EXISTS (
          SELECT 1 FROM group_members gm 
          WHERE gm.group_id = s.group_id AND gm.user_id = $2
        ) OR
        EXISTS (
          SELECT 1 FROM schedules sch 
          WHERE sch.id = s.schedule_id AND sch.instructor_id = $2
        ) OR
        $3 = 'admin'
      )
    `, [submissionId, currentUser.id, currentUser.role]);

    if (accessCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found or access denied' });
    }

    const files = await query(`
      SELECT 
        id, original_filename, file_type, file_size, 
        uploaded_by, created_at
      FROM file_uploads 
      WHERE submission_id = $1
      ORDER BY file_type, created_at DESC
    `, [submissionId]);

    res.json({ files: files.rows });

  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Download file
router.get('/download/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const currentUser = req.user;

    // Get file info and verify access
    const fileInfo = await query(`
      SELECT 
        fu.*, s.user_id as submission_user_id, s.group_id as submission_group_id,
        sch.instructor_id
      FROM file_uploads fu
      JOIN submissions s ON fu.submission_id = s.id
      JOIN schedules sch ON s.schedule_id = sch.id
      WHERE fu.id = $1
    `, [fileId]);

    if (fileInfo.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = fileInfo.rows[0];

    // Check access permissions
    const hasAccess = 
      file.uploaded_by === currentUser.id || // Uploader
      file.submission_user_id === currentUser.id || // Individual submission owner
      file.instructor_id === currentUser.id || // Instructor
      currentUser.role === 'admin'; // Admin

    // Check group access
    if (!hasAccess && file.submission_group_id) {
      const groupAccess = await query(`
        SELECT 1 FROM group_members 
        WHERE group_id = $1 AND user_id = $2
      `, [file.submission_group_id, currentUser.id]);
      
      if (groupAccess.rows.length > 0) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists on disk
    if (!fs.existsSync(file.file_path)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    // Send file
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${file.original_filename}"`);
    res.sendFile(path.resolve(file.file_path));

  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Delete file
router.delete('/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const currentUser = req.user;

    // Get file info and verify ownership
    const fileInfo = await query(`
      SELECT fu.*, s.user_id as submission_user_id, s.group_id as submission_group_id
      FROM file_uploads fu
      JOIN submissions s ON fu.submission_id = s.id
      WHERE fu.id = $1 AND (
        fu.uploaded_by = $2 OR
        s.user_id = $2 OR
        EXISTS (
          SELECT 1 FROM group_members gm 
          WHERE gm.group_id = s.group_id AND gm.user_id = $2
        )
      )
    `, [fileId, currentUser.id]);

    if (fileInfo.rows.length === 0) {
      return res.status(404).json({ error: 'File not found or access denied' });
    }

    const file = fileInfo.rows[0];

    // Delete file from disk
    if (fs.existsSync(file.file_path)) {
      fs.unlinkSync(file.file_path);
    }

    // Delete from database
    await query('DELETE FROM file_uploads WHERE id = $1', [fileId]);

    res.json({ message: 'File deleted successfully' });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;
