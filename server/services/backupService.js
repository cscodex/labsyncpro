const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { query } = require('../config/database');
const AuditService = require('./auditService');

class BackupService {
  /**
   * Create a full database backup
   * @param {Object} options - Backup options
   * @param {string} options.userId - User performing the backup
   * @param {string} options.backupPath - Directory to store backup
   * @param {boolean} options.includeData - Include data in backup
   * @param {boolean} options.compress - Compress the backup
   * @returns {Promise<Object>} Backup result
   */
  static async createDatabaseBackup(options = {}) {
    const {
      userId,
      backupPath = './backups',
      includeData = true,
      compress = true
    } = options;

    try {
      // Ensure backup directory exists
      await fs.mkdir(backupPath, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `labsyncpro_backup_${timestamp}.sql${compress ? '.gz' : ''}`;
      const fullPath = path.join(backupPath, filename);

      // Build pg_dump command
      const pgDumpArgs = [
        process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
        '--verbose',
        '--clean',
        '--no-acl',
        '--no-owner'
      ];

      if (!includeData) {
        pgDumpArgs.push('--schema-only');
      }

      if (compress) {
        pgDumpArgs.push('--compress=9');
      }

      pgDumpArgs.push('-f', fullPath);

      // Execute backup
      const backupResult = await this.executeCommand('pg_dump', pgDumpArgs);

      // Get backup file stats
      const stats = await fs.stat(fullPath);

      // Log the backup
      if (userId) {
        await AuditService.logEvent({
          userId,
          userEmail: 'system',
          action: 'CREATE_DATABASE_BACKUP',
          resourceType: 'BACKUP',
          resourceId: filename,
          success: true,
          metadata: {
            filename,
            size: stats.size,
            includeData,
            compress
          }
        });
      }

      return {
        success: true,
        filename,
        fullPath,
        size: stats.size,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Database backup failed:', error);
      
      if (userId) {
        await AuditService.logEvent({
          userId,
          userEmail: 'system',
          action: 'CREATE_DATABASE_BACKUP',
          resourceType: 'BACKUP',
          success: false,
          errorMessage: error.message
        });
      }
      
      throw error;
    }
  }

  /**
   * Restore database from backup
   * @param {Object} options - Restore options
   * @param {string} options.userId - User performing the restore
   * @param {string} options.backupPath - Path to backup file
   * @param {boolean} options.dropExisting - Drop existing database objects
   * @returns {Promise<Object>} Restore result
   */
  static async restoreDatabaseBackup(options = {}) {
    const {
      userId,
      backupPath,
      dropExisting = true
    } = options;

    try {
      // Verify backup file exists
      await fs.access(backupPath);

      // Build psql command
      const psqlArgs = [
        process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
        '--verbose'
      ];

      if (dropExisting) {
        psqlArgs.push('--single-transaction');
      }

      psqlArgs.push('-f', backupPath);

      // Execute restore
      const restoreResult = await this.executeCommand('psql', psqlArgs);

      // Log the restore
      if (userId) {
        await AuditService.logEvent({
          userId,
          userEmail: 'system',
          action: 'RESTORE_DATABASE_BACKUP',
          resourceType: 'BACKUP',
          resourceId: path.basename(backupPath),
          success: true,
          metadata: {
            backupPath,
            dropExisting
          }
        });
      }

      return {
        success: true,
        message: 'Database restored successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Database restore failed:', error);
      
      if (userId) {
        await AuditService.logEvent({
          userId,
          userEmail: 'system',
          action: 'RESTORE_DATABASE_BACKUP',
          resourceType: 'BACKUP',
          resourceId: path.basename(backupPath),
          success: false,
          errorMessage: error.message
        });
      }
      
      throw error;
    }
  }

  /**
   * Create application data backup (files, uploads, etc.)
   * @param {Object} options - Backup options
   * @param {string} options.userId - User performing the backup
   * @param {string} options.backupPath - Directory to store backup
   * @returns {Promise<Object>} Backup result
   */
  static async createApplicationBackup(options = {}) {
    const {
      userId,
      backupPath = './backups'
    } = options;

    try {
      await fs.mkdir(backupPath, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `labsyncpro_app_backup_${timestamp}.tar.gz`;
      const fullPath = path.join(backupPath, filename);

      // Directories to backup
      const backupDirs = [
        './uploads',
        './logs',
        './config',
        './docker-mail/docker-data'
      ];

      // Filter existing directories
      const existingDirs = [];
      for (const dir of backupDirs) {
        try {
          await fs.access(dir);
          existingDirs.push(dir);
        } catch (error) {
          // Directory doesn't exist, skip it
        }
      }

      if (existingDirs.length === 0) {
        throw new Error('No application directories found to backup');
      }

      // Create tar archive
      const tarArgs = ['-czf', fullPath, ...existingDirs];
      await this.executeCommand('tar', tarArgs);

      // Get backup file stats
      const stats = await fs.stat(fullPath);

      // Log the backup
      if (userId) {
        await AuditService.logEvent({
          userId,
          userEmail: 'system',
          action: 'CREATE_APPLICATION_BACKUP',
          resourceType: 'BACKUP',
          resourceId: filename,
          success: true,
          metadata: {
            filename,
            size: stats.size,
            directories: existingDirs
          }
        });
      }

      return {
        success: true,
        filename,
        fullPath,
        size: stats.size,
        directories: existingDirs,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Application backup failed:', error);
      
      if (userId) {
        await AuditService.logEvent({
          userId,
          userEmail: 'system',
          action: 'CREATE_APPLICATION_BACKUP',
          resourceType: 'BACKUP',
          success: false,
          errorMessage: error.message
        });
      }
      
      throw error;
    }
  }

  /**
   * List available backups
   * @param {string} backupPath - Directory containing backups
   * @returns {Promise<Array>} List of backup files
   */
  static async listBackups(backupPath = './backups') {
    try {
      const files = await fs.readdir(backupPath);
      const backups = [];

      for (const file of files) {
        if (file.includes('backup') && (file.endsWith('.sql') || file.endsWith('.sql.gz') || file.endsWith('.tar.gz'))) {
          const fullPath = path.join(backupPath, file);
          const stats = await fs.stat(fullPath);
          
          backups.push({
            filename: file,
            fullPath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            type: file.includes('app_backup') ? 'application' : 'database'
          });
        }
      }

      // Sort by creation date (newest first)
      backups.sort((a, b) => new Date(b.created) - new Date(a.created));

      return backups;
    } catch (error) {
      console.error('Failed to list backups:', error);
      throw error;
    }
  }

  /**
   * Delete a backup file
   * @param {Object} options - Delete options
   * @param {string} options.userId - User performing the deletion
   * @param {string} options.filename - Backup filename to delete
   * @param {string} options.backupPath - Directory containing backups
   * @returns {Promise<Object>} Delete result
   */
  static async deleteBackup(options = {}) {
    const {
      userId,
      filename,
      backupPath = './backups'
    } = options;

    try {
      const fullPath = path.join(backupPath, filename);
      
      // Verify file exists and is a backup file
      await fs.access(fullPath);
      if (!filename.includes('backup')) {
        throw new Error('File is not a backup file');
      }

      // Delete the file
      await fs.unlink(fullPath);

      // Log the deletion
      if (userId) {
        await AuditService.logEvent({
          userId,
          userEmail: 'system',
          action: 'DELETE_BACKUP',
          resourceType: 'BACKUP',
          resourceId: filename,
          success: true
        });
      }

      return {
        success: true,
        message: 'Backup deleted successfully',
        filename
      };
    } catch (error) {
      console.error('Failed to delete backup:', error);
      
      if (userId) {
        await AuditService.logEvent({
          userId,
          userEmail: 'system',
          action: 'DELETE_BACKUP',
          resourceType: 'BACKUP',
          resourceId: filename,
          success: false,
          errorMessage: error.message
        });
      }
      
      throw error;
    }
  }

  /**
   * Execute a shell command
   * @param {string} command - Command to execute
   * @param {Array} args - Command arguments
   * @returns {Promise<Object>} Command result
   */
  static executeCommand(command, args) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }
}

module.exports = BackupService;
