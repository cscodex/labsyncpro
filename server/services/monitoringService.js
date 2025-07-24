const { query } = require('../config/database');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

class MonitoringService {
  /**
   * Get system health metrics
   * @returns {Promise<Object>} System health information
   */
  static async getSystemHealth() {
    try {
      const [
        databaseHealth,
        systemMetrics,
        applicationMetrics,
        diskUsage
      ] = await Promise.all([
        this.getDatabaseHealth(),
        this.getSystemMetrics(),
        this.getApplicationMetrics(),
        this.getDiskUsage()
      ]);

      return {
        database: databaseHealth,
        system: systemMetrics,
        application: applicationMetrics,
        disk: diskUsage,
        timestamp: new Date().toISOString(),
        status: this.calculateOverallHealth([
          databaseHealth.status,
          systemMetrics.status,
          applicationMetrics.status,
          diskUsage.status
        ])
      };
    } catch (error) {
      console.error('Failed to get system health:', error);
      throw error;
    }
  }

  /**
   * Get database health metrics
   * @returns {Promise<Object>} Database health information
   */
  static async getDatabaseHealth() {
    try {
      // Connection pool stats
      const connectionResult = await query(`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);

      // Database size
      const sizeResult = await query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size,
               pg_database_size(current_database()) as size_bytes
      `);

      // Query performance
      const performanceResult = await query(`
        SELECT 
          round(avg(mean_exec_time)::numeric, 2) as avg_query_time,
          sum(calls) as total_queries,
          sum(total_exec_time) as total_exec_time
        FROM pg_stat_statements
        WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
        LIMIT 1
      `);

      // Lock information
      const lockResult = await query(`
        SELECT count(*) as active_locks
        FROM pg_locks
        WHERE NOT granted
      `);

      const connections = connectionResult.rows[0];
      const size = sizeResult.rows[0];
      const performance = performanceResult.rows[0] || {};
      const locks = lockResult.rows[0];

      // Determine health status
      let status = 'healthy';
      if (connections.active_connections > 50 || locks.active_locks > 10) {
        status = 'warning';
      }
      if (connections.active_connections > 100 || locks.active_locks > 50) {
        status = 'critical';
      }

      return {
        status,
        connections,
        size: {
          pretty: size.size,
          bytes: parseInt(size.size_bytes)
        },
        performance: {
          avgQueryTime: parseFloat(performance.avg_query_time) || 0,
          totalQueries: parseInt(performance.total_queries) || 0,
          totalExecTime: parseFloat(performance.total_exec_time) || 0
        },
        locks: {
          active: parseInt(locks.active_locks)
        }
      };
    } catch (error) {
      console.error('Failed to get database health:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Get system metrics (CPU, Memory, etc.)
   * @returns {Object} System metrics
   */
  static getSystemMetrics() {
    try {
      const cpus = os.cpus();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memoryUsagePercent = (usedMem / totalMem) * 100;

      // Calculate CPU usage (simplified)
      const loadAvg = os.loadavg();
      const cpuUsagePercent = (loadAvg[0] / cpus.length) * 100;

      let status = 'healthy';
      if (memoryUsagePercent > 80 || cpuUsagePercent > 80) {
        status = 'warning';
      }
      if (memoryUsagePercent > 95 || cpuUsagePercent > 95) {
        status = 'critical';
      }

      return {
        status,
        cpu: {
          count: cpus.length,
          model: cpus[0]?.model || 'Unknown',
          usage: Math.round(cpuUsagePercent * 100) / 100,
          loadAverage: loadAvg
        },
        memory: {
          total: totalMem,
          free: freeMem,
          used: usedMem,
          usagePercent: Math.round(memoryUsagePercent * 100) / 100
        },
        uptime: os.uptime(),
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname()
      };
    } catch (error) {
      console.error('Failed to get system metrics:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Get application-specific metrics
   * @returns {Promise<Object>} Application metrics
   */
  static async getApplicationMetrics() {
    try {
      // Get recent error logs
      const errorResult = await query(`
        SELECT count(*) as error_count
        FROM audit_logs
        WHERE success = false 
          AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
      `);

      // Get active sessions
      const sessionResult = await query(`
        SELECT count(*) as active_sessions
        FROM user_sessions
        WHERE is_active = true 
          AND expires_at > CURRENT_TIMESTAMP
      `);

      // Get recent activity
      const activityResult = await query(`
        SELECT count(*) as recent_activity
        FROM audit_logs
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
      `);

      const errors = errorResult.rows[0];
      const sessions = sessionResult.rows[0];
      const activity = activityResult.rows[0];

      // Calculate error rate
      const totalActivity = parseInt(activity.recent_activity) || 1;
      const errorRate = (parseInt(errors.error_count) / totalActivity) * 100;

      let status = 'healthy';
      if (errorRate > 5) {
        status = 'warning';
      }
      if (errorRate > 15) {
        status = 'critical';
      }

      return {
        status,
        errors: {
          count: parseInt(errors.error_count),
          rate: Math.round(errorRate * 100) / 100
        },
        sessions: {
          active: parseInt(sessions.active_sessions)
        },
        activity: {
          recent: parseInt(activity.recent_activity)
        },
        process: {
          pid: process.pid,
          version: process.version,
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime()
        }
      };
    } catch (error) {
      console.error('Failed to get application metrics:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Get disk usage information
   * @returns {Promise<Object>} Disk usage information
   */
  static async getDiskUsage() {
    try {
      const stats = await fs.stat(process.cwd());
      
      // This is a simplified version - in production you'd use a proper disk usage library
      const diskInfo = {
        path: process.cwd(),
        // These would be actual disk usage stats in production
        total: 100 * 1024 * 1024 * 1024, // 100GB placeholder
        used: 60 * 1024 * 1024 * 1024,   // 60GB placeholder
        free: 40 * 1024 * 1024 * 1024    // 40GB placeholder
      };

      const usagePercent = (diskInfo.used / diskInfo.total) * 100;

      let status = 'healthy';
      if (usagePercent > 80) {
        status = 'warning';
      }
      if (usagePercent > 95) {
        status = 'critical';
      }

      return {
        status,
        total: diskInfo.total,
        used: diskInfo.used,
        free: diskInfo.free,
        usagePercent: Math.round(usagePercent * 100) / 100
      };
    } catch (error) {
      console.error('Failed to get disk usage:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Calculate overall health status
   * @param {Array} statuses - Array of individual component statuses
   * @returns {string} Overall health status
   */
  static calculateOverallHealth(statuses) {
    if (statuses.includes('critical') || statuses.includes('error')) {
      return 'critical';
    }
    if (statuses.includes('warning')) {
      return 'warning';
    }
    return 'healthy';
  }

  /**
   * Get performance metrics over time
   * @param {number} hours - Number of hours to look back
   * @returns {Promise<Array>} Performance metrics over time
   */
  static async getPerformanceHistory(hours = 24) {
    try {
      const result = await query(`
        SELECT 
          DATE_TRUNC('hour', created_at) as hour,
          COUNT(*) as total_requests,
          COUNT(*) FILTER (WHERE success = true) as successful_requests,
          COUNT(*) FILTER (WHERE success = false) as failed_requests,
          COUNT(DISTINCT user_id) as unique_users
        FROM audit_logs
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '${hours} hours'
        GROUP BY DATE_TRUNC('hour', created_at)
        ORDER BY hour
      `);

      return result.rows.map(row => ({
        timestamp: row.hour,
        totalRequests: parseInt(row.total_requests),
        successfulRequests: parseInt(row.successful_requests),
        failedRequests: parseInt(row.failed_requests),
        uniqueUsers: parseInt(row.unique_users),
        errorRate: row.total_requests > 0 
          ? (parseInt(row.failed_requests) / parseInt(row.total_requests)) * 100 
          : 0
      }));
    } catch (error) {
      console.error('Failed to get performance history:', error);
      throw error;
    }
  }

  /**
   * Get system alerts
   * @returns {Promise<Array>} System alerts
   */
  static async getSystemAlerts() {
    try {
      const health = await this.getSystemHealth();
      const alerts = [];

      // Check database health
      if (health.database.status === 'critical') {
        alerts.push({
          type: 'critical',
          component: 'database',
          message: 'Database is in critical state',
          timestamp: new Date().toISOString()
        });
      }

      // Check system resources
      if (health.system.memory.usagePercent > 90) {
        alerts.push({
          type: 'warning',
          component: 'system',
          message: `High memory usage: ${health.system.memory.usagePercent}%`,
          timestamp: new Date().toISOString()
        });
      }

      // Check disk usage
      if (health.disk.usagePercent > 90) {
        alerts.push({
          type: 'warning',
          component: 'disk',
          message: `High disk usage: ${health.disk.usagePercent}%`,
          timestamp: new Date().toISOString()
        });
      }

      // Check error rate
      if (health.application.errors.rate > 10) {
        alerts.push({
          type: 'warning',
          component: 'application',
          message: `High error rate: ${health.application.errors.rate}%`,
          timestamp: new Date().toISOString()
        });
      }

      return alerts;
    } catch (error) {
      console.error('Failed to get system alerts:', error);
      return [{
        type: 'error',
        component: 'monitoring',
        message: 'Failed to retrieve system alerts',
        timestamp: new Date().toISOString()
      }];
    }
  }
}

module.exports = MonitoringService;
