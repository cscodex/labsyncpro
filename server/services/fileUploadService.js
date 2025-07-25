const { query } = require('../config/database');

class FileUploadService {
  // Create text-based assignment
  static async createTextAssignment(assignmentData) {
    try {
      console.log(`📚 Creating text-based assignment: ${assignmentData.name}`);

      return {
        success: true,
        message: 'Text-based assignment created successfully',
        storageType: 'database',
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error creating assignment:', error);
      throw new Error(`Failed to create assignment: ${error.message}`);
    }
  }

  // Create text-based submission
  static async createTextSubmission(submissionData) {
    try {
      console.log(`📝 Creating text-based submission for student: ${submissionData.studentId}`);

      // Validate required fields
      if (!submissionData.codeInput || !submissionData.codeOutput) {
        throw new Error('Code input and output are required for submissions');
      }

      return {
        success: true,
        message: 'Text-based submission created successfully',
        storageType: 'database',
        submittedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error creating submission:', error);
      throw new Error(`Failed to create submission: ${error.message}`);
    }
  }

  // Validate text submission
  static validateTextSubmission(submissionData) {
    const errors = [];

    if (!submissionData.codeInput || submissionData.codeInput.trim().length === 0) {
      errors.push('Code input is required');
    }

    if (!submissionData.codeOutput || submissionData.codeOutput.trim().length === 0) {
      errors.push('Code output is required');
    }

    if (submissionData.codeInput && submissionData.codeInput.length > 10000) {
      errors.push('Code input is too long (max 10,000 characters)');
    }

    if (submissionData.codeOutput && submissionData.codeOutput.length > 5000) {
      errors.push('Code output is too long (max 5,000 characters)');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    return true;
  }

  // Get submission statistics
  static async getSubmissionStats() {
    try {
      const stats = await query(`
        SELECT
          COUNT(*) as total_submissions,
          COUNT(CASE WHEN submission_type = 'text' THEN 1 END) as text_submissions,
          COUNT(CASE WHEN submission_type = 'code' THEN 1 END) as code_submissions,
          COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted_count,
          COUNT(CASE WHEN status = 'graded' THEN 1 END) as graded_count
        FROM submissions
      `);

      return stats.rows[0];
    } catch (error) {
      console.error('Error getting submission stats:', error);
      return null;
    }
  }
}

module.exports = FileUploadService;
