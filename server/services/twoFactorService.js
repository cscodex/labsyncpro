const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { query } = require('../config/database');
const crypto = require('crypto');

class TwoFactorService {
  /**
   * Generate a new 2FA secret for a user
   * @param {string} userId - User ID
   * @param {string} userEmail - User email
   * @returns {Promise<Object>} 2FA setup data
   */
  static async generateSecret(userId, userEmail) {
    try {
      const secret = speakeasy.generateSecret({
        name: `LabSyncPro (${userEmail})`,
        issuer: 'LabSyncPro',
        length: 32
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Store secret in database (not enabled yet)
      await query(`
        UPDATE users 
        SET two_factor_secret = $1, backup_codes = $2
        WHERE id = $3
      `, [secret.base32, backupCodes, userId]);

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntryKey: secret.base32,
        backupCodes: backupCodes
      };
    } catch (error) {
      console.error('Failed to generate 2FA secret:', error);
      throw new Error('Failed to generate 2FA secret');
    }
  }

  /**
   * Verify 2FA token and enable 2FA for user
   * @param {string} userId - User ID
   * @param {string} token - 6-digit token from authenticator app
   * @returns {Promise<boolean>} Verification success
   */
  static async enableTwoFactor(userId, token) {
    try {
      // Get user's secret
      const result = await query(`
        SELECT two_factor_secret, two_factor_enabled
        FROM users
        WHERE id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];

      if (user.two_factor_enabled) {
        throw new Error('2FA is already enabled');
      }

      if (!user.two_factor_secret) {
        throw new Error('2FA secret not found. Please generate a new secret first.');
      }

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow 2 time steps (60 seconds) of drift
      });

      if (!verified) {
        return false;
      }

      // Enable 2FA
      await query(`
        UPDATE users 
        SET two_factor_enabled = true
        WHERE id = $1
      `, [userId]);

      return true;
    } catch (error) {
      console.error('Failed to enable 2FA:', error);
      throw error;
    }
  }

  /**
   * Verify 2FA token for login
   * @param {string} userId - User ID
   * @param {string} token - 6-digit token or backup code
   * @returns {Promise<Object>} Verification result
   */
  static async verifyToken(userId, token) {
    try {
      // Get user's 2FA data
      const result = await query(`
        SELECT two_factor_secret, two_factor_enabled, backup_codes
        FROM users
        WHERE id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];

      if (!user.two_factor_enabled) {
        return { verified: true, method: 'disabled' };
      }

      // Check if it's a backup code
      if (token.length > 6 && user.backup_codes) {
        const backupCodes = user.backup_codes;
        const codeIndex = backupCodes.indexOf(token);

        if (codeIndex !== -1) {
          // Remove used backup code
          backupCodes.splice(codeIndex, 1);
          await query(`
            UPDATE users 
            SET backup_codes = $1
            WHERE id = $2
          `, [backupCodes, userId]);

          return { 
            verified: true, 
            method: 'backup_code',
            remainingBackupCodes: backupCodes.length
          };
        }
      }

      // Verify TOTP token
      const verified = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      return { 
        verified, 
        method: verified ? 'totp' : 'invalid'
      };
    } catch (error) {
      console.error('Failed to verify 2FA token:', error);
      throw error;
    }
  }

  /**
   * Disable 2FA for a user
   * @param {string} userId - User ID
   * @param {string} token - Current 2FA token for verification
   * @returns {Promise<boolean>} Success status
   */
  static async disableTwoFactor(userId, token) {
    try {
      // Verify current token first
      const verification = await this.verifyToken(userId, token);

      if (!verification.verified) {
        return false;
      }

      // Disable 2FA and clear secrets
      await query(`
        UPDATE users 
        SET two_factor_enabled = false, 
            two_factor_secret = NULL, 
            backup_codes = NULL
        WHERE id = $1
      `, [userId]);

      return true;
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      throw error;
    }
  }

  /**
   * Generate new backup codes for a user
   * @param {string} userId - User ID
   * @param {string} token - Current 2FA token for verification
   * @returns {Promise<Array|null>} New backup codes or null if verification failed
   */
  static async regenerateBackupCodes(userId, token) {
    try {
      // Verify current token first
      const verification = await this.verifyToken(userId, token);

      if (!verification.verified) {
        return null;
      }

      // Generate new backup codes
      const backupCodes = this.generateBackupCodes();

      // Update in database
      await query(`
        UPDATE users 
        SET backup_codes = $1
        WHERE id = $2
      `, [backupCodes, userId]);

      return backupCodes;
    } catch (error) {
      console.error('Failed to regenerate backup codes:', error);
      throw error;
    }
  }

  /**
   * Get 2FA status for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} 2FA status
   */
  static async getTwoFactorStatus(userId) {
    try {
      const result = await query(`
        SELECT 
          two_factor_enabled,
          CASE WHEN backup_codes IS NOT NULL THEN array_length(backup_codes, 1) ELSE 0 END as backup_codes_count
        FROM users
        WHERE id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];

      return {
        enabled: user.two_factor_enabled,
        backupCodesCount: user.backup_codes_count || 0
      };
    } catch (error) {
      console.error('Failed to get 2FA status:', error);
      throw error;
    }
  }

  /**
   * Generate backup codes
   * @returns {Array} Array of backup codes
   */
  static generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Check if 2FA is required for a user
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Whether 2FA is required
   */
  static async isTwoFactorRequired(userId) {
    try {
      const result = await query(`
        SELECT two_factor_enabled
        FROM users
        WHERE id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        return false;
      }

      return result.rows[0].two_factor_enabled;
    } catch (error) {
      console.error('Failed to check 2FA requirement:', error);
      return false;
    }
  }

  /**
   * Get 2FA statistics for admin dashboard
   * @returns {Promise<Object>} 2FA statistics
   */
  static async getTwoFactorStats() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN two_factor_enabled = true THEN 1 END) as users_with_2fa,
          COUNT(CASE WHEN two_factor_secret IS NOT NULL AND two_factor_enabled = false THEN 1 END) as users_setup_pending,
          ROUND(
            (COUNT(CASE WHEN two_factor_enabled = true THEN 1 END) * 100.0 / COUNT(*)), 2
          ) as adoption_percentage
        FROM users
        WHERE role IN ('student', 'instructor', 'admin')
      `);

      return result.rows[0];
    } catch (error) {
      console.error('Failed to get 2FA stats:', error);
      throw error;
    }
  }
}

module.exports = TwoFactorService;
