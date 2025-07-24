const { query } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

class DatabaseService {
  /**
   * Run database migrations
   * @param {string} migrationPath - Path to migration file
   * @returns {Promise<boolean>} Success status
   */
  static async runMigration(migrationPath) {
    try {
      const migrationSQL = await fs.readFile(migrationPath, 'utf8');
      await query(migrationSQL);
      console.log(`Migration completed: ${path.basename(migrationPath)}`);
      return true;
    } catch (error) {
      console.error(`Migration failed: ${path.basename(migrationPath)}`, error);
      throw error;
    }
  }

  /**
   * Soft delete a record
   * @param {string} table - Table name
   * @param {string} id - Record ID
   * @param {string} userId - User performing the action
   * @returns {Promise<boolean>} Success status
   */
  static async softDelete(table, id, userId) {
    try {
      const result = await query(`
        UPDATE ${table} 
        SET deleted_at = CURRENT_TIMESTAMP, 
            version = version + 1 
        WHERE id = $1 AND deleted_at IS NULL
      `, [id]);

      if (result.rowCount > 0) {
        // Log the soft delete
        await query(`
          INSERT INTO audit_logs (
            user_id, action, resource_type, resource_id,
            old_values, new_values, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        `, [
          userId,
          'SOFT_DELETE',
          table.toUpperCase(),
          id,
          JSON.stringify({ deleted_at: null }),
          JSON.stringify({ deleted_at: new Date().toISOString() })
        ]);
      }

      return result.rowCount > 0;
    } catch (error) {
      console.error(`Soft delete failed for ${table}:${id}`, error);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted record
   * @param {string} table - Table name
   * @param {string} id - Record ID
   * @param {string} userId - User performing the action
   * @returns {Promise<boolean>} Success status
   */
  static async restore(table, id, userId) {
    try {
      const result = await query(`
        UPDATE ${table} 
        SET deleted_at = NULL, 
            version = version + 1 
        WHERE id = $1 AND deleted_at IS NOT NULL
      `, [id]);

      if (result.rowCount > 0) {
        // Log the restore
        await query(`
          INSERT INTO audit_logs (
            user_id, action, resource_type, resource_id,
            old_values, new_values, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        `, [
          userId,
          'RESTORE',
          table.toUpperCase(),
          id,
          JSON.stringify({ deleted_at: 'not null' }),
          JSON.stringify({ deleted_at: null })
        ]);
      }

      return result.rowCount > 0;
    } catch (error) {
      console.error(`Restore failed for ${table}:${id}`, error);
      throw error;
    }
  }

  /**
   * Get dashboard statistics
   * @param {boolean} forceRefresh - Force refresh of materialized view
   * @returns {Promise<Object>} Dashboard statistics
   */
  static async getDashboardStats(forceRefresh = false) {
    try {
      if (forceRefresh) {
        await query('SELECT refresh_dashboard_stats()');
      }

      const result = await query('SELECT * FROM dashboard_stats');
      
      if (result.rows.length === 0) {
        // If no stats exist, refresh and try again
        await query('SELECT refresh_dashboard_stats()');
        const retryResult = await query('SELECT * FROM dashboard_stats');
        return retryResult.rows[0] || {};
      }

      return result.rows[0];
    } catch (error) {
      console.error('Failed to get dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Validate data consistency
   * @returns {Promise<Array>} Array of consistency issues
   */
  static async validateDataConsistency() {
    try {
      const result = await query('SELECT * FROM validate_data_consistency()');
      return result.rows.filter(row => row.affected_count > 0);
    } catch (error) {
      console.error('Data consistency validation failed:', error);
      throw error;
    }
  }

  /**
   * Clean up old soft-deleted records
   * @param {number} daysOld - Number of days old to consider for cleanup
   * @returns {Promise<Array>} Cleanup results
   */
  static async cleanupSoftDeletedRecords(daysOld = 90) {
    try {
      const result = await query('SELECT * FROM cleanup_soft_deleted_records($1)', [daysOld]);
      return result.rows;
    } catch (error) {
      console.error('Cleanup of soft-deleted records failed:', error);
      throw error;
    }
  }

  /**
   * Get database health metrics
   * @returns {Promise<Object>} Database health information
   */
  static async getDatabaseHealth() {
    try {
      // Get database size
      const sizeResult = await query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as database_size
      `);

      // Get table sizes
      const tableSizeResult = await query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY size_bytes DESC
        LIMIT 10
      `);

      // Get connection info
      const connectionResult = await query(`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);

      // Get index usage
      const indexResult = await query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
        ORDER BY schemaname, tablename
        LIMIT 10
      `);

      return {
        databaseSize: sizeResult.rows[0]?.database_size,
        tableSizes: tableSizeResult.rows,
        connections: connectionResult.rows[0],
        unusedIndexes: indexResult.rows,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get database health:', error);
      throw error;
    }
  }

  /**
   * Create database backup
   * @param {string} backupPath - Path to store backup
   * @returns {Promise<string>} Backup file path
   */
  static async createBackup(backupPath) {
    try {
      const { spawn } = require('child_process');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `labsyncpro_backup_${timestamp}.sql`;
      const fullPath = path.join(backupPath, filename);

      return new Promise((resolve, reject) => {
        const pgDump = spawn('pg_dump', [
          process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
          '--no-password',
          '--verbose',
          '--clean',
          '--no-acl',
          '--no-owner',
          '-f', fullPath
        ]);

        pgDump.on('close', (code) => {
          if (code === 0) {
            resolve(fullPath);
          } else {
            reject(new Error(`pg_dump exited with code ${code}`));
          }
        });

        pgDump.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      console.error('Database backup failed:', error);
      throw error;
    }
  }

  /**
   * Restore database from backup
   * @param {string} backupFilePath - Path to backup file
   * @returns {Promise<boolean>} Success status
   */
  static async restoreBackup(backupFilePath) {
    try {
      const { spawn } = require('child_process');

      return new Promise((resolve, reject) => {
        const psql = spawn('psql', [
          process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
          '-f', backupFilePath
        ]);

        psql.on('close', (code) => {
          if (code === 0) {
            resolve(true);
          } else {
            reject(new Error(`psql exited with code ${code}`));
          }
        });

        psql.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      console.error('Database restore failed:', error);
      throw error;
    }
  }

  /**
   * Optimize database performance
   * @returns {Promise<Object>} Optimization results
   */
  static async optimizeDatabase() {
    try {
      const results = {};

      // Analyze all tables
      await query('ANALYZE');
      results.analyze = 'completed';

      // Vacuum analyze
      await query('VACUUM ANALYZE');
      results.vacuum = 'completed';

      // Reindex if needed
      const reindexResult = await query('REINDEX DATABASE CONCURRENTLY');
      results.reindex = 'completed';

      // Update table statistics
      await query('SELECT refresh_dashboard_stats()');
      results.statsRefresh = 'completed';

      return results;
    } catch (error) {
      console.error('Database optimization failed:', error);
      throw error;
    }
  }
}

module.exports = DatabaseService;
