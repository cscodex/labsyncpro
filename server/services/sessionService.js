const { query } = require('../config/database');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class SessionService {
  /**
   * Create a new session
   * @param {string} userId - User ID
   * @param {string} ipAddress - Client IP address
   * @param {string} userAgent - Client user agent
   * @param {number} expirationHours - Session expiration in hours (default: 8)
   * @returns {Promise<Object>} Session tokens
   */
  static async createSession(userId, ipAddress, userAgent, expirationHours = 8) {
    try {
      // Generate session token and refresh token
      const sessionToken = jwt.sign(
        { userId, sessionId: crypto.randomUUID() },
        process.env.JWT_SECRET,
        { expiresIn: `${expirationHours}h` }
      );

      const refreshToken = crypto.randomBytes(64).toString('hex');
      const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);

      // Store session in database
      const result = await query(`
        INSERT INTO user_sessions (
          user_id, session_token, refresh_token, ip_address, 
          user_agent, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, session_token, refresh_token, expires_at
      `, [userId, sessionToken, refreshToken, ipAddress, userAgent, expiresAt]);

      return result.rows[0];
    } catch (error) {
      console.error('Failed to create session:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Validate and refresh a session
   * @param {string} sessionToken - Current session token
   * @param {string} refreshToken - Refresh token
   * @param {string} ipAddress - Client IP address
   * @param {string} userAgent - Client user agent
   * @returns {Promise<Object|null>} New session tokens or null if invalid
   */
  static async refreshSession(sessionToken, refreshToken, ipAddress, userAgent) {
    try {
      // Find the session
      const sessionResult = await query(`
        SELECT s.*, u.id as user_id, u.email, u.role, u.is_active
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_token = $1 AND s.refresh_token = $2 AND s.is_active = true
      `, [sessionToken, refreshToken]);

      if (sessionResult.rows.length === 0) {
        return null;
      }

      const session = sessionResult.rows[0];

      // Check if session is expired
      if (new Date() > new Date(session.expires_at)) {
        await this.invalidateSession(sessionToken);
        return null;
      }

      // Check if user is still active
      if (!session.is_active) {
        await this.invalidateSession(sessionToken);
        return null;
      }

      // Create new session
      const newSession = await this.createSession(
        session.user_id,
        ipAddress,
        userAgent
      );

      // Invalidate old session
      await this.invalidateSession(sessionToken);

      return {
        ...newSession,
        user: {
          id: session.user_id,
          email: session.email,
          role: session.role
        }
      };
    } catch (error) {
      console.error('Failed to refresh session:', error);
      throw new Error('Failed to refresh session');
    }
  }

  /**
   * Validate a session token
   * @param {string} sessionToken - Session token to validate
   * @returns {Promise<Object|null>} Session info or null if invalid
   */
  static async validateSession(sessionToken) {
    try {
      // Verify JWT token
      const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET);

      // Check session in database
      const result = await query(`
        SELECT s.*, u.id as user_id, u.email, u.role, u.first_name, u.last_name, u.is_active
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_token = $1 AND s.is_active = true AND s.expires_at > CURRENT_TIMESTAMP
      `, [sessionToken]);

      if (result.rows.length === 0) {
        return null;
      }

      const session = result.rows[0];

      // Check if user is still active
      if (!session.is_active) {
        await this.invalidateSession(sessionToken);
        return null;
      }

      // Update last activity
      await query(`
        UPDATE user_sessions 
        SET last_activity = CURRENT_TIMESTAMP 
        WHERE session_token = $1
      `, [sessionToken]);

      return {
        sessionId: session.id,
        userId: session.user_id,
        user: {
          id: session.user_id,
          email: session.email,
          firstName: session.first_name,
          lastName: session.last_name,
          role: session.role,
          isActive: session.is_active
        }
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return null;
      }
      console.error('Failed to validate session:', error);
      throw new Error('Failed to validate session');
    }
  }

  /**
   * Invalidate a session
   * @param {string} sessionToken - Session token to invalidate
   * @returns {Promise<boolean>} Success status
   */
  static async invalidateSession(sessionToken) {
    try {
      const result = await query(`
        UPDATE user_sessions 
        SET is_active = false 
        WHERE session_token = $1
      `, [sessionToken]);

      return result.rowCount > 0;
    } catch (error) {
      console.error('Failed to invalidate session:', error);
      return false;
    }
  }

  /**
   * Invalidate all sessions for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Number of invalidated sessions
   */
  static async invalidateAllUserSessions(userId) {
    try {
      const result = await query(`
        UPDATE user_sessions 
        SET is_active = false 
        WHERE user_id = $1 AND is_active = true
      `, [userId]);

      return result.rowCount;
    } catch (error) {
      console.error('Failed to invalidate user sessions:', error);
      return 0;
    }
  }

  /**
   * Get active sessions for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Active sessions
   */
  static async getUserSessions(userId) {
    try {
      const result = await query(`
        SELECT 
          id, ip_address, user_agent, last_activity, 
          expires_at, created_at
        FROM user_sessions
        WHERE user_id = $1 AND is_active = true AND expires_at > CURRENT_TIMESTAMP
        ORDER BY last_activity DESC
      `, [userId]);

      return result.rows;
    } catch (error) {
      console.error('Failed to get user sessions:', error);
      throw new Error('Failed to retrieve user sessions');
    }
  }

  /**
   * Clean up expired sessions
   * @returns {Promise<number>} Number of cleaned up sessions
   */
  static async cleanupExpiredSessions() {
    try {
      const result = await query(`
        SELECT cleanup_expired_sessions() as deleted_count
      `);

      return result.rows[0].deleted_count;
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
      return 0;
    }
  }

  /**
   * Get session statistics
   * @returns {Promise<Object>} Session statistics
   */
  static async getSessionStats() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_sessions,
          COUNT(CASE WHEN expires_at > CURRENT_TIMESTAMP THEN 1 END) as valid_sessions,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT ip_address) as unique_ips,
          AVG(EXTRACT(EPOCH FROM (expires_at - created_at))/3600) as avg_session_duration_hours
        FROM user_sessions
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      `);

      return result.rows[0];
    } catch (error) {
      console.error('Failed to get session stats:', error);
      throw new Error('Failed to retrieve session statistics');
    }
  }
}

module.exports = SessionService;
