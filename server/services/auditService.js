const { query } = require('../config/database');

class AuditService {
  /**
   * Log an audit event
   * @param {Object} params - Audit event parameters
   * @param {string} params.userId - User ID performing the action
   * @param {string} params.userEmail - User email
   * @param {string} params.action - Action performed (e.g., 'LOGIN', 'CREATE_USER', 'UPDATE_GRADE')
   * @param {string} params.resourceType - Type of resource (e.g., 'USER', 'ASSIGNMENT', 'GRADE')
   * @param {string} params.resourceId - ID of the resource affected
   * @param {Object} params.oldValues - Previous values (for updates)
   * @param {Object} params.newValues - New values (for creates/updates)
   * @param {string} params.ipAddress - Client IP address
   * @param {string} params.userAgent - Client user agent
   * @param {string} params.sessionId - Session ID
   * @param {boolean} params.success - Whether the action was successful
   * @param {string} params.errorMessage - Error message if action failed
   * @param {Object} params.metadata - Additional metadata
   * @returns {Promise<string>} Audit log ID
   */
  static async logEvent({
    userId,
    userEmail,
    action,
    resourceType,
    resourceId = null,
    oldValues = null,
    newValues = null,
    ipAddress = null,
    userAgent = null,
    sessionId = null,
    success = true,
    errorMessage = null,
    metadata = {}
  }) {
    try {
      const result = await query(`
        SELECT log_audit_event($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) as audit_id
      `, [
        userId,
        userEmail,
        action,
        resourceType,
        resourceId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent,
        sessionId,
        success,
        errorMessage,
        JSON.stringify(metadata)
      ]);

      return result.rows[0].audit_id;
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw error to avoid breaking the main operation
      return null;
    }
  }

  /**
   * Get audit logs with filtering and pagination
   * @param {Object} filters - Filter parameters
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Audit logs and pagination info
   */
  static async getAuditLogs(filters = {}, page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;
      let whereClause = 'WHERE 1=1';
      const queryParams = [];
      let paramCount = 1;

      // Apply filters
      if (filters.userId) {
        whereClause += ` AND user_id = $${paramCount}`;
        queryParams.push(filters.userId);
        paramCount++;
      }

      if (filters.action) {
        whereClause += ` AND action = $${paramCount}`;
        queryParams.push(filters.action);
        paramCount++;
      }

      if (filters.resourceType) {
        whereClause += ` AND resource_type = $${paramCount}`;
        queryParams.push(filters.resourceType);
        paramCount++;
      }

      if (filters.startDate) {
        whereClause += ` AND created_at >= $${paramCount}`;
        queryParams.push(filters.startDate);
        paramCount++;
      }

      if (filters.endDate) {
        whereClause += ` AND created_at <= $${paramCount}`;
        queryParams.push(filters.endDate);
        paramCount++;
      }

      if (filters.success !== undefined) {
        whereClause += ` AND success = $${paramCount}`;
        queryParams.push(filters.success);
        paramCount++;
      }

      if (filters.ipAddress) {
        whereClause += ` AND ip_address = $${paramCount}`;
        queryParams.push(filters.ipAddress);
        paramCount++;
      }

      // Get total count
      const countResult = await query(`
        SELECT COUNT(*) as total
        FROM audit_logs
        ${whereClause}
      `, queryParams);

      // Get audit logs
      const logsResult = await query(`
        SELECT 
          id, user_id, user_email, action, resource_type, resource_id,
          old_values, new_values, ip_address, user_agent, session_id,
          success, error_message, metadata, created_at
        FROM audit_logs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `, [...queryParams, limit, offset]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      return {
        logs: logsResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Failed to get audit logs:', error);
      throw new Error('Failed to retrieve audit logs');
    }
  }

  /**
   * Get audit statistics
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>} Audit statistics
   */
  static async getAuditStats(filters = {}) {
    try {
      let whereClause = 'WHERE 1=1';
      const queryParams = [];
      let paramCount = 1;

      if (filters.startDate) {
        whereClause += ` AND created_at >= $${paramCount}`;
        queryParams.push(filters.startDate);
        paramCount++;
      }

      if (filters.endDate) {
        whereClause += ` AND created_at <= $${paramCount}`;
        queryParams.push(filters.endDate);
        paramCount++;
      }

      const result = await query(`
        SELECT 
          COUNT(*) as total_events,
          COUNT(CASE WHEN success = true THEN 1 END) as successful_events,
          COUNT(CASE WHEN success = false THEN 1 END) as failed_events,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT ip_address) as unique_ips,
          COUNT(CASE WHEN action = 'LOGIN' THEN 1 END) as login_events,
          COUNT(CASE WHEN action = 'LOGOUT' THEN 1 END) as logout_events,
          COUNT(CASE WHEN action LIKE '%CREATE%' THEN 1 END) as create_events,
          COUNT(CASE WHEN action LIKE '%UPDATE%' THEN 1 END) as update_events,
          COUNT(CASE WHEN action LIKE '%DELETE%' THEN 1 END) as delete_events
        FROM audit_logs
        ${whereClause}
      `, queryParams);

      return result.rows[0];
    } catch (error) {
      console.error('Failed to get audit stats:', error);
      throw new Error('Failed to retrieve audit statistics');
    }
  }

  /**
   * Clean up old audit logs
   * @param {number} daysToKeep - Number of days to keep logs
   * @returns {Promise<number>} Number of deleted logs
   */
  static async cleanupOldLogs(daysToKeep = 90) {
    try {
      const result = await query(`
        DELETE FROM audit_logs
        WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${daysToKeep} days'
      `);

      return result.rowCount;
    } catch (error) {
      console.error('Failed to cleanup old audit logs:', error);
      throw new Error('Failed to cleanup audit logs');
    }
  }

  /**
   * Get user activity summary
   * @param {string} userId - User ID
   * @param {number} days - Number of days to look back
   * @returns {Promise<Object>} User activity summary
   */
  static async getUserActivity(userId, days = 30) {
    try {
      const result = await query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as total_actions,
          COUNT(CASE WHEN success = true THEN 1 END) as successful_actions,
          COUNT(CASE WHEN success = false THEN 1 END) as failed_actions,
          array_agg(DISTINCT action) as actions
        FROM audit_logs
        WHERE user_id = $1 
          AND created_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `, [userId]);

      return result.rows;
    } catch (error) {
      console.error('Failed to get user activity:', error);
      throw new Error('Failed to retrieve user activity');
    }
  }
}

module.exports = AuditService;
