const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');
const { uploadToGoogleDrive, FOLDERS } = require('../config/googleDrive');
require('dotenv').config();

class FileMigrationService {
  constructor() {
    this.migrationLog = [];
    this.errors = [];
  }

  // Get all files that need migration
  async getFilesToMigrate() {
    try {
      // Get assignments that need migration
      const assignmentsQuery = `
        SELECT 
          id,
          name,
          pdf_filename,
          pdf_path,
          'created_assignments' as table_name
        FROM created_assignments 
        WHERE pdf_filename IS NOT NULL 
        AND google_drive_file_id IS NULL
        AND migration_status = 'needs_migration'
      `;

      // Get submissions that need migration
      const submissionsQuery = `
        SELECT 
          id,
          file_path as pdf_path,
          SUBSTRING(file_path FROM '[^/]*$') as pdf_filename,
          'submissions' as table_name
        FROM submissions 
        WHERE file_path IS NOT NULL 
        AND google_drive_file_id IS NULL
        AND migration_status = 'needs_migration'
      `;

      const assignments = await query(assignmentsQuery);
      const submissions = await query(submissionsQuery);

      return {
        assignments: assignments.rows,
        submissions: submissions.rows,
        total: assignments.rows.length + submissions.rows.length
      };
    } catch (error) {
      console.error('Error getting files to migrate:', error);
      throw error;
    }
  }

  // Migrate a single file
  async migrateFile(fileRecord) {
    const { id, pdf_filename, pdf_path, table_name, name } = fileRecord;
    
    try {
      console.log(`📤 Migrating ${table_name}: ${pdf_filename}`);

      // Check if local file exists
      const localFilePath = path.join(__dirname, '../../', pdf_path);
      if (!fs.existsSync(localFilePath)) {
        throw new Error(`Local file not found: ${localFilePath}`);
      }

      // Get file stats
      const stats = fs.statSync(localFilePath);
      const fileSize = stats.size;

      // Determine folder based on table
      const folderId = table_name === 'created_assignments' 
        ? FOLDERS.assignments 
        : FOLDERS.submissions;

      // Generate new filename
      const timestamp = Date.now();
      const fileExtension = path.extname(pdf_filename);
      const baseName = table_name === 'created_assignments' 
        ? `assignment_${name || 'unknown'}_${timestamp}`
        : `submission_${id}_${timestamp}`;
      const newFileName = `${baseName}${fileExtension}`;

      // Determine MIME type
      const mimeType = this.getMimeType(fileExtension);

      // Upload to Google Drive
      const uploadResult = await uploadToGoogleDrive(
        localFilePath,
        newFileName,
        folderId,
        mimeType
      );

      // Update database record
      await this.updateDatabaseRecord(table_name, id, {
        google_drive_file_id: uploadResult.fileId,
        google_drive_view_link: uploadResult.viewLink,
        google_drive_download_link: uploadResult.downloadLink,
        file_size: fileSize,
        mime_type: mimeType,
        original_filename: pdf_filename,
        migration_status: 'completed'
      });

      // Update migration log
      await this.updateMigrationLog(table_name, id, uploadResult.fileId, 'completed');

      this.migrationLog.push({
        id,
        table_name,
        filename: pdf_filename,
        status: 'success',
        google_drive_file_id: uploadResult.fileId
      });

      console.log(`✅ Successfully migrated: ${pdf_filename}`);
      return { success: true, fileId: uploadResult.fileId };

    } catch (error) {
      console.error(`❌ Failed to migrate ${pdf_filename}:`, error.message);
      
      // Update migration log with error
      await this.updateMigrationLog(table_name, id, null, 'failed', error.message);
      
      this.errors.push({
        id,
        table_name,
        filename: pdf_filename,
        error: error.message
      });

      return { success: false, error: error.message };
    }
  }

  // Update database record with Google Drive info
  async updateDatabaseRecord(tableName, recordId, updateData) {
    const fields = Object.keys(updateData);
    const values = Object.values(updateData);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const updateQuery = `
      UPDATE ${tableName} 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
    `;

    await query(updateQuery, [recordId, ...values]);
  }

  // Update migration log
  async updateMigrationLog(tableName, recordId, googleDriveFileId, status, errorMessage = null) {
    const updateQuery = `
      UPDATE file_migration_log 
      SET 
        google_drive_file_id = $3,
        migration_status = $4,
        error_message = $5,
        migrated_at = NOW()
      WHERE table_name = $1 AND record_id = $2
    `;

    await query(updateQuery, [tableName, recordId, googleDriveFileId, status, errorMessage]);
  }

  // Get MIME type from file extension
  getMimeType(extension) {
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif'
    };

    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  // Run complete migration
  async runMigration() {
    console.log('🚀 Starting file migration to Google Drive...\n');

    try {
      // Get files to migrate
      const filesToMigrate = await this.getFilesToMigrate();
      console.log(`📊 Found ${filesToMigrate.total} files to migrate:`);
      console.log(`   - Assignments: ${filesToMigrate.assignments.length}`);
      console.log(`   - Submissions: ${filesToMigrate.submissions.length}\n`);

      if (filesToMigrate.total === 0) {
        console.log('✅ No files need migration!');
        return;
      }

      // Migrate assignments
      console.log('📚 Migrating assignments...');
      for (const assignment of filesToMigrate.assignments) {
        await this.migrateFile(assignment);
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Migrate submissions
      console.log('\n📝 Migrating submissions...');
      for (const submission of filesToMigrate.submissions) {
        await this.migrateFile(submission);
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Print summary
      console.log('\n📊 Migration Summary:');
      console.log(`✅ Successfully migrated: ${this.migrationLog.length} files`);
      console.log(`❌ Failed migrations: ${this.errors.length} files`);

      if (this.errors.length > 0) {
        console.log('\n❌ Failed files:');
        this.errors.forEach(error => {
          console.log(`   - ${error.filename}: ${error.error}`);
        });
      }

      console.log('\n🎉 Migration completed!');

    } catch (error) {
      console.error('💥 Migration failed:', error);
      throw error;
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new FileMigrationService();
  migration.runMigration()
    .then(() => {
      console.log('Migration script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = FileMigrationService;
